import type { Ref } from "vue";
import { apiClient } from "@/utils/api-client";
import type { User } from "@halo-dev/api-client";
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
  Meta,
  Attachment as AttachmentModel,
} from "../types/models";
import type { AxiosResponse } from "axios";
import groupBy from "lodash.groupby";
import type { Attachment, MenuItem } from "@halo-dev/api-client/index";

export interface MigrateRequestTask<T> {
  item: T;
  run: () => Promise<AxiosResponse<any, any>>;
}

interface useMigrateFromHaloReturn {
  createTagTasks: () => MigrateRequestTask<Tag>[];
  createCategoryTasks: () => MigrateRequestTask<Category>[];
  createPostTasks: () => MigrateRequestTask<Post>[];
  createSinglePageTasks: () => MigrateRequestTask<Sheet>[];
  createPostCommentTasks: () => MigrateRequestTask<Comment>[];
  createSinglePageCommentTasks: () => MigrateRequestTask<Comment>[];
  createMenuTasks: () => MigrateRequestTask<string | MenuItem>[];
  createAttachmentTasks: (
    typeToPolicyMap: Map<string, string>,
    user: User
  ) => MigrateRequestTask<string | MenuItem>[];
}

class TagTask implements MigrateRequestTask<Tag> {
  item: Tag;
  constructor(item: Tag) {
    this.item = item;
  }

  run() {
    return apiClient.extension.tag.createcontentHaloRunV1alpha1Tag({
      tag: {
        metadata: {
          name: this.item.id + "",
        },
        kind: "Tag",
        apiVersion: "content.halo.run/v1alpha1",
        spec: {
          displayName: this.item.name,
          slug: this.item.slug,
          color: this.item.color,
          cover: this.item.thumbnail,
        },
      },
    });
  }
}

class CategoryTask implements MigrateRequestTask<Category> {
  item: Category;
  constructor(item: Category) {
    this.item = item;
  }

  run() {
    return apiClient.extension.category.createcontentHaloRunV1alpha1Category({
      category: {
        metadata: {
          name: this.item.id + "",
        },
        kind: "Category",
        apiVersion: "content.halo.run/v1alpha1",
        spec: {
          displayName: this.item.name,
          slug: this.item.slug,
          description: this.item.description,
          cover: this.item.thumbnail,
          priority: this.item.priority,
          children: this.item.children || [],
        },
      },
    });
  }
}

class PostTask implements MigrateRequestTask<Post> {
  item: Post;
  content: Content | undefined;
  tagIds: string[];
  categoryIds: string[];
  metas: Record<string, string>;
  constructor(
    item: Post,
    content: Content | undefined,
    tagIds: string[],
    categoryIds: string[],
    metas: Record<string, string>
  ) {
    this.item = item;
    this.content = content;
    this.tagIds = tagIds;
    this.categoryIds = categoryIds;
    this.metas = metas;
  }

  async run() {
    await apiClient.post.draftPost({
      postRequest: {
        post: {
          spec: {
            title: this.item.title,
            slug: this.item.slug,
            template: "",
            cover: this.item.thumbnail,
            deleted: this.item.status === "RECYCLE",
            publish: this.item.status === "PUBLISHED",
            publishTime: new Date(this.item.createTime).toISOString(),
            pinned: this.item.topPriority > 0,
            allowComment: !this.item.disallowComment,
            visible: "PUBLIC",
            priority: 0,
            excerpt: {
              autoGenerate: false,
              raw: this.item.summary,
            },
            categories: this.categoryIds,
            tags: this.tagIds,
            htmlMetas: [],
          },
          apiVersion: "content.halo.run/v1alpha1",
          kind: "Post",
          metadata: {
            name: this.item.id + "",
            annotations: this.metas,
          },
        },
        content: {
          raw: this.content?.originalContent,
          content: this.content?.content,
          rawType: "markdown",
        },
      },
    });
    return apiClient.extension.counter.createmetricsHaloRunV1alpha1Counter({
      counter: {
        visit: this.item.visits,
        upvote: this.item.likes,
        downvote: 0,
        totalComment: 0,
        approvedComment: 0,
        apiVersion: "metrics.halo.run/v1alpha1",
        kind: "Counter",
        metadata: {
          name: `posts.content.halo.run/${this.item.id}`,
        },
      },
    });
  }
}

class SinglePageTask implements MigrateRequestTask<Sheet> {
  item: Sheet;
  content: Content | undefined;
  metas: Record<string, string>;
  constructor(
    item: Sheet,
    content: Content | undefined,
    metas: Record<string, string>
  ) {
    this.item = item;
    this.content = content;
    this.metas = metas;
  }

