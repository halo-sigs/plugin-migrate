import type {
  MigrateData,
  MigratePost,
  MigrateSinglePage,
  MigrateMenu,
  MigratePhoto,
  MigrateLink,
  MigrateAttachment,
  MigrateTag,
  MigrateCategory,
  MigrateComment,
  MigrateReply,
  MigrateMoment,
} from "@/types";
import { arrayToTree } from "performant-array-to-tree";

interface useHaloDataParserReturn {
  parse: () => Promise<MigrateData>;
}

export function useHaloDataParser(file: File): useHaloDataParserReturn {
  const parse = (): Promise<MigrateData> => {
    return new Promise<MigrateData>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result as string;
        const data = JSON.parse(fileContent);
        const { version } = data;
        if (!(version.startsWith("1.5") || version.startsWith("1.6"))) {
          reject("暂不支持该版本的迁移，仅支持 Halo 1.5 / 1.6 版本");
        }

        resolve(parseData(data));
      };
      reader.onerror = () => {
        reject("Failed to fetch data");
      };
      reader.readAsText(file);
    });
  };

  const parseData = (data: any): MigrateData => {
    return {
      tags: parseTags(data.tags),
      categories: parseCategories(data.categories),
      posts: parsePosts(data),
      pages: parseSinglePages(data),
      comments: parseComments(data),
      menuItems: parseMenus(data.menus),
      moments: parseMoments(data.journals),
      photos: parsePhotos(data.photos),
      links: parseLinks(data.links),
      attachments: parseAttachments(data.attachments),
    } as MigrateData;
  };

  const parseTags = (tags: any[]): MigrateTag[] => {
    return tags?.map((tag: Tag) => {
      return {
        metadata: {
          name: tag.id + "",
        },
        kind: "Tag",
        apiVersion: "content.halo.run/v1alpha1",
        spec: {
          displayName: tag.name,
          slug: tag.slug,
          color: tag.color,
          cover: tag.thumbnail,
        },
      };
    });
  };

  const parseCategories = (categories: any[]): MigrateCategory[] => {
    return categories
      ?.reduce<Category[]>((acc, val, _, array) => {
        const children: string[] = [];
        array.forEach((el) => {
          if (children.includes(el.parentId + "") || el.parentId === val.id) {
            children.push(el.id + "");
          }
        });
        return acc.concat({ ...val, children });
      }, [])
      .map((category: Category) => {
        return {
          metadata: {
            name: category.id + "",
          },
          kind: "Category",
          apiVersion: "content.halo.run/v1alpha1",
          spec: {
            displayName: category.name,
            slug: category.slug,
            description: category.description,
            cover: category.thumbnail,
            priority: category.priority,
            children: category.children || [],
          },
        };
      });
  };

  const parsePosts = (data: any): MigratePost[] => {
    const { posts, contents, post_tags, post_categories, post_metas } = data;
    return posts?.map((post: Post) => {
      const content = contents?.find(
        (content: Content) => content.id === post.id
      );
      const tagIds = post_tags
        ?.filter((postTag: PostTag) => postTag.postId === post.id)
        .map((postTag: PostTag) => postTag.tagId + "");

      const categoryIds = post_categories
        ?.filter(
          (postCategory: PostCategory) => postCategory.postId === post.id
        )
        .map((postCategory: PostCategory) => postCategory.categoryId + "");

      const metas = (post_metas as Meta[])
        ?.filter((meta: Meta) => meta.postId === post.id)
        .reduce<Record<string, string>>((acc, val) => {
          acc[val.key] = val.value;
          return acc;
        }, {});

      return {
        postRequest: {
          post: {
            spec: {
              title: post.title,
              slug: post.slug,
              template: "",
              cover: post.thumbnail,
              deleted: post.status === "RECYCLE",
              publish: post.status === "PUBLISHED",
              publishTime: new Date(post.createTime).toISOString(),
              pinned: post.topPriority > 0,
              allowComment: !post.disallowComment,
              visible: "PUBLIC",
              priority: 0,
              excerpt: {
                autoGenerate: false,
                raw: post.summary,
              },
              categories: categoryIds,
              tags: tagIds,
              htmlMetas: [],
            },
            apiVersion: "content.halo.run/v1alpha1",
            kind: "Post",
            metadata: {
              name: post.id + "",
              annotations: metas,
            },
          },
          content: {
            raw: content?.originalContent,
            content: content?.content,
            rawType: "markdown",
          },
        },
        counter: {
          visit: post.visits,
          upvote: post.likes,
        },
      };
    });
  };

  const parseSinglePages = (data: any): MigrateSinglePage[] => {
    const { sheets, contents, sheet_metas } = data;
    return sheets?.map((sheet: Sheet) => {
      const content = contents?.find(
        (content: Content) => content.id === sheet.id
      );

      const metas = (sheet_metas as Meta[])
        ?.filter((meta: Meta) => meta.postId === sheet.id)
        ?.reduce<Record<string, string>>((acc, val) => {
          acc[val.key] = val.value;
          return acc;
        }, {});

      return {
        singlePageRequest: {
          page: {
            spec: {
              title: sheet.title,
              slug: sheet.slug,
              template: "",
              cover: sheet.thumbnail,
              deleted: sheet.status === "RECYCLE",
              publish: sheet.status === "PUBLISHED",
              publishTime: new Date(sheet.createTime).toISOString(),
              pinned: sheet.topPriority > 0,
              allowComment: !sheet.disallowComment,
              visible: "PUBLIC",
              priority: 0,
              excerpt: {
                autoGenerate: false,
                raw: sheet.summary,
              },
              htmlMetas: [],
            },
            apiVersion: "content.halo.run/v1alpha1",
            kind: "SinglePage",
            metadata: {
              name: sheet.id + "",
              annotations: metas,
            },
          },
          content: {
            raw: content?.originalContent,
            content: content?.content,
            rawType: "markdown",
          },
        },
        counter: {
          visit: sheet.visits,
          upvote: sheet.likes,
        },
      };
    });
  };

  const parseComments = (data: any): (MigrateComment | MigrateReply)[] => {
    const { post_comments, sheet_comments, journal_comments } = data;
    // 文章评论
    const postComments = !post_comments
      ? []
      : createCommentOrReply(
          arrayToTree(post_comments, {
            dataField: null,
            rootParentIds: {
              0: true,
            },
          }) as Comment[],
          {
            kind: "Post",
            group: "content.halo.run",
            version: "v1alpha1",
          }
        );
    // 页面评论
    const sheetComments = !sheet_comments
      ? []
      : createCommentOrReply(
          arrayToTree(sheet_comments, {
            dataField: null,
            rootParentIds: {
              0: true,
            },
          }) as Comment[],
          {
            kind: "SinglePage",
            group: "content.halo.run",
            version: "v1alpha1",
          }
        );
    // 日志（瞬间）评论
    const journalComments = !sheet_comments
      ? []
      : createCommentOrReply(
          arrayToTree(journal_comments, {
            dataField: null,
            rootParentIds: {
              0: true,
            },
          }) as Comment[],
          {
            kind: "Moment",
            group: "moment.halo.run",
            version: "v1alpha1",
          }
        );

    return [...postComments, ...sheetComments, ...journalComments];
  };

  const createCommentOrReply = (
    commentsTree: Comment[],
    subjectRef: { kind: string; group: string; version: string }
  ): (MigrateComment | MigrateReply)[] => {
    const commentRequests: (MigrateComment | MigrateReply)[] = [];
    createCommentOrReply(commentsTree, undefined);

    function createCommentOrReply(comments: Comment[], commentName?: number) {
      comments.forEach((comment: Comment) => {
        if (comment.parentId === 0) {
          commentName = comment.id;
          commentRequests.push(createComment(comment, subjectRef));
        } else {
          commentRequests.push(
            createReply(comment, commentName, subjectRef.kind as any)
          );
        }

        if (comment.children?.length) {
          createCommentOrReply(comment.children, commentName);
        }
      });
    }

    return commentRequests;
  };

  const createComment = (
    comment: Comment,
    subjectRef: { kind: string; group: string; version: string }
  ): MigrateComment => {
    return {
      refType: subjectRef.kind as "Post" | "SinglePage" | "Moment",
      kind: "Comment",
      apiVersion: "content.halo.run/v1alpha1",
      spec: {
        raw: comment.content,
        content: comment.content,
        owner: {
          kind: "Email",
          name: comment.email,
          displayName: comment.author,
          annotations: {
            avatar: `https://www.gravatar.com/avatar/${comment.gravatarMd5}?s=64&d=identicon&r=PG`,
            website: comment.authorUrl,
          },
        },
        userAgent: comment.userAgent,
        ipAddress: comment.ipAddress,
        priority: 0,
        top: false,
        allowNotification: comment.allowNotification,
        approved: comment.status === "PUBLISHED",
        approvedTime: new Date(comment.createTime).toISOString(),
        creationTime: new Date(comment.createTime).toISOString(),
        hidden: false,
        subjectRef: {
          ...subjectRef,
          name: comment.postId + "",
        },
        lastReadTime: undefined,
      },
      metadata: {
        name: comment.id + "",
      },
    };
  };

  const createReply = (
    comment: Comment,
    commentName: number | undefined,
    refType: "Post" | "SinglePage" | "Moment"
  ): MigrateReply => {
    return {
      refType: refType,
      kind: "Reply",
      apiVersion: "content.halo.run/v1alpha1",
      metadata: {
        name: comment.id + "",
      },
      spec: {
        raw: comment.content,
        content: comment.content,
        owner: {
          kind: "Email",
          name: comment.email,
          displayName: comment.author,
          annotations: {
            avatar: `https://www.gravatar.com/avatar/${comment.gravatarMd5}?s=64&d=identicon&r=PG`,
            website: comment.authorUrl,
          },
        },
        userAgent: comment.userAgent,
        ipAddress: comment.ipAddress,
        priority: 0,
        top: false,
        allowNotification: comment.allowNotification,
        approved: comment.status === "PUBLISHED",
        approvedTime: new Date(comment.createTime).toISOString(),
        creationTime: new Date(comment.createTime).toISOString(),
        hidden: false,
        commentName: commentName + "",
        quoteReply: comment.parentId + "",
      },
    };
  };

  const parseMenus = (menus: Menu[]): MigrateMenu[] => {
    return menus
      ?.reduce<Menu[]>((acc, val, _, array) => {
        const children: string[] = [];
        array.forEach((el) => {
          if (children.includes(el.parentId + "") || el.parentId === val.id) {
            children.push(el.id + "");
          }
        });
        return acc.concat({ ...val, children });
      }, [])
      .map((menu) => {
        return {
          menu: {
            kind: "MenuItem",
            apiVersion: "v1alpha1",
            metadata: {
              name: menu.id + "",
            },
            spec: {
              displayName: menu.name,
              href: menu.url,
              priority: menu.priority,
              children: menu.children || [],
            },
          },
          groupId: menu.team,
        };
      });
  };

  const parseMoments = (journals: Journal[]): MigrateMoment[] => {
    return journals?.map((journal) => {
      return {
        spec: {
          content: {
            raw: journal.content,
            html: journal.content,
            medium: [],
          },
          releaseTime: new Date(journal.createTime).toISOString(),
          visible: journal.type == "PUBLIC" ? "PUBLIC" : "PRIVATE",
        },
        metadata: {
          name: journal.id + "",
        },
        kind: "Moment",
        apiVersion: "moment.halo.run/v1alpha1",
      };
    });
  };

  const parsePhotos = (photos: Photo[]): MigratePhoto[] => {
    return photos?.map((photo) => {
      return {
        metadata: {
          name: photo.id + "",
        },
        spec: {
          displayName: photo.name,
          url: photo.url,
          cover: photo.thumbnail,
          groupName: photo.team ? photo.team : "default",
          description: photo.description,
        },
        kind: "Photo",
        apiVersion: "core.halo.run/v1alpha1",
      };
    });
  };

  const parseLinks = (links: Link[]): MigrateLink[] => {
    return links?.map((link) => {
      return {
        metadata: {
          name: link.id + "",
        },
        spec: {
          displayName: link.name,
          url: link.url,
          logo: link.logo,
          groupName: link.team ? link.team : "default",
          description: link.description,
          priority: link.priority,
        },
        kind: "Link",
        apiVersion: "core.halo.run/v1alpha1",
      };
    });
  };

  const parseAttachments = (attachments: Attachment[]): MigrateAttachment[] => {
    return attachments;
  };

  return {
    parse,
  };
}

