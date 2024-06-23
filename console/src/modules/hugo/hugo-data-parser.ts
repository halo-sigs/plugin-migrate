import type {
  MigrateCategory,
  MigrateData,
  MigratePost,
  MigrateSinglePage,
  MigrateTag,
} from "@/types";
import { type Entry, TextWriter, ZipReader } from "@zip.js/zip.js";
import YAML from "yaml";
import * as toml from "toml";
import { slugify } from "transliteration";
import markdownit from "markdown-it";
import MarkdownItIdPlugin from "@/modules/hugo/markdown-it-id";

type HugoMatter = {
  title?: string;
  slug?: string;
  draft?: boolean;
  tags?: string[];
  categories?: string[];
  date?: string;
  [key: string]: unknown;
};

class HugoDocument {
  constructor(
    public matter: HugoMatter,
    public body: string,
  ) {}

  public title(): string | undefined {
    return this.matter.title;
  }

  public slug(): string | undefined {
    return this.matter.slug;
  }

  public tags(): string[] {
    const tags = this.matter.tags;
    if (!tags || !Array.isArray(tags)) {
      return [];
    }
    return tags;
  }

  public date(): string | undefined {
    const dateStr = this.matter.date;
    if (dateStr) {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) ? date.toISOString() : undefined;
    } else {
      return undefined;
    }
  }

  public categories(): string[] {
    return this.matter.categories ?? [];
  }

  public published(): boolean {
    return !(this.matter.draft === true);
  }
}

export class HugoDataParser {
  private postSectionNames: Set<string>;
  private pageSectionNames: Set<string>;
  /** e.g. `content/` */
  private baseFileName: string | null = null;

  /**
   *
   * @param postSectionNames the names of HUGO section that should be considered as normal post (article).
   * @param pageSectionNames the names of HUGO section that should be considered as a single page.
   */
  constructor(postSectionNames?: string[], pageSectionNames?: string[]) {
    this.postSectionNames = new Set(postSectionNames);
    this.pageSectionNames = new Set(pageSectionNames);
  }

  /**
   * Extract name of all sections.
   * @see https://gohugo.io/content-management/sections/
   * @param file
   */
  async parseSections(file: File): Promise<string[]> {
    const zipReader = new ZipReader(file.stream());
    try {
      const entries = await zipReader.getEntries({});
      this.identifyBaseFileName(entries);

      return this.filterMarkdownEntries(entries)
        .map((entry) => this.getSectionName(entry))
        .filter((name) => name && name.length > 0);
    } finally {
      await zipReader.close();
    }
  }

  async parse(file: File): Promise<MigrateData> {
    const zipReader = new ZipReader(file.stream());
    try {
      const entries = await zipReader.getEntries({});
      this.identifyBaseFileName(entries);
      const mdEntries = this.filterMarkdownEntries(entries);
      const posts: HugoDocument[] = [];
      const pages: HugoDocument[] = [];
      for (const entry of mdEntries) {
        const sectionName = this.getSectionName(entry);
        if (this.postSectionNames.has(sectionName)) {
          posts.push(await this.parseHugoDocument(entry));
        } else if (this.pageSectionNames.has(sectionName)) {
          pages.push(await this.parseHugoDocument(entry));
        } else {
          console.log(`unknown section '${sectionName}', ignore`);
        }
      }
      return this.buildMigrateData(posts, pages);
    } finally {
      await zipReader.close();
    }
  }

  private filterMarkdownEntries(entries: Entry[]): Entry[] {
    return entries.filter(
      (entry) => !entry.directory && entry.filename.endsWith(".md"),
    );
  }

  private buildMigrateData(
    posts: HugoDocument[],
    pages: HugoDocument[],
  ): MigrateData {
    const contents = posts.concat(pages);
    const categories = this.buildCategories(contents);
    const tags = this.buildTags(contents);

    return {
      categories: Array.from(categories.values()),
      tags: Array.from(tags.values()),
      posts: this.buildPosts(posts, tags, categories),
      pages: this.buildPages(pages),
    } as MigrateData;
  }

  private buildPages(pages: HugoDocument[]): MigrateSinglePage[] {
    return pages
      .map((doc): MigrateSinglePage | null => {
        const title = doc.title();
        if (!title) {
          return null;
        }

        return {
          singlePageRequest: {
            page: {
              spec: {
                title: title,
                slug: doc.slug() ?? slugify(title),
                template: "",
                publish: doc.published(),
                publishTime: doc.date(),
                deleted: false,
                pinned: false,
                allowComment: true,
                visible: "PUBLIC",
                priority: 0,
                excerpt: {
                  autoGenerate: true,
                },
                htmlMetas: [],
              },
              apiVersion: "content.halo.run/v1alpha1",
              kind: "SinglePage",
              metadata: {
                name: uuid(),
              },
            },
            content: {
              raw: doc.body,
              content: markdownit().use(MarkdownItIdPlugin).render(doc.body),
              rawType: "markdown",
            },
          },
        };
      })
      .filter((page): page is MigrateSinglePage => page != null);
  }

