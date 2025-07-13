import type {
  MigrateAttachment,
  MigrateCategory,
  MigrateComment,
  MigrateData,
  MigratePost,
  MigrateReply,
  MigrateSinglePage,
  MigrateTag
} from '@/types'
import {
  type Attachment,
  phpUnserialize,
  type TypechoComment,
  type TypechoContent,
  TypechoDataParser,
  type TypechoMeta,
  type TypechoRelationship
} from './typecho-data-parser'
import markdownit from 'markdown-it'
import MarkdownItIdPlugin from '@/modules/hugo/markdown-it-id'
import { consoleApiClient } from '@halo-dev/api-client'

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
        if (buffer) {
          try {
            const parser = new TypechoDataParser(buffer)
            const backupData = parser.parse()
            resolve({
              posts: parsePosts(backupData.contents, backupData.relationships, backupData.metas),
              pages: parsePages(backupData.contents),
              comments: parseComments(backupData.contents, backupData.comments),
              tags: parseTags(backupData.metas),
              categories: parseCategories(backupData.metas),
              attachments: parseAttachments(backupData.contents)
            } as MigrateData)
          } catch (error) {
            console.error('解析失败:', error)
          }
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
            }
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
            }
          }
        }) ?? []
    )
  }

  const parseComments = (
    contents?: TypechoContent[],
    comments?: TypechoComment[]
  ): (MigrateComment | MigrateReply)[] => {
    const data: (MigrateComment | MigrateReply)[] = []
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
      const content = contents?.find((c) => c.cid === comment.cid)
      if (!content) {
        break
      }
      const refType = content?.type == 'post' ? 'Post' : 'SinglePage'
      if (comment.parent === '0') {
        data.push(createComment(comment, content, refType))
      } else {
        const rootComment = findRootComment(comment)
        data.push(createReply(comment, refType, `comment-${rootComment.coid}`))
      }
    }
    return data
  }

  const parseAttachments = (contents?: TypechoContent[]): MigrateAttachment[] => {
    return (
      contents
        ?.filter((content) => content.type === 'attachment')
        .map((content) => {
          const img = phpUnserialize(content.text) as unknown as Attachment
          return {
            id: `attachment-${content.cid}`,
            name: img.name,
            path: img.path,
            type: 'LOCAL',
            height: 0,
            width: 0,
            mediaType: img.mime,
            size: img.size
          }
        }) ?? []
    )
  }

  const createComment = (
    comment: TypechoComment,
    content: TypechoContent,
    refType: 'Post' | 'SinglePage'
  ): MigrateComment => {
    return {
      refType: refType,
      kind: 'Comment',
      apiVersion: 'content.halo.run/v1alpha1',
      spec: {
        raw: comment.text,
        content: comment.text,
        owner: {
          kind: 'Email',
          name: comment.mail,
          displayName: comment.author,
          annotations: {
            website: comment.url || ''
          }
        },
        ipAddress: comment.ip,
        priority: 0,
        top: false,
        allowNotification: true,
        approved: comment.status === 'approved',
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
      }
    }
  }

  const createReply = (
    reply: TypechoComment,
    refType: 'Post' | 'SinglePage',
    commentName: string
  ): MigrateReply => {
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
        owner: {
          kind: 'Email',
          name: reply.mail,
          displayName: reply.author,
          annotations: {
            website: reply.url || ''
          }
        },
        ipAddress: reply.ip,
        priority: 0,
        top: false,
        allowNotification: true,
        approved: reply.status === 'approved',
        creationTime: new Date(Number(reply.created) * 1000).toISOString(),
        hidden: false,
        commentName: commentName,
        quoteReply: `comment-${reply.parent}`
      },
      status: {}
    }
  }

  return {
    parse
  }
}

export async function uploadAttachment(name: string, url: string) {
  return await consoleApiClient.storage.attachment.externalTransferAttachment({
    uploadFromUrlRequest: {
      filename: name,
      policyName: 'default-policy',
      url: url
    }
  })
}
