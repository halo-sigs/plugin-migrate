import type {
  MigrateAttachment,
  MigrateCategory,
  MigrateComment,
  MigrateData,
  MigrateMenu,
  MigrateReply,
} from "@/types";
import type { Ref } from "@halo-dev/api-client";
import { XMLParser } from "fast-xml-parser";

interface useWordPressDataParserReturn {
  parse: () => Promise<MigrateData>;
}

export function useWordPressDataParser(
  file: File
): useWordPressDataParserReturn {
  const menuChildrenMap = new Map<string, string[]>();

  const parse = (): Promise<MigrateData> => {
    return new Promise<MigrateData>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const xmlData = event.target?.result as string;
        const isArrayPath = [
          "rss.channel.item",
          "rss.channel.item.category",
          "rss.channel.item.wp:postmeta",
          "rss.channel.item.wp:comment",
        ];
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "_",
          textNodeName: "value",
          isArray: (name, jpath, isLeafNode, isAttribute) => {
            if (isArrayPath.includes(jpath)) return true;
            return false;
          },
        });
        try {
          const result = parser.parse(xmlData, true);
          const channel = result.rss.channel as Channel;
          // 校验 wxr 版本 result.rss.channel["wp:wxr_version"]
          // 解析 item 数据，获取文章、页面、附件
          const { posts, pages, attachments, navMenuItems } =
            itemClassification(channel.item);
          const menuItems = parseMenuItems(channel["wp:term"], navMenuItems);
          menuItems.map((item) => {
            if (menuChildrenMap.has(item.menu.metadata.name)) {
              item.menu.spec.children = menuChildrenMap.get(
                item.menu.metadata.name
              ) as string[];
            }
          });
          resolve({
            posts: parsePosts(
              posts,
              channel["wp:tag"],
              channel["wp:category"],
              attachments
            ),
            pages: parsePages(pages),
            comments: parseComments(channel.item),
            tags: parseTags(channel["wp:tag"]),
            categories: parseCategories(channel["wp:category"]),
            // 菜单
            menuItems: menuItems,
            // 附件
            attachments: parseAttachments(attachments),
          } as MigrateData);
        } catch (error) {
          reject("Failed to parse data. error -> " + error);
        }
      };
      reader.onerror = () => {
        reject("Failed to fetch data");
      };
      reader.readAsText(file);
    });
  };

  const itemClassification = (items: Item[]) => {
    const posts: Item[] = [];
    const pages: Item[] = [];
    const attachments: Item[] = [];
    const navMenuItems: Item[] = [];
    const others: Item[] = [];
    items?.forEach((item) => {
      switch (item["wp:post_type"]) {
        case "post":
          posts.push(item);
          break;
        case "page":
          pages.push(item);
          break;
        case "attachment":
          attachments.push(item);
          break;
        case "nav_menu_item":
          navMenuItems.push(item);
          break;
        default:
          others.push(item);
          break;
      }
    });
    return { posts, pages, attachments, navMenuItems, others };
  };

  const parsePosts = (
    posts: Item[],
    tags: Tag[],
    categories: Category[],
    attachments: Item[]
  ) => {
    return posts?.map((post: Item) => {
      const publish =
        post["wp:status"] === "publish" ||
        post["wp:postmeta"]?.find(
          (meta) => meta["wp:meta_key"] === "_wp_trash_meta_status"
        )?.["wp:meta_value"] === "publish";
      const postCategorySlugs = post.category
        ?.filter((category) => {
          return category._domain === "category";
        })
        .map((category) => {
          return category._nicename;
        });

      const postTagSlugs = post.category
        ?.filter((category) => {
          return category._domain === "post_tag";
        })
        .map((category) => {
          return category._nicename;
        });

      const tagIds = tags
        ?.filter((tag: Tag) => {
          return postTagSlugs?.includes(tag["wp:tag_slug"]);
        })
        .map((tag: Tag) => tag["wp:term_id"] + "");

      const categoryIds = categories
        ?.filter((category: Category) => {
          return postCategorySlugs?.includes(category["wp:category_nicename"]);
        })
        .map((category: Category) => category["wp:term_id"] + "");

      const thumbnail = post["wp:postmeta"]
        ?.filter((meta) => {
          if (meta["wp:meta_key"] === "") {
            return true;
          }
        })
        .map((meta) => {
          const attachment = attachments.find((attachment) => {
            return attachment["wp:post_id"] === Number(meta["wp:meta_value"]);
          });
          return attachment?.["wp:attachment_url"];
        })[0];
      return {
        postRequest: {
          post: {
            spec: {
              title: post.title,
              slug: post["wp:post_name"] + "",
              deleted: post["wp:status"] === "trash",
              publish: publish,
              publishTime: new Date(post["wp:post_date"]).toISOString(),
              pinned: post["wp:is_sticky"] > 0,
              allowComment: post["wp:comment_status"] === "open",
              visible: "PUBLIC",
              priority: 0,
              excerpt: {
                autoGenerate: false,
                raw: post["excerpt:encoded"],
              },
              categories: categoryIds,
              tags: tagIds,
              htmlMetas: [],
              cover: thumbnail,
            },
            apiVersion: "content.halo.run/v1alpha1",
            kind: "Post",
            metadata: {
              name: post["wp:post_id"] + "",
            },
          },
          content: {
            raw: post["content:encoded"],
            content: post["content:encoded"],
            rawType: "HTML",
          },
        },
      };
    });
  };

  const parsePages = (pages: Item[]) => {
    return pages?.map((page: Item) => {
      const publish =
        page["wp:status"] === "publish" ||
        page["wp:postmeta"]?.find(
          (meta) => meta["wp:meta_key"] === "_wp_trash_meta_status"
        )?.["wp:meta_value"] === "publish";
      return {
        singlePageRequest: {
          page: {
            spec: {
              title: page.title,
              slug: page["wp:post_name"] + "",
              deleted: page["wp:status"] === "trash",
              publish: publish,
              publishTime: new Date(page["wp:post_date"]).toISOString(),
              pinned: page["wp:is_sticky"] > 0,
              allowComment: page["wp:comment_status"] === "open",
              visible: "PUBLIC",
              priority: 0,
              excerpt: {
                autoGenerate: false,
                raw: page["excerpt:encoded"],
              },
              htmlMetas: [],
            },
            apiVersion: "content.halo.run/v1alpha1",
            kind: "SinglePage",
            metadata: {
              name: page["wp:post_id"] + "",
            },
          },
          content: {
            raw: page["content:encoded"],
            content: page["content:encoded"],
            rawType: "HTML",
          },
        },
      };
    });
  };

  const parseComments = (items: Item[]): (MigrateComment | MigrateReply)[] => {
    const comments: (MigrateComment | MigrateReply)[] = [];
    items?.forEach((item) => {
      const refType = item["wp:post_type"] == "post" ? "Post" : "SinglePage";
      item["wp:comment"]?.forEach((comment) => {
        if (comment["wp:comment_parent"] === 0) {
          comments.push(createComment(comment, item, refType));
        } else {
          comments.push(createReply(comment, refType));
        }
      });
    });
    return comments;
  };

  const createComment = (
    comment: Comment,
    item: Item,
    refType: "Post" | "SinglePage"
  ): MigrateComment => {
    return {
      refType: refType,
      kind: "Comment",
      apiVersion: "content.halo.run/v1alpha1",
      spec: {
        raw: comment["wp:comment_content"],
        content: comment["wp:comment_content"],
        owner: {
          kind: "Email",
          name: comment["wp:comment_author_email"],
          displayName: comment["wp:comment_author"] + "",
          annotations: {
            website: comment["wp:comment_author_url"],
          },
        },
        ipAddress: comment["wp:comment_author_IP"],
        priority: 0,
        top: false,
        allowNotification: true,
        approved: comment["wp:comment_approved"] === 1,
        approvedTime: new Date(comment["wp:comment_date"]).toISOString(),
        creationTime: new Date(comment["wp:comment_date"]).toISOString(),
        hidden: false,
        subjectRef: {
          kind: item["wp:post_type"] == "post" ? "Post" : "SinglePage",
          group: "content.halo.run",
          version: "v1alpha1",
          name: item["wp:post_id"] + "",
        },
        lastReadTime: undefined,
      },
      metadata: {
        name: comment["wp:comment_id"] + "",
      },
    };
  };

  const createReply = (
    reply: Comment,
    refType: "Post" | "SinglePage"
  ): MigrateReply => {
    return {
      refType: refType,
      kind: "Reply",
      apiVersion: "content.halo.run/v1alpha1",
      metadata: {
        name: reply["wp:comment_id"] + "",
      },
      spec: {
        raw: reply["wp:comment_content"],
        content: reply["wp:comment_content"],
        owner: {
          kind: "Email",
          name: reply["wp:comment_author_email"],
          displayName: reply["wp:comment_author"] + "",
          annotations: {
            website: reply["wp:comment_author_url"],
          },
        },
        ipAddress: reply["wp:comment_author_IP"],
        priority: 0,
        top: false,
        allowNotification: true,
        approved: reply["wp:comment_approved"] === 1,
        approvedTime: new Date(reply["wp:comment_date"]).toISOString(),
        creationTime: new Date(reply["wp:comment_date"]).toISOString(),
        hidden: false,
        commentName: reply["wp:comment_parent"] + "",
        quoteReply: reply["wp:comment_parent"] + "",
      },
    };
  };

  const parseTags = (tags: Tag[]) => {
    return tags?.map((tag) => {
      return {
        metadata: {
          name: tag["wp:term_id"] + "",
        },
        kind: "Tag",
        apiVersion: "content.halo.run/v1alpha1",
        spec: {
          displayName: tag["wp:tag_name"] + "",
          slug: tag["wp:tag_slug"] + "",
        },
      };
    });
  };

  const parseCategories = (categories: Category[]) => {
    return categories?.map((category) => {
      const children = categories
        .filter((item) => {
          return (
            category["wp:category_nicename"] === item["wp:category_parent"]
          );
        })
        .map((item) => {
          return item["wp:term_id"] + "";
        });
      return {
        metadata: {
          name: category["wp:term_id"] + "",
        },
        kind: "Category",
        apiVersion: "content.halo.run/v1alpha1",
        spec: {
          displayName: category["wp:cat_name"] + "",
          slug: category["wp:category_nicename"] + "",
          priority: 0,
          description: category["wp:category_description"],
          children: children || [],
        },
      } as MigrateCategory;
    });
  };

  const parseMenuItems = (
    terms: Term[],
    navMenuItems: Item[]
  ): MigrateMenu[] | [] => {
    return (
      terms
        ?.filter((term) => {
          return term["wp:term_taxonomy"] === "nav_menu";
        })
        .reduce((acc: Term[], term) => {
          const exists = acc.some(
            (existingTerm) => existingTerm["wp:term_id"] === term["wp:term_id"]
          );
          if (!exists) {
            acc.push(term);
          }
          return acc;
        }, [])
        .flatMap((term) => {
          return navMenuItems
            ?.map((item) => {
              const category = item.category?.find((category) => {
                return (
                  category._domain === "nav_menu" &&
                  category._nicename === term["wp:term_name"]
                );
              });

              if (!category) {
                return;
              }

              const children: string[] = [];
              const metas = item?.["wp:postmeta"] || [];
              const targetRef: Ref = {
                name: "",
              };
              let href = "";
              metas.forEach((meta) => {
                switch (meta["wp:meta_key"]) {
                  case "_menu_item_object":
                    targetRef.group = "content.halo.run";
                    targetRef.name = item?.["wp:post_id"] + "";
                    targetRef.version = "v1alpha1";
                    if (meta["wp:meta_value"] == "page") {
                      targetRef.kind = "SinglePage";
                    } else if (meta["wp:meta_value"] == "post") {
                      targetRef.kind = "Post";
                    } else if (meta["wp:meta_value"] == "category") {
                      targetRef.kind = "Category";
                    }
                    break;
                  case "_menu_item_object_id":
                    href = meta["wp:meta_value"];
                    break;
                  case "_menu_item_url":
                    href = meta["wp:meta_value"] || href;
                    break;
                }
                if (meta["wp:meta_key"] === "_menu_item_menu_item_parent") {
                  let childrenNames = menuChildrenMap.get(
                    meta["wp:meta_value"]
                  );
                  if (!childrenNames) {
                    childrenNames = new Array<string>();
                  }
                  childrenNames.push(item?.["wp:post_id"] + "");
                  menuChildrenMap.set(meta["wp:meta_value"], childrenNames);
                }
              });
              return {
                menu: {
                  kind: "MenuItem",
                  apiVersion: "v1alpha1",
                  metadata: {
                    name: item?.["wp:post_id"] + "",
                  },
                  spec: {
                    displayName: item?.title + "",
                    priority: Number(item?.["wp:menu_order"]),
                    children: children,
                    href: !targetRef.kind ? href : undefined,
                  },
                },
                groupId: term["wp:term_id"] + "",
                groupName: term["wp:term_name"],
              } as MigrateMenu;
            })
            .filter((item) => {
              return item != undefined;
            }) as MigrateMenu[];
        }) || []
    );
  };

  const ATTACHMENT_PATH_PREFIX = "wp-content/uploads/";

  const parseAttachments = (attachments: Item[]) => {
    return attachments?.map((attachment) => {
      let path = "";
      let metadata: AttachmentMetadata = {} as AttachmentMetadata;
      attachment["wp:postmeta"]?.forEach((meta) => {
        if (meta["wp:meta_key"] === "_wp_attached_file") {
          path = meta["wp:meta_value"];
        }
        // TODO 解析元数据
        if (meta["wp:meta_key"] === "_wp_attachment_metadata") {
          metadata = extractImageMetadata(meta["wp:meta_value"]);
        }
      });
      return {
        id: attachment["wp:post_id"] + "",
        name: attachment.title,
        path: ATTACHMENT_PATH_PREFIX + path,
        type: "LOCAL",
        height: metadata?.height,
        width: metadata?.width,
        mediaType: metadata?.mimeType,
        size: metadata?.filesize,
      } as MigrateAttachment;
    });
  };

  const extractImageMetadata = (metadataString: string): AttachmentMetadata => {
    const widthMatch = metadataString.match(/"width";i:(\d+);/);
    const heightMatch = metadataString.match(/"height";i:(\d+);/);
    const filesizeMatch = metadataString.match(/"filesize";i:(\d+);/);
    const mimeMatch = metadataString.match(/"mime[_-]type";s:(\d+):"([^"]+)";/);

    return {
      width: widthMatch ? parseInt(widthMatch[1]) : 0,
      height: heightMatch ? parseInt(heightMatch[1]) : 0,
      filesize: filesizeMatch ? parseInt(filesizeMatch[1]) : 0,
      mimeType: mimeMatch ? mimeMatch[2] : "",
    };
  };

  return {
    parse,
  };
}

