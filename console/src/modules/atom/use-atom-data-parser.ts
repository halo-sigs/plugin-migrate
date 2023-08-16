import type { MigrateData, MigratePost } from "@/types";
import { XMLParser } from "fast-xml-parser";
import { randomUUID } from "@/utils/id";
import { slugify } from "transliteration";

interface useAtomDataParserReturn {
  parse: () => Promise<MigrateData>;
}
const isArrayPath = ["feed.entry"];

const parser = new XMLParser({
  ignoreAttributes: true,
  textNodeName: "value",
  isArray: (name, jpath, isLeafNode, isAttribute) => {
    if (isArrayPath.includes(jpath)) return true;
    return false;
  },
});

export function useRssDataParser(
  source: File | string
): useAtomDataParserReturn {
  const parse = (): Promise<MigrateData> => {
    return new Promise<MigrateData>((resolve, reject) => {
      try {
        if (typeof source === "string") {
          if (!source.startsWith("http")) {
            reject("Failed to parse data. error -> invalid url");
          }
          fetch(
            "/apis/api.plugin.halo.run/v1alpha1/plugins/PluginMigrate/migrations/rss-parse",
            {
              method: "POST",
              cache: "no-cache",
              keepalive: true,
              headers: {
                "Content-Type": "application/json",
              },
              body: source,
            }
          )
            .then((response) => {
              if (!response.ok) {
                reject("解析 Atom Feed 链接失败");
                return;
              }
              return response.text();
            })
            .then((data) => {
              return parseData(data)
                .then((data) => {
                  resolve(data);
                })
                .catch((error) => {
                  reject(error);
                });
            });
        } else {
          const reader = new FileReader();
          reader.onload = (event) => {
            const xmlData = event.target?.result as string;
            parseData(xmlData)
              .then((data) => {
                resolve(data);
              })
              .catch((error) => {
                reject(error);
              });
          };
          reader.onerror = () => {
            reject("Failed to fetch data");
          };
          reader.readAsText(source);
        }
      } catch (error) {
        reject("Failed to parse data. error -> " + error);
      }
    });
  };

  const parseData = (data: any): Promise<MigrateData> => {
    return new Promise<MigrateData>((resolve, reject) => {
      try {
        const result = parser.parse(data, true);
        const feed = result.feed as Feed;
        if (!feed) {
          reject("目标文件不是标准的 Atom Feed 文件");
        }
        resolve({
          posts: parsePosts(feed.entry || []),
        });
      } catch (error) {
        console.error(error);
        reject("Atom 文件解析失败");
      }
    });
  };

  const parsePosts = (items: Entry[]) => {
    return items
      ?.filter((item) => item.title && item.content)
      ?.map((post) => {
        return {
          postRequest: {
            post: {
              spec: {
                title: post.title,
                slug: slugify(post.title, { trim: true }),
                deleted: false,
                publish: true,
                publishTime: new Date(
                  post.published || post.updated || new Date().toISOString()
                ).toISOString(),
                pinned: false,
                allowComment: true,
                visible: "PUBLIC",
                priority: 0,
                excerpt: {
                  autoGenerate: false,
                  raw: post.summary || "",
                },
                htmlMetas: [],
              },
              apiVersion: "content.halo.run/v1alpha1",
              kind: "Post",
              metadata: {
                name: randomUUID(),
              },
            },
            content: {
              raw: post.content,
              content: post.content,
              rawType: "HTML",
            },
          },
        } as MigratePost;
      });
  };

  return {
    parse,
  };
}

interface Contributor {
  name: string;
}

interface Author {
  name: string;
  uri?: string;
  email?: string;
}

interface Entry {
  title: string;
  link?: string;
  id?: string;
  updated?: string;
  published?: string;
  summary: string;
  author?: Author;
  contributor?: Contributor | Contributor[];
  content: string;
}

interface Feed {
  title: string;
  subtitle?: string;
  updated?: string;
  id?: string;
  link?: string;
  rights?: string;
  generator?: string;
  entry?: Entry[];
}
