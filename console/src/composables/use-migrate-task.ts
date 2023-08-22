import type {
  Counter,
  MigrateAttachment,
  MigrateCategory,
  MigrateComment,
  MigrateData,
  MigrateLink,
  MigrateMenu,
  MigrateMoment,
  MigratePhoto,
  MigratePost,
  MigrateReply,
  MigrateSinglePage,
  MigrateTag,
} from "@/types";
import { apiClient } from "@/utils/api-client";
import type {
  Attachment,
  Category,
  Comment,
  Reply,
  Tag,
  User,
} from "@halo-dev/api-client";
import type { AxiosResponse } from "axios";
import axios from "axios";
import groupBy from "lodash.groupby";

export interface MigrateRequestTask<T> {
  item: T;
  run: () => Promise<AxiosResponse<any, any>>;
}

interface useMigrateTaskReturn {
  createTagTasks: () => MigrateRequestTask<MigrateTag>[];
  createCategoryTasks: () => MigrateRequestTask<MigrateCategory>[];
  createPostTasks: () => MigrateRequestTask<Counter | MigratePost>[];
  createSinglePageTasks: () => MigrateRequestTask<
    Counter | MigrateSinglePage
  >[];
  createCommentAndReplyTasks: () => MigrateRequestTask<
    MigrateComment | MigrateReply
  >[];
  createMenuTasks: () => MigrateRequestTask<string | MigrateMenu>[];
  createMomentTasks: () => MigrateRequestTask<MigrateMoment>[];
  createPhotoTasks: () => MigrateRequestTask<string | MigratePhoto>[];
  createLinkTasks: () => MigrateRequestTask<string | MigrateLink>[];
  createAttachmentTasks: (
    relativePathFolder: string,
    user: User,
    typeToPolicyMap: Map<string, string>
  ) => MigrateRequestTask<MigrateAttachment>[];
}

class TagTask implements MigrateRequestTask<MigrateTag> {
  item: MigrateTag;
  constructor(item: MigrateTag) {
    this.item = item;
  }

  run() {
    return apiClient.extension.tag.createcontentHaloRunV1alpha1Tag({
      tag: this.item as Tag,
    });
  }
}

class CategoryTask implements MigrateRequestTask<MigrateCategory> {
  item: MigrateCategory;
  constructor(item: MigrateCategory) {
    this.item = item;
  }

  run() {
    return apiClient.extension.category.createcontentHaloRunV1alpha1Category({
      category: this.item as Category,
    });
  }
}

class CounterTask implements MigrateRequestTask<Counter> {
  item: Counter;
  name: string;
  constructor(item: Counter, name: string) {
    this.item = item;
    this.name = name;
  }

  async run() {
    return apiClient.extension.counter.createmetricsHaloRunV1alpha1Counter({
      counter: {
        visit: this.item.visit || 0,
        upvote: this.item.upvote || 0,
        downvote: this.item.downvote || 0,
        totalComment: 0,
        approvedComment: this.item.approvedComment || 0,
        apiVersion: "metrics.halo.run/v1alpha1",
        kind: "Counter",
        metadata: {
          name: this.name,
        },
      },
    });
  }
}

class PostTask implements MigrateRequestTask<MigratePost> {
  item: MigratePost;
  constructor(item: MigratePost) {
    this.item = item;
  }

  async run() {
    return apiClient.post.draftPost({
      postRequest: this.item.postRequest,
    });
  }
}

class SinglePageTask implements MigrateRequestTask<MigrateSinglePage> {
  item: MigrateSinglePage;
  constructor(item: MigrateSinglePage) {
    this.item = item;
  }

  async run() {
    return apiClient.singlePage.draftSinglePage({
      singlePageRequest: this.item.singlePageRequest,
    });
  }
}

class CommentTask implements MigrateRequestTask<MigrateComment> {
  item: MigrateComment;
  constructor(item: MigrateComment) {
    this.item = item;
  }

  async run() {
    return apiClient.extension.comment.createcontentHaloRunV1alpha1Comment({
      comment: this.item as Comment,
    });
  }
}

class ReplyTask implements MigrateRequestTask<MigrateReply> {
  item: MigrateReply;
  constructor(item: MigrateReply) {
    this.item = item;
  }

  async run() {
    return apiClient.extension.reply.createcontentHaloRunV1alpha1Reply({
      reply: this.item as Reply,
    });
  }
}

class MenuTask implements MigrateRequestTask<string> {
  item: string;
  menuName: string;
  items: string[];
  constructor(item: string, menuName: string, items: string[]) {
    this.item = item;
    this.menuName = menuName;
    this.items = items;
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
          displayName: this.menuName ? this.menuName : "未分组",
          menuItems: this.items,
        },
      },
    });
  }
}

