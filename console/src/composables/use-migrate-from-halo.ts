import { transformVNodeArgs, type Ref } from "vue";
import { apiClient } from "@/utils/api-client";
import { arrayToTree } from "performant-array-to-tree";
import type {
  Category,
  Content,
  Post,
  PostCategory,
  PostTag,
  Sheet,
  Tag,
  Comment,
  Menu,
} from "../types/models";
import type { AxiosResponse } from "axios";
import groupBy from "lodash.groupby";

interface useMigrateFromHaloReturn {
  createTagRequests: () => Promise<AxiosResponse>[];
  createCategoryRequests: () => Promise<AxiosResponse>[];
  createPostRequests: () => Promise<AxiosResponse>[];
  createSinglePageRequests: () => Promise<AxiosResponse>[];
  createPostCommentRequests: () => Promise<AxiosResponse>[];
  createSinglePageCommentRequests: () => Promise<AxiosResponse>[];
  createMenuRequests: () => Promise<AxiosResponse>[];
}

export function useMigrateFromHalo(
  tags: Ref<Tag[]>,
  categories: Ref<Category[]>,
  posts: Ref<Post[]>,
  contents: Ref<Content[]>,
  postTags: Ref<PostTag[]>,
  postCategories: Ref<PostCategory[]>,
  postComments: Ref<Comment[]>,
  sheets: Ref<Sheet[]>,
  sheetComments: Ref<Comment[]>,
  menus: Ref<Menu[]>
): useMigrateFromHaloReturn {
  function createTagRequests() {
    return tags.value.map((item: Tag) => {
      return apiClient.extension.tag.createcontentHaloRunV1alpha1Tag({
        tag: {
          metadata: {
            name: item.id + "",
          },
          kind: "Tag",
          apiVersion: "content.halo.run/v1alpha1",
          spec: {
            displayName: item.name,
            slug: item.slug,
            color: item.color,
            cover: item.thumbnail,
          },
        },
      });
    });
  }

  function createCategoryRequests() {
    return categories.value.map((item: Category) => {
      return apiClient.extension.category.createcontentHaloRunV1alpha1Category({
        category: {
          metadata: {
            name: item.id + "",
          },
          kind: "Category",
          apiVersion: "content.halo.run/v1alpha1",
          spec: {
            displayName: item.name,
            slug: item.slug,
            description: item.description,
            cover: item.thumbnail,
            priority: item.priority,
            children: [],
          },
        },
      });
    });
  }

  function createPostRequests() {
    return [
      ...posts.value.map((item: Post) => {
        const content = contents.value.find(
          (content: Content) => content.id === item.id
        );
        const tagIds = postTags.value
          .filter((postTag: PostTag) => postTag.postId === item.id)
          .map((postTag: PostTag) => postTag.tagId + "");

        const categoryIds = postCategories.value
          .filter(
            (postCategory: PostCategory) => postCategory.postId === item.id
          )
          .map((postCategory: PostCategory) => postCategory.categoryId + "");

        return apiClient.post.draftPost({
          postRequest: {
            post: {
              spec: {
                title: item.title,
                slug: item.slug,
                template: "",
                cover: item.thumbnail,
                deleted: item.status === "RECYCLE",
                published: false,
                publishTime: new Date(item.createTime).toISOString(),
                pinned: item.topPriority > 0,
                allowComment: !item.disallowComment,
                visible: "PUBLIC",
                version: 1,
                priority: 0,
                excerpt: {
                  autoGenerate: false,
                  raw: item.summary,
                },
                categories: categoryIds,
                tags: tagIds,
                htmlMetas: [],
              },
              apiVersion: "content.halo.run/v1alpha1",
              kind: "Post",
              metadata: {
                name: item.id + "",
              },
            },
            content: {
              raw: content?.content,
              content: content?.content,
              rawType: "HTML",
            },
          },
        });
      }),
      ...posts.value
        .filter((post) => post.status === "PUBLISHED")
        .map((item: Post) => {
          return apiClient.post.publishPost({
            name: item.id + "",
          });
        }),
    ];
  }

  function createSinglePageRequests() {
    return [
      ...sheets.value.map((item: Sheet) => {
        const content = contents.value.find(
          (content: Content) => content.id === item.id
        );

        return apiClient.singlePage.draftSinglePage({
          singlePageRequest: {
            page: {
              spec: {
                title: item.title,
                slug: item.slug,
                template: "",
                cover: item.thumbnail,
                deleted: item.status === "RECYCLE",
                published: false,
                publishTime: new Date(item.createTime).toISOString(),
                pinned: item.topPriority > 0,
                allowComment: !item.disallowComment,
                visible: "PUBLIC",
                version: 1,
                priority: 0,
                excerpt: {
                  autoGenerate: false,
                  raw: item.summary,
                },
                htmlMetas: [],
              },
              apiVersion: "content.halo.run/v1alpha1",
              kind: "SinglePage",
              metadata: {
                name: item.id + "",
              },
            },
            content: {
              raw: content?.content,
              content: content?.content,
              rawType: "HTML",
            },
          },
        });
      }),
      ...sheets.value
        .filter((sheet) => sheet.status === "PUBLISHED")
        .map((item: Sheet) => {
          return apiClient.singlePage.publishSinglePage({
            name: item.id + "",
          });
        }),
    ];
  }

  function createCommentRequests(
    commentsTree: Comment[],
    subjectRef: { kind: string; group: string; version: string }
  ) {
    const commentCreateRequests: Promise<AxiosResponse>[] = [];
    const replyCreateRequests: Promise<AxiosResponse>[] = [];

    createCommentOrReply(commentsTree, undefined);

    function createCommentOrReply(comments: Comment[], commentName?: number) {
      comments.forEach((comment: Comment) => {
        if (comment.parentId === 0) {
          commentName = comment.id;
          commentCreateRequests.push(
            apiClient.extension.comment.createcontentHaloRunV1alpha1Comment({
              comment: {
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
                  approved: true,
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
              },
            })
          );
        } else {
          replyCreateRequests.push(
            apiClient.extension.reply.createcontentHaloRunV1alpha1Reply({
              reply: {
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
                  approved: true,
                  hidden: false,
                  commentName: commentName + "",
                  quoteReply: comment.parentId + "",
                },
              },
            })
          );
        }

        if (comment.children?.length) {
          createCommentOrReply(comment.children, commentName);
        }
      });
    }
    return [...commentCreateRequests, ...replyCreateRequests];
  }

  function createPostCommentRequests() {
    return createCommentRequests(
      arrayToTree(postComments.value, {
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
  }

  function createSinglePageCommentRequests() {
    return createCommentRequests(
      arrayToTree(sheetComments.value, {
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
  }

  function createMenuRequests() {
    const groupedMenus = groupBy(menus.value, "team");

    // create menu and menuitem request
    const menuRequests: Promise<AxiosResponse>[] = [];

    Object.keys(groupedMenus).forEach((team) => {
      menuRequests.push(
        apiClient.extension.menu.createv1alpha1Menu({
          menu: {
            kind: "Menu",
            apiVersion: "v1alpha1",
            metadata: {
              name: team ? team : "default",
            },
            spec: {
              displayName: team ? team : "未分组",
              menuItems: groupedMenus[team].map((item: Menu) => {
                return item.id;
              }),
            },
          },
        })
      );
    });

    const menuItemRequests: Promise<AxiosResponse>[] = [];

    menus.value.forEach((item: Menu) => {
      menuItemRequests.push(
        apiClient.extension.menuItem.createv1alpha1MenuItem({
          menuItem: {
            kind: "MenuItem",
            apiVersion: "v1alpha1",
            metadata: {
              name: item.id + "",
            },
            spec: {
              displayName: item.name,
              href: item.url,
              priority: item.priority,
            },
          },
        })
      );
    });

    return [...menuItemRequests, ...menuRequests];
  }

  return {
    createTagRequests,
    createCategoryRequests,
    createPostRequests,
    createSinglePageRequests,
    createPostCommentRequests,
    createSinglePageCommentRequests,
    createMenuRequests,
  };
}
