import MarkdownItIdPlugin from '@/modules/hugo/markdown-it-id'
import type {
  MigrateAttachment,
  MigrateCategory,
  MigrateComment,
  MigrateData,
  MigratePost,
  MigrateReply,
  MigrateSinglePage,
  MigrateSourceUser,
  MigrateTag
} from '@/types'
import { createEmailCommentOwner, createSourceUserId } from '@/utils/migrate-user'
import markdownit from 'markdown-it'
import {
  type Attachment,
  phpUnserialize,
  type TypechoComment,
  type TypechoContent,
  TypechoDataParser,
  type TypechoMeta,
  type TypechoRelationship,
  type TypechoUser
} from './typecho-data-parser'

interface useTypechoDataParserReturn {
  parse: () => Promise<MigrateData>
}

// 原始数据中posts、pages和attachments共用一张表,comments单独一张表,tags和categories共用一张表
// 为了防止metadata.name冲突, 因此各自添加一个前缀
export function useTypechoDataParser(file: File): useTypechoDataParserReturn {
  const parse = (): Promise<MigrateData> => {
    return new Promise<MigrateData>((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsArrayBuffer(file)
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer
        if (!buffer) {
          reject(new Error('未读取到有效的 Typecho 备份内容'))
          return
        }

        try {
          const parser = new TypechoDataParser(buffer)
          const backupData = parser.parse()
          resolve({
            users: parseUsers(backupData.users),
            posts: parsePosts(backupData.contents, backupData.relationships, backupData.metas),
            pages: parsePages(backupData.contents),
            comments: parseComments(backupData.contents, backupData.comments, backupData.users),
            tags: parseTags(backupData.metas),
            categories: parseCategories(backupData.metas),
            attachments: parseAttachments(backupData.contents)
          } as MigrateData)
        } catch (error) {
          console.error('解析失败:', error)
          reject(error)
        }
      }
      reader.onerror = () => {
        reject('Failed to fetch data')
      }
    })
  }

  const parsePosts = (
    contents?: TypechoContent[],
    relationships?: TypechoRelationship[],
    metas?: TypechoMeta[]
  ): MigratePost[] => {
    return (
      contents
        ?.filter((content) => content.type === 'post')
        .map((content) => {
          return {
            postRequest: {
              post: {
                spec: {
                  title: content.title,
                  slug: content.title,
                  deleted: false,
                  publish: content.status === 'publish',
                  publishTime: new Date(Number(content.created) * 1000).toISOString(),
                  pinned: false,
                  allowComment: content.allowComment === '1',
                  visible: content.status === 'publish' ? 'PUBLIC' : 'PRIVATE',
                  priority: 0,
                  excerpt: {
                    autoGenerate: true
                  },
                  categories: metas
                    ?.filter((meta) => meta.type === 'category')
                    ?.filter((meta) => {
                      return relationships?.some((relationship) => {
                        return relationship.cid === content.cid && relationship.mid === meta.mid
                      })
                    })
                    .map((meta) => `category-${meta.mid}`),
                  tags: metas
                    ?.filter((meta) => meta.type === 'tag')
                    ?.filter((meta) => {
                      return relationships?.some((relationship) => {
                        return relationship.cid === content.cid && relationship.mid === meta.mid
                      })
                    })
                    .map((meta) => `tag-${meta.mid}`)
                },
                apiVersion: 'content.halo.run/v1alpha1',
                kind: 'Post',
                metadata: {
                  name: `post-${content.cid}`
                }
              },
              content: {
                raw: content.text.replaceAll(/<!--.*?-->/g, ''),
                content: markdownit()
                  .use(MarkdownItIdPlugin)
                  .render(content.text.replaceAll(/<!--.*?-->/g, '')),
                rawType: 'markdown'
              }
            },
            ownerRef:
              content.authorId && content.authorId !== '0'
                ? { sourceId: createSourceUserId('typecho', content.authorId) }
                : undefined
          }
        }) ?? []
    )
  }

  const parseTags = (metas?: TypechoMeta[]): MigrateTag[] => {
    return (
      metas
        ?.filter((it) => it.type === 'tag')
        .map((it) => {
          return {
            metadata: {
              name: `tag-${it.mid}`
            },
            kind: 'Tag',
            apiVersion: 'content.halo.run/v1alpha1',
            spec: {
              displayName: it.name,
              slug: it.slug
            }
          }
        }) ?? []
    )
  }

  const parseCategories = (metas?: TypechoMeta[]): MigrateCategory[] => {
    return (
      metas
        ?.filter((it) => it.type === 'category')
        .map((it) => {
          const children = metas
            ?.filter((meta) => meta.parent === it.mid && meta.type === 'category')
            .map((item) => `category-${item.mid}`)
          return {
            metadata: {
              name: `category-${it.mid}`
            },
            kind: 'Category',
            apiVersion: 'content.halo.run/v1alpha1',
            spec: {
              displayName: it.name,
              slug: it.slug,
              priority: 0,
              description: '',
              children: children ?? []
            }
          }
        }) ?? []
    )
  }

  const parsePages = (contents?: TypechoContent[]): MigrateSinglePage[] => {
    return (
      contents
        ?.filter((content) => content.type === 'page')
        .map((content) => {
          return {
            singlePageRequest: {
              page: {
                spec: {
                  title: content.title,
                  slug: content.slug,
                  deleted: false,
                  publish: content.status === 'publish',
                  publishTime: new Date(Number(content.created) * 1000).toISOString(),
                  pinned: false,
                  allowComment: content.allowComment === '1',
                  visible: 'PUBLIC',
                  priority: 0,
                  excerpt: {
                    autoGenerate: true
                  }
                },
                apiVersion: 'content.halo.run/v1alpha1',
                kind: 'SinglePage',
                metadata: {
                  name: `page-${content.cid}`
                }
              },
              content: {
                raw: content.text.replaceAll(/<!--.*?-->/g, ''),
                content: markdownit()
                  .use(MarkdownItIdPlugin)
                  .render(content.text.replaceAll(/<!--.*?-->/g, '')),
                rawType: 'markdown'
              }
            },
            ownerRef:
              content.authorId && content.authorId !== '0'
                ? { sourceId: createSourceUserId('typecho', content.authorId) }
                : undefined
          }
        }) ?? []
    )
  }

  const parseUsers = (users?: TypechoUser[]): MigrateSourceUser[] => {
    return (
      users?.map((user) => ({
        id: createSourceUserId('typecho', user.uid),
        provider: 'typecho',
        displayName: user.screenName || user.name,
        email: user.mail,
        username: user.name,
        website: user.url || undefined,
        role: user.group
      })) ?? []
    )
  }

  const parseComments = (
    contents?: TypechoContent[],
    comments?: TypechoComment[],
    users?: TypechoUser[]
  ): (MigrateComment | MigrateReply)[] => {
    const data: (MigrateComment | MigrateReply)[] = []
    const userMap = createTypechoUserMap(users)
    const contentMap = createTypechoContentMap(contents)
    const findRootComment = (comment: TypechoComment): TypechoComment => {
      if (comment.parent === '0') {
        return comment
      }
      const parentComment = comments?.find((c) => c.coid === comment.parent)
      if (parentComment) {
        return findRootComment(parentComment)
      }
      return comment
    }
    for (const comment of comments ?? []) {
      const content = contentMap.get(comment.cid)
      if (!content) {
        continue
      }
      const refType = content.type == 'post' ? 'Post' : 'SinglePage'
      if (comment.parent === '0') {
        data.push(createComment(comment, content, refType, userMap))
      } else {
        const rootComment = findRootComment(comment)
        data.push(createReply(comment, refType, `comment-${rootComment.coid}`, userMap))
      }
    }
    return data
  }

  const parseAttachments = (contents?: TypechoContent[]): MigrateAttachment[] => {
    return (
      contents
        ?.filter((content) => content.type === 'attachment')
        .map((content) => {
          const attachment = parseTypechoAttachment(content.text)
          return {
            id: `attachment-${content.cid}`,
            name: attachment.name || content.title || `attachment-${content.cid}`,
            path: normalizeTypechoAttachmentPath(attachment.path),
            type: 'LOCAL',
            height: 0,
            width: 0,
            mediaType: attachment.mime,
            size: attachment.size
          }
        }) ?? []
    )
  }

  const createComment = (
    comment: TypechoComment,
    content: TypechoContent,
    refType: 'Post' | 'SinglePage',
    userMap: Map<string, TypechoUser>
  ): MigrateComment => {
    const ownerRef = createTypechoCommentOwnerRef(comment, userMap)
    return {
      refType: refType,
      kind: 'Comment',
      apiVersion: 'content.halo.run/v1alpha1',
      spec: {
        raw: comment.text,
        content: comment.text,
        owner: createCommentOwner(comment, userMap),
        ipAddress: comment.ip,
        userAgent: comment.agent,
        priority: 0,
        top: false,
        allowNotification: true,
        approved: comment.status === 'approved',
        approvedTime: new Date(Number(comment.created) * 1000).toISOString(),
        creationTime: new Date(Number(comment.created) * 1000).toISOString(),
        hidden: false,
        subjectRef: {
          kind: content.type == 'post' ? 'Post' : 'SinglePage',
          group: 'content.halo.run',
          version: 'v1alpha1',
          name: `${content.type}-${content.cid}`
        }
      },
      metadata: {
        name: `comment-${comment.coid}`
      },
      ownerRef
    } satisfies MigrateComment
  }

  const createReply = (
    reply: TypechoComment,
    refType: 'Post' | 'SinglePage',
    commentName: string,
    userMap: Map<string, TypechoUser>
  ): MigrateReply => {
    const ownerRef = createTypechoCommentOwnerRef(reply, userMap)
    return {
      refType: refType,
      kind: 'Reply',
      apiVersion: 'content.halo.run/v1alpha1',
      metadata: {
        name: `comment-${reply.coid}`
      },
      spec: {
        raw: reply.text,
        content: reply.text,
        owner: createCommentOwner(reply, userMap),
        ipAddress: reply.ip,
        userAgent: reply.agent,
        priority: 0,
        top: false,
        allowNotification: true,
        approved: reply.status === 'approved',
        approvedTime: new Date(Number(reply.created) * 1000).toISOString(),
        creationTime: new Date(Number(reply.created) * 1000).toISOString(),
        hidden: false,
        commentName: commentName,
        quoteReply: `comment-${reply.parent}`
      },
      status: {},
      ownerRef
    } satisfies MigrateReply
  }

  return {
    parse
  }
}

