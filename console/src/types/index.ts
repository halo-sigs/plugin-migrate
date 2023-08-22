import type {
  Category,
  Comment,
  Reply,
  MenuItem,
  Metadata,
  PostRequest,
  SinglePageRequest,
  Tag,
} from "@halo-dev/api-client";
import type { Component } from "vue";

export interface MigrationOption {
  attachmentFolderPath?: string;
}

export interface Provider {
  name: string;
  icon: string;
  description: string;
  importComponent?: string | Component;
  options?: MigrationOption;
}

export interface MigrateDataParser {
  files: FileList;
  // 将读取到的文件，根据不同的类型，执行不同的解析方法
  parse: () => Promise<MigrateData>;
}

export interface MigrateData {
  tags?: MigrateTag[];

  categories?: MigrateCategory[];

  posts?: MigratePost[];

  pages?: MigrateSinglePage[];

  comments?: (MigrateComment | MigrateReply)[];

  menuItems?: MigrateMenu[];

  moments?: MigrateMoment[];

  photos?: MigratePhoto[];

  links?: MigrateLink[];

  attachments?: MigrateAttachment[];
}

export interface MigrateTag extends Tag {}

export interface MigrateCategory extends Category {}

export interface Counter {
  upvote?: number;
  visit?: number;
  downvote?: number;
  approvedComment?: number;
}

export interface MigratePost {
  postRequest: PostRequest;
  counter?: Counter;
}

export interface MigrateSinglePage {
  singlePageRequest: SinglePageRequest;
  counter?: Counter;
}

export interface MigrateComment extends Comment {
  refType: "Post" | "SinglePage" | "Moment";
}

export interface MigrateReply extends Reply {
  refType: "Post" | "SinglePage" | "Moment";
}

export interface MigrateAttachment {
  id: number | string;
  name: string;
  path: string;
  groupName?: string;
  fileKey?: string;
  thumbPath?: string;
  mediaType?: string;
  suffix?: string;
  width?: number;
  height?: number;
  size?: number;
  tags?: string[];
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
  createTime?: number;
  updateTime?: number;
}

export interface MigrateMenu {
  menu: MenuItem;
  groupName?: string;
  groupId: string | number | "default";
}

export interface MigrateMoment {
  metadata: Metadata;
  kind: string;
  apiVersion: string;
  spec: MomentSpec;
}

export interface MomentSpec {
  content: MomentContent;
  releaseTime?: string;
  visible?: "PUBLIC" | "PRIVATE";
  owner?: string;
  tags?: string[];
}

export interface MomentContent {
  raw: string;
  html: string;
  medium?: MomentMedia[];
}

export interface MomentMedia {
  type: "PHOTO" | "VIDEO" | "POST";
  url: string;
  originType: string;
}

export interface MigratePhoto {
  spec: PhotoSpec;
  apiVersion: string;
  kind: string;
  metadata: Metadata;
}

export interface PhotoSpec {
  displayName: string;
  description?: string;
  url: string;
  cover?: string;
  priority?: number;
  groupName: string;
}

export interface MigrateLink {
  spec: LinkSpec;
  apiVersion: string;
  kind: string;
  metadata: Metadata;
}

export interface LinkSpec {
  url: string;
  displayName: string;
  logo?: string;
  description?: string;
  priority?: number;
  groupName?: string;
}