interface Post {
  createTime: number;
  updateTime: number;
  id: number;
  title: string;
  status: "PUBLISHED" | "DRAFT" | "RECYCLE";
  slug: string;
  editorType: string;
  originalContent: string;
  formatContent: string;
  summary?: string;
  thumbnail?: string;
  visits: number;
  disallowComment: boolean;
  password?: string;
  template?: string;
  topPriority: number;
  likes: number;
  editTime: number;
  metaKeywords?: string;
  metaDescription?: string;
  wordCount: number;
  version: number;
}

interface Sheet {
  createTime: number;
  updateTime: number;
  id: number;
  title: string;
  status: "PUBLISHED" | "DRAFT" | "RECYCLE";
  url: string;
  slug: string;
  editorType: string;
  originalContent: string;
  formatContent: string;
  summary?: string;
  thumbnail?: string;
  visits: number;
  disallowComment: boolean;
  password?: string;
  template?: string;
  topPriority: number;
  likes: number;
  editTime: number;
  metaKeywords?: string;
  metaDescription?: string;
  wordCount: number;
  version: number;
}

interface Tag {
  createTime: number;
  updateTime: number;
  id: number;
  name: string;
  slug: string;
  color?: string;
  thumbnail?: string;
}

interface Category {
  createTime: number;
  updateTime: number;
  id: number;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  parentId: number;
  priority: number;
  password?: string;
  children?: string[];
}