  private buildPosts(
    posts: HugoDocument[],
    tags: Map<string, MigrateTag>,
    categories: Map<string, MigrateCategory>,
  ): MigratePost[] {
    return posts
      .map((doc): MigratePost | null => {
        const title = doc.title();
        if (!title) {
          return null;
        }

        const categoryIds: string[] = doc
          .categories()
          .map((c) => categories.get(c)?.metadata.name)
          .filter((id): id is string => id !== undefined);
        const tagIds: string[] = doc
          .tags()
          .map((t) => tags.get(t)?.metadata.name)
          .filter((t): t is string => t !== undefined);

        return {
          postRequest: {
            post: {
              spec: {
                title: title,
                slug: doc.slug() ?? this.generateSlug(title),
                publishTime: doc.date(),
                publish: doc.published(),
                deleted: false,
                pinned: false,
                allowComment: true,
                priority: 0,
                excerpt: {
                  autoGenerate: true,
                },
                visible: "PUBLIC",
                tags: tagIds,
                categories: categoryIds,
              },
              apiVersion: "content.halo.run/v1alpha1",
              kind: "Post",
              metadata: {
                name: uuid(),
              },
            },
            content: {
              raw: doc.body,
              content: markdownit().use(MarkdownItIdPlugin).render(doc.body),
              rawType: "markdown",
            },
          },
        };
      })
      .filter((post): post is MigratePost => post != null);
  }

  private buildCategories(
    hugoDocs: HugoDocument[],
  ): Map<string, MigrateCategory> {
    const categories = new Map<string, MigrateCategory>();
    for (const doc of hugoDocs) {
      for (const category of doc.categories()) {
        if (categories.has(category)) {
          continue;
        }

        const migrateCategory: MigrateCategory = {
          metadata: {
            name: uuid(),
          },
          kind: "Category",
          apiVersion: "content.halo.run/v1alpha1",
          spec: {
            displayName: category,
            slug: slugify(category),
            priority: 0,
            children: [], // can not leave undefined, otherwise the category management UI will be broken
          },
        };
        categories.set(category, migrateCategory);
      }
    }
    return categories;
  }

  private buildTags(hugoDocs: HugoDocument[]): Map<string, MigrateTag> {
    const tags = new Map<string, MigrateTag>();
    for (const doc of hugoDocs) {
      for (const tag of doc.tags()) {
        if (tags.has(tag)) {
          continue;
        }
        const migrateTag: MigrateTag = {
          metadata: {
            name: uuid(),
          },
          kind: "Tag",
          apiVersion: "content.halo.run/v1alpha1",
          spec: {
            displayName: tag,
            slug: this.generateSlug(tag),
          },
        };
        tags.set(tag, migrateTag);
      }
    }
    return tags;
  }

  protected generateSlug(name: string): string {
    return slugify(name, {
      trim: true,
    });
  }

  /**
   * @param entry
   * @throws Error
   * @private
   */
  private async parseHugoDocument(entry: Entry): Promise<HugoDocument> {
    if (!entry.getData) {
      throw new Error(`entry '${entry.filename}' is unreadable`);
    }
    console.log(`read and parse hugo document: ${entry.filename}`);
    const fileContent = await entry.getData(new TextWriter("utf8"));

    /**
     * - `0`: init
     * - `1`: matter started
     * - `2`: matter ended
     */
    let state = 0;
    /**
     * - `yaml`
     * - `toml`
     * - `json`
     */
    let matterType = "";
    let matter = "";
    let body = "";
    /**
     * cumulative number of chars until the current line (included)
     */
    let count = 0;

    outerLoop: for (const line of fileContent.split("\n")) {
      count += line.length + 1;
      switch (state) {
        case 0:
          if (line == "---") {
            matterType = "yaml";
            state = 1;
          } else if (line == "+++") {
            matterType = "toml";
            state = 1;
          } else if (line == "{") {
            matterType = "json";
            state = 1;
          } else if (line.length == 0 || line.trim().length == 0) {
            continue;
          } else {
            throw Error("document doesn't have valid matter");
          }
          break;
        case 1:
          if (
            (matterType === "yaml" && line == "---") ||
            (matterType === "toml" && line == "+++") ||
            (matterType === "json" && line == "}")
          ) {
            state = 2;
          } else {
            matter += line + "\n";
          }
          break;
        case 2:
          // skip empty lines between the matter and body
          if (line.length > 0) {
            body = fileContent.slice(count - line.length - 1);
            break outerLoop;
          }
          break;
      }
    }

    let matterObj: HugoMatter = {};
    switch (matterType) {
      case "yaml":
        matterObj = YAML.parse(matter);
        break;
      case "toml":
        matterObj = toml.parse(matter);
        break;
      case "json":
        matterObj = JSON.parse(matter);
        break;
      default:
        throw Error(`unknown matter type: ${matterType}`);
    }
    if (!("title" in matterObj)) {
      throw Error("missing required matter field: title");
    }

    return new HugoDocument(matterObj, body);
  }

  /**
   * Get the HUGO section name of the given file.
   * @see https://gohugo.io/content-management/sections/
   * @param entry
   * @private
   */
  private getSectionName(entry: Entry): string {
    let s = entry.filename;
    if (this.baseFileName) {
      s = s.substring(this.baseFileName.length);
    }
    const i = s.indexOf("/");
    return i == -1 ? s : s.substring(0, i);
  }

  /**
   * Determine whether the uploaded file contains the `content` directory itself.
   * @param entries
   * @private
   */
  private identifyBaseFileName(entries: Entry[]) {
    const e = entries.find(
      (entry) =>
        entry.directory &&
        (entry.filename == "content/" || entry.filename == "post/"),
    );
    if (e && e.filename == "content/") {
      this.baseFileName = e.filename;
    } else {
      this.baseFileName = null;
    }
  }
}

function uuid() {
  function r4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  }

  return `${r4() + r4()}-${r4()}-${r4()}-${r4()}-${r4() + r4() + r4()}`;
}
