import type {
  Category,
  Comment,
  MenuItem,
  Metadata,
  PostRequest,
  Reply,
  SinglePageRequest,
  Tag
} from '@halo-dev/api-client'
import type { AxiosResponse } from 'axios'
import type { Component } from 'vue'

export interface MigrationOption {
  attachmentFolderPath?: string
  attachmentHandlerDescriptions?: AttachmentHandlerDescriptions
  localAttachmentStrategies?: LocalAttachmentStrategy[]
}

export interface Provider {
  name: string
  icon: string
  description: string
  importComponent?: string | Component
  options?: MigrationOption
}

export type LocalAttachmentStrategy = 'upload' | 'manual'

export type AttachmentPolicyConfig = Partial<Record<AttachmentType, string>>

export interface AttachmentHandlerDescriptions {
  localUploadTitle?: string
  localUploadDescription?: string
  localUploadHint?: string
  localManualTitle?: string
  localManualDescription?: string
  localManualHint?: string
}

export interface MigrateDataParser {
  files: FileList
  // 将读取到的文件，根据不同的类型，执行不同的解析方法
  parse: () => Promise<MigrateData>
}

export interface MigrateData {
  sourceProvider?: string

  tags?: MigrateTag[]

  categories?: MigrateCategory[]

  users?: MigrateSourceUser[]

  posts?: MigratePost[]

  pages?: MigrateSinglePage[]

  comments?: (MigrateComment | MigrateReply)[]

  menuItems?: MigrateMenu[]

  moments?: MigrateMoment[]

  photos?: MigratePhoto[]

  links?: MigrateLink[]

  attachments?: MigrateAttachment[]
}

export interface MigrateTag extends Tag {}

export interface MigrateCategory extends Category {}

export interface Counter {
  upvote?: number
  visit?: number
  downvote?: number
  approvedComment?: number
}

export interface MigrateSourceUser {
  id: string
  provider: string
  displayName: string
  email?: string
  username?: string
  slug?: string
  avatar?: string
  bio?: string
  website?: string
  role?: string
}

export interface MigrateUserRef {
  sourceId: string
}

export interface MigratePost {
  postRequest: PostRequest
  counter?: Counter
  ownerRef?: MigrateUserRef
}

export interface MigrateSinglePage {
  singlePageRequest: SinglePageRequest
  counter?: Counter
  ownerRef?: MigrateUserRef
}

export interface MigrateComment extends Comment {
  kind: 'Comment'
  refType: 'Post' | 'SinglePage' | 'Moment'
  ownerRef?: MigrateUserRef
}

export interface MigrateReply extends Reply {
  kind: 'Reply'
  refType: 'Post' | 'SinglePage' | 'Moment'
  ownerRef?: MigrateUserRef
}

export type AttachmentType =
  | 'LOCAL'
  | 'UPOSS'
  | 'QINIUOSS'
  | 'SMMS'
  | 'ALIOSS'
  | 'BAIDUBOS'
  | 'TENCENTCOS'
  | 'HUAWEIOBS'
  | 'MINIO'

export interface MigrateAttachment {
  id: number | string
  name: string
  path: string
  url?: string
  groupName?: string
  fileKey?: string
  thumbPath?: string
  mediaType?: string
  suffix?: string
  width?: number
  height?: number
  size?: number
  tags?: string[]
  type: AttachmentType
  createTime?: number
  updateTime?: number
}

export interface MigrateMenu {
  menu: MenuItem
  groupName?: string
  groupId: string | number | 'default'
}

export interface MigrateMoment {
  metadata: Metadata
  kind: string
  apiVersion: string
  spec: MomentSpec
}

export interface MomentSpec {
  content: MomentContent
  releaseTime?: string
  visible?: 'PUBLIC' | 'PRIVATE'
  owner?: string
  tags?: string[]
}

export interface MomentContent {
  raw: string
  html: string
  medium?: MomentMedia[]
}

export interface MomentMedia {
  type: 'PHOTO' | 'VIDEO' | 'POST'
  url: string
  originType: string
}

export interface MigratePhoto {
  spec: PhotoSpec
  apiVersion: string
  kind: string
  metadata: Metadata
}

export interface PhotoSpec {
  displayName: string
  description?: string
  url: string
  cover?: string
  priority?: number
  groupName: string
}

export interface MigrateLink {
  spec: LinkSpec
  apiVersion: string
  kind: string
  metadata: Metadata
}

export interface LinkSpec {
  url: string
  displayName: string
  logo?: string
  description?: string
  priority?: number
  groupName?: string
}

export type MigrateTaskState = 'pending' | 'running' | 'success' | 'failed'

export interface MigrateTaskItem<T = any> {
  id: string
  type: string
  label: string
  item: T
  status: MigrateTaskState
  error?: string
  run: () => Promise<AxiosResponse<any, any>>
  retry: () => void
}

export interface MigrateTaskGroup {
  key: string
  label: string
  tasks: MigrateTaskItem<any>[]
}

export interface AttachmentPreparationResult {
  data: MigrateData
  attachmentPolicies: AttachmentPolicyConfig
  selectedFolderFiles: FileList | null
  localStrategy: LocalAttachmentStrategy | null
}

export interface AttachmentHandlerExpose {
  canConfirm: () => boolean
  getPreparationResult: () => AttachmentPreparationResult
}

export interface ProviderParserExpose {
  reset: () => void
}