interface AttachmentMetadata {
  width: number;
  height: number;
  filesize: number;
  mimeType: string;
}

interface Category {
  "wp:term_id": number;
  "wp:category_nicename": string;
  "wp:category_parent": string;
  "wp:cat_name": string;
  "wp:category_description"?: string;
}

interface Tag {
  "wp:term_id": number;
  "wp:tag_slug": string;
  "wp:tag_name": string;
  "wp:tag_description"?: string;
}

interface Item {
  title: string;
  link: string;
  pubDate: string;
  "dc:creator": string;
  guid: Guid;
  description: string;
  "content:encoded": string;
  "excerpt:encoded": string;
  "wp:post_id": number;
  "wp:post_date": string;
  "wp:post_date_gmt": string;
  "wp:comment_status": "open" | "closed";
  "wp:ping_status": string;
  "wp:post_name": string;
  "wp:status": "publish" | "draft" | "trash" | "inherit" | "private";
  "wp:post_parent": string | number;
  "wp:menu_order": number;
  "wp:post_type":
    | "post"
    | "page"
    | "attachment"
    | "wp_global_styles"
    | "nav_menu_item";
  "wp:post_password": string;
  "wp:is_sticky": 0 | 1;
  "wp:attachment_url"?: string;
  "wp:postmeta"?: PostMeta[];
  category?: ItemCategory[];
  "wp:comment"?: Comment[];
  "wp:term"?: Tag[];
}