class MenuItemTask implements MigrateRequestTask<MigrateMenu> {
  item: MigrateMenu;
  constructor(item: MigrateMenu) {
    this.item = item;
  }

  run() {
    return apiClient.extension.menuItem.createv1alpha1MenuItem({
      menuItem: this.item.menu,
    });
  }
}

class MomentTask implements MigrateRequestTask<MigrateMoment> {
  item: MigrateMoment;
  constructor(item: MigrateMoment) {
    this.item = item;
  }

  run() {
    return axios.post(
      `/apis/api.plugin.halo.run/v1alpha1/plugins/PluginMoments/moments`,
      this.item
    );
  }
}

class PhotoGroupTask implements MigrateRequestTask<string> {
  item: string;
  constructor(item: string) {
    this.item = item;
  }

  run() {
    return axios.post(`/apis/core.halo.run/v1alpha1/photogroups`, {
      spec: {
        displayName: this.item ? this.item : "未分组",
        priority: 0,
      },
      metadata: {
        name: this.item ? this.item : "default",
      },
      kind: "PhotoGroup",
      apiVersion: "core.halo.run/v1alpha1",
    });
  }
}

class PhotoTask implements MigrateRequestTask<MigratePhoto> {
  item: MigratePhoto;
  constructor(item: MigratePhoto) {
    this.item = item;
  }

  run() {
    return axios.post(`/apis/core.halo.run/v1alpha1/photos`, this.item);
  }
}

class LinkGroupTask implements MigrateRequestTask<string> {
  item: string;
  constructor(item: string) {
    this.item = item;
  }

  run() {
    return axios.post(`/apis/core.halo.run/v1alpha1/linkgroups`, {
      spec: {
        displayName: this.item ? this.item : "未分组",
        priority: 0,
        links: [],
      },
      metadata: {
        name: this.item ? this.item : "default",
      },
      kind: "LinkGroup",
      apiVersion: "core.halo.run/v1alpha1",
    });
  }
}

class LinkTask implements MigrateRequestTask<MigrateLink> {
  item: MigrateLink;
  constructor(item: MigrateLink) {
    this.item = item;
  }

  run() {
    return axios.post(`/apis/core.halo.run/v1alpha1/links`, this.item);
  }
}

interface AttachmentTask extends MigrateRequestTask<MigrateAttachment> {
  item: MigrateAttachment;

  run: () => Promise<AxiosResponse<any, any>>;
}

class NoSupportAttachmentTask implements AttachmentTask {
  item: MigrateAttachment;
  constructor(item: MigrateAttachment) {
    this.item = item;
  }

  run() {
    return Promise.reject(
      new Error("尚未支持 【" + this.item.type + "】 类型的附件迁移")
    );
  }
}

abstract class AbstractAttachmentTask implements AttachmentTask {
  item: MigrateAttachment;
  policyName: string;
  ownerName: string;
  relativePathFolder: string;
  constructor(
    item: MigrateAttachment,
    policyName: string,
    ownerName: string,
    relativePathFolder: string
  ) {
    this.item = item;
    this.policyName = policyName;
    this.ownerName = ownerName;
    this.relativePathFolder = relativePathFolder;
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
          "storage.halo.run/local-relative-path": `${this.relativePathFolder}/${relativePath}`,
          "storage.halo.run/uri": `/${this.item.path}`,
          "storage.halo.run/suffix": `${this.item.suffix}`,
          "storage.halo.run/width": `${this.item.width}`,
          "storage.halo.run/height": `${this.item.height}`,
        },
      },
      spec: {
        displayName: `${this.item.name}`,
        groupName: `${this.item.groupName || ""}`,
        ownerName: `${this.ownerName}`,
        policyName: `${this.policyName}`,
        mediaType: `${this.item.mediaType || ""}`,
        size: Number.parseInt(`${this.item.size}`),
        tags: this.item.tags,
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
          "s3os.plugin.halo.run/object-key": `${this.item.fileKey}`,
          "storage.halo.run/external-link": `${this.item.path}`,
          "storage.halo.run/suffix": `${this.item.suffix}`,
          "storage.halo.run/width": `${this.item.width}`,
          "storage.halo.run/height": `${this.item.height}`,
        },
      },
      spec: {
        displayName: `${this.item.name}`,
        groupName: `${this.item.groupName || ""}`,
        ownerName: `${this.ownerName}`,
        policyName: `${this.policyName}`,
        mediaType: `${this.item.mediaType || ""}`,
        size: Number.parseInt(`${this.item.size}`),
        tags: this.item.tags,
      },
    };
  }
}