  async run() {
    await apiClient.singlePage.draftSinglePage({
      singlePageRequest: {
        page: {
          spec: {
            title: this.item.title,
            slug: this.item.slug,
            template: "",
            cover: this.item.thumbnail,
            deleted: this.item.status === "RECYCLE",
            publish: this.item.status === "PUBLISHED",
            publishTime: new Date(this.item.createTime).toISOString(),
            pinned: this.item.topPriority > 0,
            allowComment: !this.item.disallowComment,
            visible: "PUBLIC",
            priority: 0,
            excerpt: {
              autoGenerate: false,
              raw: this.item.summary,
            },
            htmlMetas: [],
          },
          apiVersion: "content.halo.run/v1alpha1",
          kind: "SinglePage",
          metadata: {
            name: this.item.id + "",
            annotations: this.metas,
          },
        },
        content: {
          raw: this.content?.originalContent,
          content: this.content?.content,
          rawType: "markdown",
        },
      },
    });
    return apiClient.extension.counter.createmetricsHaloRunV1alpha1Counter({
      counter: {
        visit: this.item.visits,
        upvote: this.item.likes,
        downvote: 0,
        totalComment: 0,
        approvedComment: 0,
        apiVersion: "metrics.halo.run/v1alpha1",
        kind: "Counter",
        metadata: {
          name: `singlepages.content.halo.run/${this.item.id}`,
        },
      },
    });
  }
}

interface CommentTask extends MigrateRequestTask<Comment> {
  item: Comment;

  run: () => Promise<AxiosResponse<any, any>>;
}

class CreateCommentTask implements CommentTask {
  item: Comment;
  subjectRef: { kind: string; group: string; version: string };
  constructor(
    item: Comment,
    subjectRef: {
      kind: string;
      group: string;
      version: string;
    }
  ) {
    this.item = item;
    this.subjectRef = subjectRef;
  }

  run() {
    return apiClient.extension.comment.createcontentHaloRunV1alpha1Comment({
      comment: {
        kind: "Comment",
        apiVersion: "content.halo.run/v1alpha1",
        spec: {
          raw: this.item.content,
          content: this.item.content,
          owner: {
            kind: "Email",
            name: this.item.email,
            displayName: this.item.author,
            annotations: {
              avatar: `https://www.gravatar.com/avatar/${this.item.gravatarMd5}?s=64&d=identicon&r=PG`,
              website: this.item.authorUrl,
            },
          },
          userAgent: this.item.userAgent,
          ipAddress: this.item.ipAddress,
          priority: 0,
          top: false,
          allowNotification: this.item.allowNotification,
          approved: this.item.status === "PUBLISHED",
          approvedTime: new Date(this.item.createTime).toISOString(),
          creationTime: new Date(this.item.createTime).toISOString(),
          hidden: false,
          subjectRef: {
            ...this.subjectRef,
            name: this.item.postId + "",
          },
          lastReadTime: undefined,
        },
        metadata: {
          name: this.item.id + "",
        },
      },
    });
  }
}

class replyCreateComment implements CommentTask {
  item: Comment;
  commentName: number | undefined;
  constructor(item: Comment, commentName: number | undefined) {
    this.item = item;
    this.commentName = commentName;
  }

  run() {
    return apiClient.extension.reply.createcontentHaloRunV1alpha1Reply({
      reply: {
        kind: "Reply",
        apiVersion: "content.halo.run/v1alpha1",
        metadata: {
          name: this.item.id + "",
        },
        spec: {
          raw: this.item.content,
          content: this.item.content,
          owner: {
            kind: "Email",
            name: this.item.email,
            displayName: this.item.author,
            annotations: {
              avatar: `https://www.gravatar.com/avatar/${this.item.gravatarMd5}?s=64&d=identicon&r=PG`,
              website: this.item.authorUrl,
            },
          },
          userAgent: this.item.userAgent,
          ipAddress: this.item.ipAddress,
          priority: 0,
          top: false,
          allowNotification: this.item.allowNotification,
          approved: this.item.status === "PUBLISHED",
          approvedTime: new Date(this.item.createTime).toISOString(),
          creationTime: new Date(this.item.createTime).toISOString(),
          hidden: false,
          commentName: this.commentName + "",
          quoteReply: this.item.parentId + "",
        },
      },
    });
  }
}

class MenuTask implements MigrateRequestTask<string> {
  item: string;
  menuItem: Menu[];
  constructor(item: string, menuItem: Menu[]) {
    this.item = item;
    this.menuItem = menuItem;
  }