function parseTypechoAttachment(raw: string): Attachment {
  const normalized = raw.trim()

  if (!normalized) {
    throw new Error('附件元数据为空')
  }

  if (normalized.startsWith('{')) {
    const parsed = JSON.parse(normalized) as Partial<Attachment>
    return normalizeTypechoAttachment(parsed)
  }

  if (normalized.startsWith('a:')) {
    const parsed = phpUnserialize(normalized) as unknown as Partial<Attachment>
    return normalizeTypechoAttachment(parsed)
  }

  throw new Error('不支持的 Typecho 附件元数据格式')
}

function normalizeTypechoAttachment(attachment: Partial<Attachment>): Attachment {
  if (!attachment.path) {
    throw new Error('附件元数据缺少 path 字段')
  }

  return {
    name: attachment.name || attachment.path.split('/').pop() || 'attachment',
    path: attachment.path,
    size: Number(attachment.size || 0),
    type: attachment.type || '',
    mime: attachment.mime || 'application/octet-stream'
  }
}

function normalizeTypechoAttachmentPath(path: string) {
  return path.trim().replace(/^\/+/, '')
}

function createTypechoUserMap(users?: TypechoUser[]) {
  return (users || []).reduce((map, user) => {
    map.set(user.uid, user)
    return map
  }, new Map<string, TypechoUser>())
}