interface Content {
  createTime: number;
  updateTime: number;
  id: number;
  status: string;
  patchLogId: number;
  headPatchLogId: number;
  content?: string;
  originalContent?: string;
}

interface PostTag {
  createTime: number;
  updateTime: number;
  id: number;
  postId: number;
  tagId: number;
}

interface PostCategory {
  createTime: number;
  updateTime: number;
  id: number;
  categoryId: number;
  postId: number;
}

interface Comment {
  createTime: number;
  updateTime: number;
  id: number;
  author: string;
  email: string;
  ipAddress: string;
  authorUrl: string;
  gravatarMd5: string;
  content: string;
  status: string;
  userAgent: string;
  isAdmin: boolean;
  allowNotification: boolean;
  postId: number;
  topPriority: number;
  parentId: number;
  children?: Comment[];
}

interface Menu {
  createTime: number;
  updateTime: number;
  id: number;
  name: string;
  url: string;
  priority: number;
  target: string;
  icon: string;
  parentId: number;
  team: string;
  children?: string[];
}

interface Meta {
  createTime: number;
  updateTime: number;
  id: number;
  postId: number;
  key: string;
  value: string;
}

interface Journal {
  createTime: number;
  updateTime: number;
  id: number;
  sourceContent: string;
  content: string;
  likes: number;
  commentCount?: number;
  type: "PUBLIC" | "INTIMATE";
}

interface Photo {
  createTime: number;
  updateTime: number;
  id: number;
  name: string;
  description?: string;
  takeTime?: number;
  location?: number;
  thumbnail: string;
  url: string;
  team?: string;
  likes?: number;
}

interface Link {
  createTime: number;
  updateTime: number;
  id: number;
  name: string;
  url: string;
  logo: string;
  description: string;
  team: string;
  priority: number;
}

interface Attachment {
  createTime: number;
  updateTime: number;
  id: number;
  name: string;
  path: string;
  fileKey: string;
  thumbPath: string;
  mediaType: string;
  suffix: string;
  width: number;
  height: number;
  size: number;
  type:
    | "LOCAL"
    | "UPOSS"
    | "QINIUOSS"
    | "SMMS"
    | "ALIOSS"
    | "BAIDUBOS"
    | "TENCENTCOS"
    | "HUAWEIOBS"
    | "MINIO";
}