  run() {
    return apiClient.extension.menu.createv1alpha1Menu({
      menu: {
        kind: "Menu",
        apiVersion: "v1alpha1",
        metadata: {
          name: this.item ? this.item : "default",
        },
        spec: {
          displayName: this.item ? this.item : "未分组",
          menuItems: this.menuItem.map((item: Menu) => {
            return item.id + "";
          }),
        },
      },
    });
  }
}

class MenuItemTask implements MigrateRequestTask<MenuItem> {
  item: MenuItem;
  constructor(item: MenuItem) {
    this.item = item;
  }

  run() {
    return apiClient.extension.menuItem.createv1alpha1MenuItem({
      menuItem: this.item,
    });
  }
}

interface AttachmentTask extends MigrateRequestTask<AttachmentModel> {
  item: AttachmentModel;

  run: () => Promise<AxiosResponse<any, any>>;
}

class NoSupportAttachmentTask implements AttachmentTask {
  item: AttachmentModel;
  constructor(item: AttachmentModel) {
    this.item = item;
  }

  run() {
    return Promise.reject(
      new Error("尚未支持 【" + this.item.type + "】 类型的附件迁移")
    );
  }
}

abstract class AbstractAttachmentTask implements AttachmentTask {
  item: AttachmentModel;
  policyName: string;
  ownerName: string;
  constructor(item: AttachmentModel, policyName: string, ownerName: string) {
    this.item = item;
    this.policyName = policyName;
    this.ownerName = ownerName;
  }

  abstract buildModel(): Attachment;

  run() {
    return apiClient.extension.storage.attachment.createstorageHaloRunV1alpha1Attachment(
      {
        attachment: this.buildModel(),
      }
    );
  }
}

class LocalAttachmentTask extends AbstractAttachmentTask {
  buildModel() {
    let relativePath = this.item.path;
    if (this.item.path.startsWith("upload/")) {
      relativePath = relativePath.replace("upload/", "");
    }
    return {
      apiVersion: "storage.halo.run/v1alpha1",
      kind: "Attachment",
      metadata: {
        name: this.item.id + "",
        annotations: {
          "storage.halo.run/local-relative-path": `migrate-from-1.x/${relativePath}`,
          "storage.halo.run/uri": `/${this.item.path}`,
          "storage.halo.run/suffix": `${this.item.suffix}`,
          "storage.halo.run/width": `${this.item.width}`,
          "storage.halo.run/height": `${this.item.height}`,
        },
      },
      spec: {
        displayName: `${this.item.name}`,
        groupName: ``,
        ownerName: `${this.ownerName}`,
        policyName: `${this.policyName}`,
        mediaType: `${this.item.mediaType}`,
        size: Number.parseInt(`${this.item.size}`),
      },
    };
  }
}

class S3OSSAttachmentTask extends AbstractAttachmentTask {
  buildModel() {
    return {
      apiVersion: "storage.halo.run/v1alpha1",
      kind: "Attachment",
      metadata: {
        name: this.item.id + "",
        annotations: {
          "storage.halo.run/external-link": `${this.item.path}`,
          "storage.halo.run/suffix": `${this.item.suffix}`,
          "storage.halo.run/width": `${this.item.width}`,
          "storage.halo.run/height": `${this.item.height}`,
        },
      },
      spec: {
        displayName: `${this.item.name}`,
        groupName: "",
        policyName: `${this.policyName}`,
        ownerName: `${this.ownerName}`,
        mediaType: `${this.item.mediaType}`,
        size: Number.parseInt(`${this.item.size}`),
      },
    };
  }
}

