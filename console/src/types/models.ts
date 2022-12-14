export interface Post {
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

export interface Sheet {
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

export interface Tag {
  createTime: number;
  updateTime: number;
  id: number;
  name: string;
  slug: string;
  color?: string;
  thumbnail?: string;
}

export interface Category {
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

export interface Content {
  createTime: number;
  updateTime: number;
  id: number;
  status: string;
  patchLogId: number;
  headPatchLogId: number;
  content?: string;
  originalContent?: string;
}

export interface PostTag {
  createTime: number;
  updateTime: number;
  id: number;
  postId: number;
  tagId: number;
}

export interface PostCategory {
  createTime: number;
  updateTime: number;
  id: number;
  categoryId: number;
  postId: number;
}

export interface Comment {
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

export interface Menu {
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

export interface Meta {
  createTime: number;
  updateTime: number;
  id: number;
  postId: number;
  key: string;
  value: string;
}