function createTypechoContentMap(contents?: TypechoContent[]) {
  return (contents || []).reduce((map, content) => {
    map.set(content.cid, content)
    return map
  }, new Map<string, TypechoContent>())
}

function getTypechoCommentAuthorUser(comment: TypechoComment, userMap: Map<string, TypechoUser>) {
  if (!comment.authorId || comment.authorId === '0') {
    return undefined
  }

  return userMap.get(comment.authorId)
}

function createTypechoCommentOwnerRef(
  comment: TypechoComment,
  userMap: Map<string, TypechoUser>
): MigrateComment['ownerRef'] {
  const sourceUser = getTypechoCommentAuthorUser(comment, userMap)

  if (!sourceUser) {
    return undefined
  }

  return {
    sourceId: createSourceUserId('typecho', sourceUser.uid)
  }
}

function createCommentOwner(
  comment: TypechoComment,
  userMap: Map<string, TypechoUser>
): MigrateComment['spec']['owner'] {
  const sourceUser = getTypechoCommentAuthorUser(comment, userMap)

  return createEmailCommentOwner({
    email: comment.mail || sourceUser?.mail,
    displayName: comment.author || sourceUser?.screenName || sourceUser?.name,
    website: comment.url || sourceUser?.url,
    sourceId: sourceUser ? createSourceUserId('typecho', sourceUser.uid) : undefined
  })
}