export function useMigrateFromHalo(
  tags: Ref<Tag[]>,
  categories: Ref<Category[]>,
  posts: Ref<Post[]>,
  contents: Ref<Content[]>,
  postTags: Ref<PostTag[]>,
  postCategories: Ref<PostCategory[]>,
  postComments: Ref<Comment[]>,
  postMetas: Ref<Meta[]>,
  sheets: Ref<Sheet[]>,
  sheetComments: Ref<Comment[]>,
  sheetMetas: Ref<Meta[]>,
  menus: Ref<Menu[]>,
  attachments: Ref<AttachmentModel[]>
): useMigrateFromHaloReturn {
  function createTagTasks() {
    return tags.value.map((item: Tag) => {
      return new TagTask(item);
    });
  }

  function createCategoryTasks() {
    return categories.value
      .reduce<Category[]>((acc, val, _, array) => {
        const children: string[] = [];
        array.forEach((el) => {
          if (children.includes(el.parentId + "") || el.parentId === val.id) {
            children.push(el.id + "");
          }
        });
        return acc.concat({ ...val, children });
      }, [])
      .map((item: Category) => {
        return new CategoryTask(item);
      });
  }

  function createPostTasks() {
    return posts.value.map((item: Post) => {
      const content = contents.value.find(
        (content: Content) => content.id === item.id
      );
      const tagIds = postTags.value
        .filter((postTag: PostTag) => postTag.postId === item.id)
        .map((postTag: PostTag) => postTag.tagId + "");

      const categoryIds = postCategories.value
        .filter((postCategory: PostCategory) => postCategory.postId === item.id)
        .map((postCategory: PostCategory) => postCategory.categoryId + "");

      const metas = postMetas.value
        .filter((meta: Meta) => meta.postId === item.id)
        .reduce<Record<string, string>>((acc, val) => {
          acc[val.key] = val.value;
          return acc;
        }, {});

      return new PostTask(item, content, tagIds, categoryIds, metas);
    });
  }

  function createSinglePageTasks() {
    return sheets.value.map((item: Sheet) => {
      const content = contents.value.find(
        (content: Content) => content.id === item.id
      );

      const metas = sheetMetas.value
        .filter((meta: Meta) => meta.postId === item.id)
        .reduce<Record<string, string>>((acc, val) => {
          acc[val.key] = val.value;
          return acc;
        }, {});

      return new SinglePageTask(item, content, metas);
    });
  }

  function createCommentTasks(
    commentsTree: Comment[],
    subjectRef: { kind: string; group: string; version: string }
  ) {
    const commentCreateRequests: CommentTask[] = [];
    const replyCreateRequests: CommentTask[] = [];

    createCommentOrReply(commentsTree, undefined);

    function createCommentOrReply(comments: Comment[], commentName?: number) {
      comments.forEach((comment: Comment) => {
        if (comment.parentId === 0) {
          commentName = comment.id;
          commentCreateRequests.push(
            new CreateCommentTask(comment, subjectRef)
          );
        } else {
          replyCreateRequests.push(
            new replyCreateComment(comment, commentName)
          );
        }

        if (comment.children?.length) {
          createCommentOrReply(comment.children, commentName);
        }
      });
    }
    return [...commentCreateRequests, ...replyCreateRequests];
  }

  function createPostCommentTasks() {
    return createCommentTasks(
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

  function createSinglePageCommentTasks() {
    return createCommentTasks(
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

  function createMenuTasks() {
    const groupedMenus = groupBy(menus.value, "team");

    // create menu and menuitem request
    const menuRequests: MigrateRequestTask<any>[] = [];

    Object.keys(groupedMenus).forEach((team) => {
      menuRequests.push(new MenuTask(team, groupedMenus[team]));
    });

    const menusToCreate: MenuItem[] = menus.value
      .reduce<Menu[]>((acc, val, _, array) => {
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
        };
      });

    const menuItemRequests: MigrateRequestTask<MenuItem>[] = menusToCreate.map(
      (menuItem) => {
        return new MenuItemTask(menuItem);
      }
    );

    return [...menuItemRequests, ...menuRequests];
  }

  function createAttachmentTasks(
    typeToPolicyMap: Map<string, string>,
    user: User
  ) {
    const typeGroupAttachments = groupBy(attachments.value, "type");

    // create menu and menuitem request
    let attachmentRequests: MigrateRequestTask<any>[] = [];
    const userName = user.metadata.name;
    Object.keys(typeGroupAttachments).forEach((type) => {
      const attachments = typeGroupAttachments[type];
      attachmentRequests = [
        ...attachmentRequests,
        ...attachments
          .map((item) => {
            switch (item.type) {
              case "LOCAL":
                return new LocalAttachmentTask(
                  item,
                  typeToPolicyMap.get(item.type) || "default-policy",
                  userName
                );
              case "ALIOSS":
              case "BAIDUBOS":
              case "TENCENTCOS":
              case "QINIUOSS":
                return new S3OSSAttachmentTask(
                  item,
                  typeToPolicyMap.get(item.type) || "default-policy",
                  userName
                );
              default:
                return new NoSupportAttachmentTask(item);
            }
          })
          .filter((item) => item && item != undefined),
      ];
    });

    return attachmentRequests;
  }

  return {
    createTagTasks,
    createCategoryTasks,
    createPostTasks,
    createSinglePageTasks,
    createPostCommentTasks,
    createSinglePageCommentTasks,
    createMenuTasks,
    createAttachmentTasks,
  };
}