interface Guid {
  value: string;
  _isPermaLink: boolean;
}

interface ItemCategory {
  value: string;
  _domain: "category" | "post_tag" | "nav_menu";
  _nicename: string;
}

interface PostMeta {
  "wp:meta_key": string;
  "wp:meta_value": string;
}

interface Comment {
  "wp:comment_id": number;
  "wp:comment_author": string;
  "wp:comment_author_email": string;
  "wp:comment_author_url": string;
  "wp:comment_author_IP": string;
  "wp:comment_date": string;
  "wp:comment_date_gmt": string;
  "wp:comment_content": string;
  "wp:comment_approved": 0 | 1 | "trash" | "post-trashed";
  "wp:comment_type": string;
  "wp:comment_parent": number;
  "wp:comment_user_id": number;
  "wp:commentmeta": CommentMeta[];
}

interface CommentMeta {
  "wp:meta_key": string;
  "wp:meta_value": string;
}

interface Author {
  "wp:author_id": number;
  "wp:author_login": string;
  "wp:author_email": string;
  "wp:author_display_name": string;
  "wp:author_first_name": string;
  "wp:author_last_name": string;
}

interface Term {
  "wp:term_id": number;
  "wp:term_taxonomy": "post_tag" | "category" | "nav_menu";
  "wp:term_slug": string;
  "wp:term_parent": string;
  "wp:term_name": string;
  "wp:term_description": string;
}

interface Channel {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  language: string;
  "wp:wxr_version": number;
  "wp:base_site_url": string;
  "wp:base_blog_url": string;
  "wp:author": Author[];
  "wp:category": Category[];
  "wp:tag": Tag[];
  "wp:term": Term[];
  "wp:generator": string;
  item: Item[];
}