export function useMigrateTask(data: MigrateData): useMigrateTaskReturn {
  const createTagTasks = () => {
    const tags = data.tags || [];
    return tags.map((tag) => new TagTask(tag));
  };

  const createCategoryTasks = () => {
    const categories = data.categories || [];
    return categories.map((category) => new CategoryTask(category));
  };

  const createPostTasks = () => {
    const posts = data.posts || [];
    const postTasks: PostTask[] = [];
    const postCounterTasks: CounterTask[] = [];
    posts.forEach((post) => {
      postTasks.push(new PostTask(post));
      if (post.counter) {
        postCounterTasks.push(
          new CounterTask(
            post.counter,
            `posts.content.halo.run/${post.postRequest.post.metadata.name}`
          )
        );
      }
    });
    return [...postTasks, ...postCounterTasks];
  };

  const createSinglePageTasks = () => {
    const pages = data.pages || [];
    const pageTasks: SinglePageTask[] = [];
    const pageCounterTasks: CounterTask[] = [];
    pages.forEach((page) => {
      pageTasks.push(new SinglePageTask(page));
      if (page.counter) {
        pageCounterTasks.push(
          new CounterTask(
            page.counter,
            `singlepages.content.halo.run/${page.singlePageRequest.page.metadata.name}`
          )
        );
      }
    });
    return [...pageTasks, ...pageCounterTasks];
  };

  const createCommentAndReplyTasks = () => {
    const comments = data.comments || [];
    const commentTask: (CommentTask | ReplyTask)[] = [];

    comments.forEach((comment: MigrateComment | MigrateReply) => {
      if (comment instanceof Comment) {
        commentTask.push(new CommentTask(comment as MigrateComment));
      } else {
        commentTask.push(new ReplyTask(comment as MigrateReply));
      }
    });
    return commentTask;
  };

  const createMenuTasks = () => {
    const menus = data.menuItems || [];
    const groupedMenus = groupBy(menus, "groupId");
    const menuTask: MenuTask[] = [];
    Object.keys(groupedMenus).forEach((key) => {
      const itemNames = groupedMenus[key].map(
        (item) => item.menu.metadata.name
      );
      const menuName = groupedMenus[key][0].groupName || key;
      menuTask.push(new MenuTask(key, menuName, itemNames));
    });

    const menuItemTasks: MenuItemTask[] = [];
    menus.forEach((item) => {
      menuItemTasks.push(new MenuItemTask(item));
    });
    return [...menuTask, ...menuItemTasks];
  };

  const createMomentTasks = () => {
    const moments = data.moments || [];
    return moments.map((moment) => new MomentTask(moment));
  };

  const createPhotoTasks = () => {
    const photos = data.photos || [];
    const groupedPhotos = groupBy(photos, "spec.groupName");
    const photoGroupTasks: PhotoGroupTask[] = [];
    Object.keys(groupedPhotos).forEach((key) => {
      photoGroupTasks.push(new PhotoGroupTask(key));
    });

    const photoTasks: PhotoTask[] = [];
    photos.forEach((item) => {
      photoTasks.push(new PhotoTask(item));
    });
    return [...photoGroupTasks, ...photoTasks];
  };

  const createLinkTasks = () => {
    const links = data.links || [];
    const groupedLinks = groupBy(links, "spec.groupName");
    const linkGroupTasks: LinkGroupTask[] = [];
    Object.keys(groupedLinks).forEach((key) => {
      linkGroupTasks.push(new LinkGroupTask(key));
    });

    const linkTasks: LinkTask[] = [];
    links.forEach((item) => {
      linkTasks.push(new LinkTask(item));
    });
    return [...linkGroupTasks, ...linkTasks];
  };

  function createAttachmentTasks(
    relativePathFolder: string,
    user?: User,
    typeToPolicyMap?: Map<string, string>
  ) {
    const attachments = data.attachments || [];
    if (!user || !typeToPolicyMap || typeToPolicyMap.size === 0) {
      return [];
    }
    const typeGroupAttachments = groupBy(attachments, "type");

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
                  userName,
                  relativePathFolder
                );
              case "ALIOSS":
              case "BAIDUBOS":
              case "TENCENTCOS":
              case "QINIUOSS":
              case "UPOSS":
                return new S3OSSAttachmentTask(
                  item,
                  typeToPolicyMap.get(item.type) || "default-policy",
                  userName,
                  relativePathFolder
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
    createCommentAndReplyTasks,
    createMenuTasks,
    createMomentTasks,
    createPhotoTasks,
    createLinkTasks,
    createAttachmentTasks,
  };
}
