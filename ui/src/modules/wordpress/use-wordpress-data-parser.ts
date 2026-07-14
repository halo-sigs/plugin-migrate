import type {
  MigrateAttachment,
  MigrateCategory,
  MigrateComment,
  MigrateData,
  MigrateMenu,
  MigratePost,
  MigrateReply,
  MigrateSinglePage,
  MigrateSourceUser
} from '@/types'
import { createEmailCommentOwner, createSourceUserId } from '@/utils/migrate-user'
import type { Ref } from '@halo-dev/api-client'
import { XMLParser } from 'fast-xml-parser'

interface useWordPressDataParserReturn {
  parse: () => Promise<MigrateData>
}

const ATTACHMENT_PATH_PREFIX = 'wp-content/uploads/'
const EMPTY_COMMENT_CONTENT = '<!-- No Content -->'

function normalizeWordPressCommentContent(content: unknown): string {
  return String(content ?? '') || EMPTY_COMMENT_CONTENT
}

export function useWordPressDataParser(file: File): useWordPressDataParserReturn {
  const menuChildrenMap = new Map<string, string[]>()

  const parse = (): Promise<MigrateData> => {
    return new Promise<MigrateData>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const xmlData = event.target?.result as string
        const isArrayPath = [
          'rss.channel.item',
          'rss.channel.wp:term',
          'rss.channel.wp:category',
          'rss.channel.wp:tag',
          'rss.channel.item.category',
          'rss.channel.item.wp:postmeta',
          'rss.channel.item.wp:comment'
        ]

        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '_',
          textNodeName: 'value',
          isArray: (_, jPath) => {
            return isArrayPath.includes(jPath)
          }
        })

        try {
          const result = parser.parse(xmlData, true)
          const channel = result.rss.channel as Channel
          const rawAuthors = ensureArray(channel['wp:author'])

          const {
            ['wp:tag']: rawTags,
            ['wp:category']: rawCategories,
            ['wp:term']: rawTerms
          } = channel || {}

          // 校验 wxr 版本 result.rss.channel["wp:wxr_version"]
          // 解析 item 数据，获取文章、页面、附件
          const { posts, pages, attachments, navMenuItems } = itemClassification(channel.item)
          const attachmentResolver = createWordPressAttachmentResolver(attachments)
          const menuItems = parseMenuItems(rawTerms, navMenuItems)
          menuItems.map((item) => {
            if (menuChildrenMap.has(item.menu.metadata.name)) {
              item.menu.spec.children = menuChildrenMap.get(item.menu.metadata.name) as string[]
            }
          })

          const supportedCommentItems = [...posts, ...pages]

          resolve({
            users: parseUsers(rawAuthors),
            posts: parsePosts(posts, rawTags, rawCategories, attachmentResolver, rawAuthors),
            pages: parsePages(pages, attachmentResolver, rawAuthors),
            comments: parseComments(supportedCommentItems, rawAuthors),
            tags: parseTags(rawTags),
            categories: parseCategories(rawCategories),
            // 菜单
            menuItems: menuItems,
            // 附件
            attachments: parseAttachments(attachments, attachmentResolver)
          } as MigrateData)
        } catch (error) {
          reject('Failed to parse data. error -> ' + error)
        }
      }
      reader.onerror = () => {
        reject('Failed to fetch data')
      }
      reader.readAsText(file)
    })
  }

  const itemClassification = (items: Item[]) => {
    const posts: Item[] = []
    const pages: Item[] = []
    const attachments: Item[] = []
    const navMenuItems: Item[] = []
    const others: Item[] = []
    items?.forEach((item) => {
      switch (item['wp:post_type']) {
        case 'post':
          posts.push(item)
          break
        case 'page':
          pages.push(item)
          break
        case 'attachment':
          attachments.push(item)
          break
        case 'nav_menu_item':
          navMenuItems.push(item)
          break
        default:
          others.push(item)
          break
      }
    })
    return { posts, pages, attachments, navMenuItems, others }
  }

  const parsePosts = (
    posts: Item[],
    tags: Tag[],
    categories: Category[],
    attachmentResolver: WordPressAttachmentResolver,
    authors: Author[]
  ): MigratePost[] => {
    const authorByLogin = createWordPressAuthorByLoginMap(authors)

    return posts?.map((post: Item) => {
      const cleanedHtml = sanitizeWordPressHtml(post['content:encoded'], attachmentResolver)
      const publish =
        post['wp:status'] === 'publish' ||
        post['wp:postmeta']?.find((meta) => meta['wp:meta_key'] === '_wp_trash_meta_status')?.[
          'wp:meta_value'
        ] === 'publish'
      const postCategorySlugs = post.category
        ?.filter((category) => {
          return category._domain === 'category'
        })
        .map((category) => {
          return category._nicename
        })

      const postTagSlugs = post.category
        ?.filter((category) => {
          return category._domain === 'post_tag'
        })
        .map((category) => {
          return category._nicename
        })

      const tagIds = tags
        ?.filter((tag: Tag) => {
          return postTagSlugs?.includes(tag['wp:tag_slug'])
        })
        .map((tag: Tag) => tag['wp:term_id'] + '')

      const categoryIds = categories
        ?.filter((category: Category) => {
          return postCategorySlugs?.includes(category['wp:category_nicename'])
        })
        .map((category: Category) => category['wp:term_id'] + '')

      const thumbnail = resolveFeaturedImageUrl(post, attachmentResolver)

      const excerpt = post['excerpt:encoded']

      return {
        postRequest: {
          post: {
            spec: {
              title: post.title || '未命名标题',
              slug: post['wp:post_name'] ? decodeURIComponent(post['wp:post_name']) : post.title,
              deleted: post['wp:status'] === 'trash',
              publish: publish,
              publishTime: new Date(post['wp:post_date']).toISOString(),
              pinned: post['wp:is_sticky'] > 0,
              allowComment: post['wp:comment_status'] === 'open',
              visible: 'PUBLIC',
              priority: 0,
              excerpt: {
                autoGenerate: !excerpt,
                raw: excerpt
              },
              categories: categoryIds,
              tags: tagIds,
              htmlMetas: [],
              cover: thumbnail
            },
            apiVersion: 'content.halo.run/v1alpha1',
            kind: 'Post',
            metadata: {
              name: post['wp:post_id'] + ''
            }
          },
          content: {
            raw: cleanedHtml,
            content: cleanedHtml,
            rawType: 'HTML'
          }
        },
        ownerRef: resolveWordPressOwnerRef(post, authorByLogin)
      }
    })
  }

  const parsePages = (
    pages: Item[],
    attachmentResolver: WordPressAttachmentResolver,
    authors: Author[]
  ): MigrateSinglePage[] => {
    const authorByLogin = createWordPressAuthorByLoginMap(authors)

    return pages?.map((page: Item) => {
      const cleanedHtml = sanitizeWordPressHtml(page['content:encoded'], attachmentResolver)
      const publish =
        page['wp:status'] === 'publish' ||
        page['wp:postmeta']?.find((meta) => meta['wp:meta_key'] === '_wp_trash_meta_status')?.[
          'wp:meta_value'
        ] === 'publish'
      return {
        singlePageRequest: {
          page: {
            spec: {
              title: page.title,
              slug: page['wp:post_name'] ? decodeURIComponent(page['wp:post_name']) : page.title,
              deleted: page['wp:status'] === 'trash',
              publish: publish,
              publishTime: new Date(page['wp:post_date']).toISOString(),
              pinned: page['wp:is_sticky'] > 0,
              allowComment: page['wp:comment_status'] === 'open',
              visible: 'PUBLIC',
              priority: 0,
              cover: resolveFeaturedImageUrl(page, attachmentResolver),
              excerpt: {
                autoGenerate: false,
                raw: page['excerpt:encoded']
              },
              htmlMetas: []
            },
            apiVersion: 'content.halo.run/v1alpha1',
            kind: 'SinglePage',
            metadata: {
              name: page['wp:post_id'] + ''
            }
          },
          content: {
            raw: cleanedHtml,
            content: cleanedHtml,
            rawType: 'HTML'
          }
        },
        ownerRef: resolveWordPressOwnerRef(page, authorByLogin)
      }
    })
  }

  const parseComments = (items: Item[], authors: Author[]): (MigrateComment | MigrateReply)[] => {
    const comments: (MigrateComment | MigrateReply)[] = []
    const authorById = createWordPressAuthorByIdMap(authors)
    items?.forEach((item) => {
      const refType = item['wp:post_type'] == 'post' ? 'Post' : 'SinglePage'
      const commentById = createWordPressCommentMap(item['wp:comment'])
      item['wp:comment']?.forEach((comment) => {
        const replyTarget = resolveWordPressReplyTarget(comment, commentById)
        if (!replyTarget) {
          comments.push(createComment(comment, item, refType, authorById))
        } else {
          comments.push(createReply(comment, refType, replyTarget, authorById))
        }
      })
    })
    return comments
  }

  const createComment = (
    comment: Comment,
    item: Item,
    refType: 'Post' | 'SinglePage',
    authorById: Map<number, Author>
  ): MigrateComment => {
    const fallbackAuthor = authorById.get(comment['wp:comment_user_id'])
    const content = normalizeWordPressCommentContent(comment['wp:comment_content'])
    return {
      refType: refType,
      kind: 'Comment',
      apiVersion: 'content.halo.run/v1alpha1',
      spec: {
        raw: content,
        content,
        owner: createEmailCommentOwner({
          email: comment['wp:comment_author_email'] || fallbackAuthor?.['wp:author_email'],
          displayName: comment['wp:comment_author'] || fallbackAuthor?.['wp:author_display_name'],
          website: comment['wp:comment_author_url'],
          sourceId:
            comment['wp:comment_user_id'] > 0
              ? createSourceUserId('wordpress', comment['wp:comment_user_id'])
              : undefined
        }),
        ipAddress: comment['wp:comment_author_IP'],
        priority: 0,
        top: false,
        allowNotification: true,
        approved: comment['wp:comment_approved'] === 1,
        approvedTime: new Date(comment['wp:comment_date']).toISOString(),
        creationTime: new Date(comment['wp:comment_date']).toISOString(),
        hidden: false,
        subjectRef: {
          kind: item['wp:post_type'] == 'post' ? 'Post' : 'SinglePage',
          group: 'content.halo.run',
          version: 'v1alpha1',
          name: item['wp:post_id'] + ''
        },
        lastReadTime: undefined
      },
      metadata: {
        name: comment['wp:comment_id'] + ''
      },
      ownerRef:
        comment['wp:comment_user_id'] > 0
          ? { sourceId: createSourceUserId('wordpress', comment['wp:comment_user_id']) }
          : undefined
    }
  }

  const createReply = (
    reply: Comment,
    refType: 'Post' | 'SinglePage',
    replyTarget: { commentName: string; quoteReply?: string },
    authorById: Map<number, Author>
  ): MigrateReply => {
    const fallbackAuthor = authorById.get(reply['wp:comment_user_id'])
    const content = normalizeWordPressCommentContent(reply['wp:comment_content'])
    return {
      refType: refType,
      kind: 'Reply',
      apiVersion: 'content.halo.run/v1alpha1',
      metadata: {
        name: reply['wp:comment_id'] + ''
      },
      spec: {
        raw: content,
        content,
        owner: createEmailCommentOwner({
          email: reply['wp:comment_author_email'] || fallbackAuthor?.['wp:author_email'],
          displayName: reply['wp:comment_author'] || fallbackAuthor?.['wp:author_display_name'],
          website: reply['wp:comment_author_url'],
          sourceId:
            reply['wp:comment_user_id'] > 0
              ? createSourceUserId('wordpress', reply['wp:comment_user_id'])
              : undefined
        }),
        ipAddress: reply['wp:comment_author_IP'],
        priority: 0,
        top: false,
        allowNotification: true,
        approved: reply['wp:comment_approved'] === 1,
        approvedTime: new Date(reply['wp:comment_date']).toISOString(),
        creationTime: new Date(reply['wp:comment_date']).toISOString(),
        hidden: false,
        commentName: replyTarget.commentName,
        ...(replyTarget.quoteReply ? { quoteReply: replyTarget.quoteReply } : {})
      },
      status: {},
      ownerRef:
        reply['wp:comment_user_id'] > 0
          ? { sourceId: createSourceUserId('wordpress', reply['wp:comment_user_id']) }
          : undefined
    }
  }

  const parseUsers = (authors: Author[]): MigrateSourceUser[] => {
    return authors?.map((author) => ({
      id: createSourceUserId('wordpress', author['wp:author_id']),
      provider: 'wordpress',
      displayName: author['wp:author_display_name'] || author['wp:author_login'],
      email: author['wp:author_email'],
      username: author['wp:author_login']
    }))
  }

  function createWordPressCommentMap(comments?: Comment[]) {
    return (comments || []).reduce((map, comment) => {
      map.set(String(comment['wp:comment_id']), comment)
      return map
    }, new Map<string, Comment>())
  }

  function resolveWordPressReplyTarget(
    comment: Comment,
    commentById: Map<string, Comment>
  ): { commentName: string; quoteReply?: string } | undefined {
    if (comment['wp:comment_parent'] === 0) {
      return undefined
    }

    const directParentName = String(comment['wp:comment_parent'])
    const directParent = commentById.get(directParentName)
    if (!directParent) {
      return undefined
    }

    let rootComment = directParent
    const visited = new Set<string>([String(comment['wp:comment_id'])])

    while (rootComment['wp:comment_parent'] !== 0) {
      const currentId = String(rootComment['wp:comment_id'])
      if (visited.has(currentId)) {
        return undefined
      }

      visited.add(currentId)
      const nextParent = commentById.get(String(rootComment['wp:comment_parent']))
      if (!nextParent) {
        break
      }

      rootComment = nextParent
    }

    const commentName = String(rootComment['wp:comment_id'])
    return {
      commentName,
      ...(directParentName !== commentName ? { quoteReply: directParentName } : {})
    }
  }

  const parseTags = (tags: Tag[]) => {
    return tags?.map((tag) => {
      return {
        metadata: {
          name: tag['wp:term_id'] + ''
        },
        kind: 'Tag',
        apiVersion: 'content.halo.run/v1alpha1',
        spec: {
          displayName: tag['wp:tag_name'] + '',
          slug: tag['wp:tag_slug'] ? decodeURIComponent(tag['wp:tag_slug']) : tag['wp:tag_name']
        }
      }
    })
  }

  const parseCategories = (categories: Category[]) => {
    return categories?.map((category) => {
      const children = categories
        .filter((item) => {
          return category['wp:category_nicename'] === item['wp:category_parent']
        })
        .map((item) => {
          return item['wp:term_id'] + ''
        })
      return {
        metadata: {
          name: category['wp:term_id'] + ''
        },
        kind: 'Category',
        apiVersion: 'content.halo.run/v1alpha1',
        spec: {
          displayName: category['wp:cat_name'] + '',
          slug: category['wp:category_nicename']
            ? decodeURIComponent(category['wp:category_nicename'])
            : category['wp:cat_name'],
          priority: 0,
          description: category['wp:category_description'],
          children: children || []
        }
      } as MigrateCategory
    })
  }

  const parseMenuItems = (terms: Term[], navMenuItems: Item[]): MigrateMenu[] | [] => {
    return (
      terms
        ?.filter((term) => {
          return term['wp:term_taxonomy'] === 'nav_menu'
        })
        .reduce((acc: Term[], term) => {
          const exists = acc.some(
            (existingTerm) => existingTerm['wp:term_id'] === term['wp:term_id']
          )
          if (!exists) {
            acc.push(term)
          }
          return acc
        }, [])
        .flatMap((term) => {
          return navMenuItems
            ?.map((item) => {
              const category = item.category?.find((category) => {
                return (
                  category._domain === 'nav_menu' && category._nicename === term['wp:term_name']
                )
              })

              if (!category) {
                return
              }

              const children: string[] = []
              const metas = item?.['wp:postmeta'] || []
              const targetRef: Ref = {
                name: ''
              }
              let href = ''
              metas.forEach((meta) => {
                switch (meta['wp:meta_key']) {
                  case '_menu_item_object':
                    targetRef.group = 'content.halo.run'
                    targetRef.name = item?.['wp:post_id'] + ''
                    targetRef.version = 'v1alpha1'
                    if (meta['wp:meta_value'] == 'page') {
                      targetRef.kind = 'SinglePage'
                    } else if (meta['wp:meta_value'] == 'post') {
                      targetRef.kind = 'Post'
                    } else if (meta['wp:meta_value'] == 'category') {
                      targetRef.kind = 'Category'
                    }
                    break
                  case '_menu_item_object_id':
                    href = meta['wp:meta_value']
                    break
                  case '_menu_item_url':
                    href = meta['wp:meta_value'] || href
                    break
                }
                if (meta['wp:meta_key'] === '_menu_item_menu_item_parent') {
                  let childrenNames = menuChildrenMap.get(meta['wp:meta_value'])
                  if (!childrenNames) {
                    childrenNames = new Array<string>()
                  }
                  childrenNames.push(item?.['wp:post_id'] + '')
                  menuChildrenMap.set(meta['wp:meta_value'], childrenNames)
                }
              })
              return {
                menu: {
                  kind: 'MenuItem',
                  apiVersion: 'v1alpha1',
                  metadata: {
                    name: item?.['wp:post_id'] + ''
                  },
                  spec: {
                    displayName: item?.title + '',
                    priority: Number(item?.['wp:menu_order']),
                    children: children,
                    href: !targetRef.kind ? href : undefined
                  }
                },
                groupId: term['wp:term_id'] + '',
                groupName: term['wp:term_name']
              } as MigrateMenu
            })
            .filter((item) => {
              return item != undefined
            }) as MigrateMenu[]
        }) || []
    )
  }

  const parseAttachments = (
    attachments: Item[],
    attachmentResolver: WordPressAttachmentResolver
  ) => {
    return attachments?.flatMap((attachment) => {
      let attachedFile = ''
      let metadata: AttachmentMetadata = {} as AttachmentMetadata
      attachment['wp:postmeta']?.forEach((meta) => {
        if (meta['wp:meta_key'] === '_wp_attached_file') {
          attachedFile = meta['wp:meta_value']
        }
        if (meta['wp:meta_key'] === '_wp_attachment_metadata') {
          metadata = extractWordPressAttachmentMetadata(meta['wp:meta_value'])
        }
      })

      const resolvedAttachment = attachmentResolver.assetsById.get(String(attachment['wp:post_id']))
      const relativePath = resolveWordPressAttachmentPath(
        resolvedAttachment?.originalRelativePath || attachedFile,
        resolvedAttachment?.originalUrl || attachment['wp:attachment_url'] || attachment.guid?.value
      )

      if (!relativePath) {
        return []
      }

      return [
        {
          id: attachment['wp:post_id'] + '',
          name:
            attachment.title ||
            relativePath.split('/').pop() ||
            `attachment-${attachment['wp:post_id']}`,
          path: ATTACHMENT_PATH_PREFIX + relativePath,
          url: resolvedAttachment?.originalUrl || attachment['wp:attachment_url'],
          type: 'LOCAL',
          height: metadata?.height,
          width: metadata?.width,
          mediaType: metadata?.mimeType,
          size: metadata?.filesize
        } as MigrateAttachment
      ]
    })
  }

  return {
    parse
  }
}

export function createWordPressAttachmentResolver(
  attachments: Item[]
): WordPressAttachmentResolver {
  const byId = new Map<string, string>()
  const byUrl = new Map<string, string>()
  const assetsById = new Map<string, WordPressAttachmentAsset>()

  attachments.forEach((attachment) => {
    const asset = resolveWordPressAttachmentAsset(attachment)
    assetsById.set(asset.id, asset)

    if (!asset.originalUrl) {
      return
    }

    byId.set(asset.id, asset.originalUrl)

    asset.aliases.forEach((alias) => {
      const normalizedAlias = normalizeWordPressMediaLookup(alias)
      if (normalizedAlias) {
        byUrl.set(normalizedAlias, asset.originalUrl as string)
      }
    })
  })

  return { byId, byUrl, assetsById }
}

function resolveFeaturedImageUrl(item: Item, attachmentResolver: WordPressAttachmentResolver) {
  const thumbnailId = item['wp:postmeta']?.find(
    (meta) => meta['wp:meta_key'] === '_thumbnail_id'
  )?.['wp:meta_value']

  if (!thumbnailId) {
    return undefined
  }

  return attachmentResolver.byId.get(String(thumbnailId))
}

function resolveAttachmentUrl(attachment: Item) {
  return attachment['wp:attachment_url'] || attachment.guid?.value || undefined
}

function resolveWordPressAttachmentAsset(attachment: Item): WordPressAttachmentAsset {
  let attachedFile = ''
  let metadata: AttachmentMetadata | undefined

  attachment['wp:postmeta']?.forEach((meta) => {
    if (meta['wp:meta_key'] === '_wp_attached_file') {
      attachedFile = meta['wp:meta_value']
    }

    if (meta['wp:meta_key'] === '_wp_attachment_metadata') {
      metadata = extractWordPressAttachmentMetadata(meta['wp:meta_value'])
    }
  })

  const sourceUrl = resolveAttachmentUrl(attachment)
  const originalRelativePath = resolveWordPressOriginalRelativePath(metadata, attachedFile)
  const originalUrl = resolveWordPressOriginalUrl(
    sourceUrl,
    attachedFile,
    metadata,
    originalRelativePath
  )
  const aliases = new Set<string>()

  ;[
    sourceUrl,
    attachment.guid?.value,
    originalUrl,
    attachedFile,
    metadata?.file,
    originalRelativePath
  ]
    .filter(Boolean)
    .forEach((value) => aliases.add(value as string))

  const baseUrl = getWordPressMediaDirectoryUrl(originalUrl || sourceUrl)
  metadata?.sizeFiles?.forEach((file) => {
    const variantUrl = buildWordPressMediaUrl(baseUrl, file)
    if (variantUrl) {
      aliases.add(variantUrl)
    }
    aliases.add(file)
  })

  return {
    id: String(attachment['wp:post_id']),
    originalUrl,
    originalRelativePath,
    aliases: Array.from(aliases),
    metadata
  }
}

function extractWordPressAttachmentMetadata(metadataString: string): AttachmentMetadata {
  const widthMatch = metadataString.match(/"width";i:(\d+);/)
  const heightMatch = metadataString.match(/"height";i:(\d+);/)
  const filesizeMatch = metadataString.match(/"filesize";i:(\d+);/)
  const mimeMatch = metadataString.match(/"mime[_-]type";s:(\d+):"([^"]+)";/)
  const fileMatches = Array.from(metadataString.matchAll(/s:4:"file";s:\d+:"([^"]+)";/g))
  const originalImageMatch = metadataString.match(/"original_image";s:\d+:"([^"]+)";/)

  return {
    width: widthMatch ? parseInt(widthMatch[1]) : 0,
    height: heightMatch ? parseInt(heightMatch[1]) : 0,
    filesize: filesizeMatch ? parseInt(filesizeMatch[1]) : 0,
    mimeType: mimeMatch ? mimeMatch[2] : '',
    file: fileMatches[0]?.[1],
    sizeFiles: fileMatches.slice(1).map((match) => match[1]),
    originalImage: originalImageMatch?.[1]
  }
}

function resolveWordPressOriginalRelativePath(
  metadata?: AttachmentMetadata,
  attachedFile?: string
): string | undefined {
  const metadataFile = metadata?.file || attachedFile
  if (!metadataFile) {
    return attachedFile || undefined
  }

  if (!metadata?.originalImage) {
    return metadataFile
  }

  const segments = metadataFile.split('/')
  segments[segments.length - 1] = metadata.originalImage
  return segments.join('/')
}

function resolveWordPressOriginalUrl(
  sourceUrl: string | undefined,
  attachedFile: string | undefined,
  metadata: AttachmentMetadata | undefined,
  originalRelativePath: string | undefined
) {
  if (!sourceUrl) {
    return undefined
  }

  const matchedBaseUrl = resolveWordPressMediaBaseUrl(sourceUrl, [
    originalRelativePath,
    attachedFile,
    metadata?.file
  ])

  if (matchedBaseUrl && originalRelativePath) {
    return buildWordPressMediaUrl(matchedBaseUrl, originalRelativePath) || sourceUrl
  }

  if (attachedFile && originalRelativePath) {
    return (
      replaceWordPressRelativePathInUrl(sourceUrl, attachedFile, originalRelativePath) || sourceUrl
    )
  }

  return sourceUrl
}

function resolveWordPressMediaBaseUrl(sourceUrl: string, relativePaths: (string | undefined)[]) {
  const cleanUrl = stripWordPressMediaUrlSuffix(sourceUrl)

  for (const relativePath of relativePaths) {
    if (!relativePath) {
      continue
    }

    if (cleanUrl.endsWith(relativePath)) {
      return cleanUrl.slice(0, cleanUrl.length - relativePath.length)
    }
  }

  return undefined
}

function replaceWordPressRelativePathInUrl(
  sourceUrl: string,
  currentRelativePath: string,
  nextRelativePath: string
) {
  const baseUrl = resolveWordPressMediaBaseUrl(sourceUrl, [currentRelativePath])
  return baseUrl ? buildWordPressMediaUrl(baseUrl, nextRelativePath) : undefined
}

function buildWordPressMediaUrl(baseUrl: string | undefined, relativePath: string | undefined) {
  if (!baseUrl || !relativePath) {
    return undefined
  }

  return `${baseUrl}${relativePath.replace(/^\/+/, '')}`
}

function stripWordPressMediaUrlSuffix(url: string) {
  return url.split(/[?#]/)[0]
}

function getWordPressMediaDirectoryUrl(url?: string) {
  if (!url) {
    return undefined
  }

  const cleanUrl = stripWordPressMediaUrlSuffix(url)
  const lastSlashIndex = cleanUrl.lastIndexOf('/')
  if (lastSlashIndex < 0) {
    return undefined
  }

  return cleanUrl.slice(0, lastSlashIndex + 1)
}

function normalizeWordPressMediaLookup(value?: string) {
  if (!value) {
    return undefined
  }

  const trimmed = stripWordPressMediaUrlSuffix(value.trim())
  return trimmed || undefined
}

function resolveWordPressAttachmentPath(relativePath?: string, sourceUrl?: string) {
  const normalizedRelativePath = normalizeWordPressAttachmentRelativePath(relativePath)
  if (normalizedRelativePath) {
    return normalizedRelativePath
  }

  const normalizedSourcePath = extractWordPressAttachmentRelativePathFromUrl(sourceUrl)
  if (normalizedSourcePath) {
    return normalizedSourcePath
  }

  return undefined
}

function normalizeWordPressAttachmentRelativePath(relativePath?: string) {
  if (!relativePath) {
    return undefined
  }

  const trimmed = relativePath.trim().replace(/^\/+/, '')
  if (!trimmed) {
    return undefined
  }

  return trimmed.startsWith(ATTACHMENT_PATH_PREFIX)
    ? trimmed.slice(ATTACHMENT_PATH_PREFIX.length)
    : trimmed
}

function extractWordPressAttachmentRelativePathFromUrl(sourceUrl?: string) {
  const normalizedUrl = normalizeWordPressMediaLookup(sourceUrl)
  if (!normalizedUrl) {
    return undefined
  }

  try {
    const pathname = new URL(normalizedUrl).pathname.replace(/^\/+/, '')
    return extractWordPressAttachmentRelativePathFromPath(pathname)
  } catch {
    return extractWordPressAttachmentRelativePathFromPath(normalizedUrl.replace(/^\/+/, ''))
  }
}

function extractWordPressAttachmentRelativePathFromPath(path: string) {
  const uploadPathIndex = path.indexOf(ATTACHMENT_PATH_PREFIX)
  if (uploadPathIndex < 0) {
    return undefined
  }

  const relativePath = path.slice(uploadPathIndex + ATTACHMENT_PATH_PREFIX.length)
  return relativePath || undefined
}

function ensureArray<T>(value?: T | T[] | null): T[] {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

function createWordPressAuthorByLoginMap(authors: Author[]) {
  return (authors || []).reduce((map, author) => {
    if (author['wp:author_login']) {
      map.set(author['wp:author_login'], author)
    }
    return map
  }, new Map<string, Author>())
}

function createWordPressAuthorByIdMap(authors: Author[]) {
  return (authors || []).reduce((map, author) => {
    map.set(author['wp:author_id'], author)
    return map
  }, new Map<number, Author>())
}

function resolveWordPressOwnerRef(item: Item, authorByLogin: Map<string, Author>) {
  const author = authorByLogin.get(item['dc:creator'])

  if (!author) {
    return undefined
  }

  return {
    sourceId: createSourceUserId('wordpress', author['wp:author_id'])
  }
}

export function sanitizeWordPressHtml(
  html?: string,
  attachmentResolver?: WordPressAttachmentResolver
): string {
  if (!html) {
    return ''
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')

  removeWordPressBlockComments(doc)
  transformWordPressGalleryBlocks(doc)
  transformWordPressImageBlocks(doc)
  transformWordPressCoverBlocks(doc)
  transformWordPressFileBlocks(doc)
  transformWordPressMediaBlocks(doc, 'figure.wp-block-video', 'video')
  transformWordPressMediaBlocks(doc, 'figure.wp-block-audio', 'audio')
  transformWordPressEmbedBlocks(doc)
  normalizeWordPressMediaUrls(doc, attachmentResolver)

  doc.querySelectorAll('img, source').forEach((element) => {
    element.removeAttribute('srcset')
    element.removeAttribute('sizes')
  })

  return doc.body.innerHTML
}

function removeWordPressBlockComments(doc: Document) {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT)
  const commentsToRemove: globalThis.Comment[] = []

  let currentNode = walker.nextNode()
  while (currentNode) {
    commentsToRemove.push(currentNode as globalThis.Comment)
    currentNode = walker.nextNode()
  }

  commentsToRemove.forEach((comment) => comment.parentNode?.removeChild(comment))
}

function normalizeWordPressMediaUrls(
  doc: Document,
  attachmentResolver?: WordPressAttachmentResolver
) {
  if (!attachmentResolver) {
    return
  }

  doc.querySelectorAll('img').forEach((img) => {
    const resolvedUrl = resolveWordPressElementMediaUrl(img, attachmentResolver, 'src')
    if (resolvedUrl) {
      img.setAttribute('src', resolvedUrl)
    }
  })

  doc.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href')
    const resolvedUrl = resolveWordPressMediaUrl(href, attachmentResolver)
    if (resolvedUrl) {
      link.setAttribute('href', resolvedUrl)
    }
  })

  doc.querySelectorAll('video, audio').forEach((media) => {
    const src = media.getAttribute('src')
    const resolvedUrl = resolveWordPressMediaUrl(src, attachmentResolver)
    if (resolvedUrl) {
      media.setAttribute('src', resolvedUrl)
    }

    const poster = media.getAttribute('poster')
    const resolvedPoster = resolveWordPressMediaUrl(poster, attachmentResolver)
    if (resolvedPoster) {
      media.setAttribute('poster', resolvedPoster)
    }
  })

  doc.querySelectorAll('source').forEach((source) => {
    const resolvedUrl = resolveWordPressMediaUrl(source.getAttribute('src'), attachmentResolver)
    if (resolvedUrl) {
      source.setAttribute('src', resolvedUrl)
    }
  })
}

function resolveWordPressElementMediaUrl(
  element: Element,
  attachmentResolver: WordPressAttachmentResolver,
  attributeName: string
) {
  const attachmentId = extractWordPressAttachmentId(element)
  if (attachmentId) {
    const resolvedById = attachmentResolver.byId.get(attachmentId)
    if (resolvedById) {
      return resolvedById
    }
  }

  return resolveWordPressMediaUrl(element.getAttribute(attributeName), attachmentResolver)
}

function resolveWordPressMediaUrl(
  value: string | null | undefined,
  attachmentResolver: WordPressAttachmentResolver
) {
  const normalizedValue = normalizeWordPressMediaLookup(value || undefined)
  if (!normalizedValue) {
    return undefined
  }

  return attachmentResolver.byUrl.get(normalizedValue)
}

function extractWordPressAttachmentId(element: Element) {
  const className = element.getAttribute('class') || ''
  const match = className.match(/(?:^|\s)wp-image-(\d+)(?:\s|$)/)
  return match?.[1]
}

function transformWordPressGalleryBlocks(doc: Document) {
  doc.querySelectorAll('figure.wp-block-gallery').forEach((galleryFigure) => {
    const imageItems = Array.from(galleryFigure.querySelectorAll(':scope > figure.wp-block-image'))
    if (imageItems.length === 0) {
      return
    }

    const groupSize = getWordPressGalleryGroupSize(galleryFigure, imageItems.length)
    const gallery = doc.createElement('div')
    gallery.setAttribute('data-type', 'gallery')
    gallery.setAttribute('data-group-size', String(groupSize))
    gallery.setAttribute('data-layout', 'auto')
    gallery.setAttribute('data-gap', '8')

    const galleryGrid = doc.createElement('div')
    galleryGrid.setAttribute('style', 'display: grid; gap: 8px;')

    chunkArray(imageItems, groupSize).forEach((groupItems) => {
      const group = doc.createElement('div')
      group.setAttribute('data-type', 'gallery-group')
      group.setAttribute(
        'style',
        'display: flex; flex-direction: row; justify-content: center; gap: 8px;'
      )

      groupItems.forEach((item) => {
        const img = item.querySelector('img')
        if (!img) {
          return
        }

        const ratio = getImageAspectRatio(img)
        const imageWrapper = doc.createElement('div')
        imageWrapper.setAttribute('style', `flex: ${ratio} 1 0%;`)
        imageWrapper.setAttribute('data-aspect-ratio', String(ratio))
        const caption = item.querySelector(':scope > figcaption')

        const nextImageContent = createNormalizedImageContent(doc, img, {
          imageStyle: 'width: 100%; height: 100%; margin: 0; object-fit: cover;'
        })
        const nextImg =
          nextImageContent.querySelector('img') ||
          (nextImageContent.tagName === 'IMG' ? nextImageContent : null)

        if (!nextImg) {
          return
        }

        nextImg.setAttribute('data-type', 'gallery-image')

        imageWrapper.append(nextImageContent)

        if (caption) {
          imageWrapper.append(createNormalizedCaption(caption))
        }

        group.append(imageWrapper)
      })

      if (group.childElementCount > 0) {
        galleryGrid.append(group)
      }
    })

    if (galleryGrid.childElementCount === 0) {
      return
    }

    gallery.append(galleryGrid)
    galleryFigure.replaceWith(gallery)
  })
}

function transformWordPressImageBlocks(doc: Document) {
  doc.querySelectorAll('figure.wp-block-image').forEach((figure) => {
    if (figure.closest('figure.wp-block-gallery')) {
      return
    }

    const img = figure.querySelector(':scope > img, :scope > a > img')
    if (!img) {
      return
    }

    const nextFigure = doc.createElement('figure')
    const figureStyle = figure.getAttribute('style')
    if (figureStyle) {
      nextFigure.setAttribute('style', figureStyle)
    }

    nextFigure.append(createNormalizedImageContent(doc, img))

    const caption = figure.querySelector(':scope > figcaption')
    if (caption) {
      nextFigure.append(createNormalizedCaption(caption))
    }

    figure.replaceWith(nextFigure)
  })
}

function transformWordPressCoverBlocks(doc: Document) {
  doc.querySelectorAll('.wp-block-cover').forEach((cover) => {
    const container = doc.createElement('div')
    container.setAttribute('data-type', 'cover')

    const coverStyle = cover.getAttribute('style')
    if (coverStyle) {
      container.setAttribute('style', coverStyle)
    }

    const image = cover.querySelector(':scope > img.wp-block-cover__image-background')
    if (image) {
      const mediaWrapper = doc.createElement('p')
      mediaWrapper.append(createNormalizedImageContent(doc, image))
      container.append(mediaWrapper)
    }

    const video = cover.querySelector(':scope > video.wp-block-cover__video-background')
    if (video) {
      const mediaFigure = doc.createElement('figure')
      mediaFigure.append(createNormalizedMediaElement(doc, video))
      container.append(mediaFigure)
    }

    const overlay = cover.querySelector(':scope > .wp-block-cover__background')
    if (overlay?.getAttribute('style')) {
      const overlayBlock = doc.createElement('div')
      overlayBlock.setAttribute('style', overlay.getAttribute('style') || '')
      container.append(overlayBlock)
    }

    const inner = cover.querySelector(':scope > .wp-block-cover__inner-container')
    if (inner) {
      const content = doc.createElement('div')
      moveChildNodes(inner, content)
      if (content.innerHTML.trim()) {
        container.append(content)
      }
    }

    if (!container.innerHTML.trim()) {
      return
    }

    cover.replaceWith(container)
  })
}

function transformWordPressFileBlocks(doc: Document) {
  doc.querySelectorAll('.wp-block-file').forEach((fileBlock) => {
    const links = Array.from(fileBlock.querySelectorAll(':scope > a[href]'))
    if (links.length === 0) {
      return
    }

    const paragraph = doc.createElement('p')

    links.forEach((link, index) => {
      if (index > 0) {
        paragraph.append(doc.createTextNode(' '))
      }

      paragraph.append(createNormalizedLink(link))
    })

    fileBlock.replaceWith(paragraph)
  })
}

function transformWordPressMediaBlocks(
  doc: Document,
  selector: string,
  tagName: 'video' | 'audio'
) {
  doc.querySelectorAll(selector).forEach((figure) => {
    const media = figure.querySelector(`:scope > ${tagName}, :scope > div > ${tagName}`)
    if (!media) {
      return
    }

    const nextFigure = doc.createElement('figure')
    nextFigure.append(createNormalizedMediaElement(doc, media))

    const caption = figure.querySelector(':scope > figcaption')
    if (caption) {
      nextFigure.append(createNormalizedCaption(caption))
    }

    figure.replaceWith(nextFigure)
  })
}

function transformWordPressEmbedBlocks(doc: Document) {
  doc.querySelectorAll('figure.wp-block-embed, div.wp-block-embed').forEach((embedBlock) => {
    const iframe = embedBlock.querySelector('iframe')
    const caption = embedBlock.querySelector(':scope > figcaption')

    if (iframe) {
      const wrapper = doc.createElement('div')
      wrapper.append(createNormalizedIframe(doc, iframe))

      if (caption) {
        wrapper.append(createNormalizedCaption(caption))
      }

      embedBlock.replaceWith(wrapper)
      return
    }

    const urlText =
      embedBlock.querySelector('.wp-block-embed__wrapper')?.textContent?.trim() ||
      embedBlock.textContent?.trim()

    if (!urlText) {
      return
    }

    const paragraph = doc.createElement('p')
    const link = doc.createElement('a')
    link.setAttribute('href', urlText)
    link.textContent = urlText
    paragraph.append(link)

    if (caption) {
      const wrapper = doc.createElement('div')
      wrapper.append(paragraph, createNormalizedCaption(caption))
      embedBlock.replaceWith(wrapper)
      return
    }

    embedBlock.replaceWith(paragraph)
  })
}

function getWordPressGalleryGroupSize(galleryFigure: Element, imageCount: number) {
  const columnsClass = Array.from(galleryFigure.classList).find((className) =>
    /^columns-\d+$/.test(className)
  )
  const columns = columnsClass ? Number(columnsClass.replace('columns-', '')) : NaN

  if (Number.isFinite(columns) && columns > 0) {
    return Math.min(columns, imageCount)
  }

  return Math.min(3, imageCount)
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }

  return chunks
}

function getImageAspectRatio(img: HTMLImageElement) {
  const width = Number(img.getAttribute('width'))
  const height = Number(img.getAttribute('height'))

  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) {
    return 1
  }

  return width / height
}

function copyAttribute(source: Element, target: Element, name: string) {
  if (!source.hasAttribute(name)) {
    return
  }

  const value = source.getAttribute(name)
  target.setAttribute(name, value ?? '')
}

function createNormalizedImageContent(
  doc: Document,
  img: Element,
  options?: {
    imageStyle?: string
  }
) {
  const nextImg = doc.createElement('img')
  copyAttribute(img, nextImg, 'class')
  copyAttribute(img, nextImg, 'src')
  copyAttribute(img, nextImg, 'alt')
  copyAttribute(img, nextImg, 'width')
  copyAttribute(img, nextImg, 'height')

  const sourceStyle = img.getAttribute('style')
  if (sourceStyle || options?.imageStyle) {
    nextImg.setAttribute('style', [sourceStyle, options?.imageStyle].filter(Boolean).join('; '))
  }

  const link = img.closest('a')
  if (!link) {
    return nextImg
  }

  const nextLink = createNormalizedLink(link)
  nextLink.textContent = ''
  nextLink.append(nextImg)

  return nextLink
}

function createNormalizedMediaElement(doc: Document, media: Element) {
  const nextMedia = doc.createElement(media.tagName.toLowerCase())
  ;[
    'src',
    'poster',
    'preload',
    'autoplay',
    'controls',
    'controlslist',
    'loop',
    'muted',
    'playsinline'
  ].forEach((name) => copyAttribute(media, nextMedia, name))

  Array.from(media.querySelectorAll(':scope > source')).forEach((source) => {
    const nextSource = doc.createElement('source')
    copyAttribute(source, nextSource, 'src')
    copyAttribute(source, nextSource, 'type')
    nextMedia.append(nextSource)
  })

  return nextMedia
}

function createNormalizedIframe(doc: Document, iframe: Element) {
  const nextIframe = doc.createElement('iframe')
  ;[
    'src',
    'title',
    'width',
    'height',
    'allow',
    'allowfullscreen',
    'loading',
    'referrerpolicy'
  ].forEach((name) => copyAttribute(iframe, nextIframe, name))

  return nextIframe
}

function createNormalizedLink(link: Element) {
  const doc = link.ownerDocument
  const nextLink = doc.createElement('a')
  ;['href', 'target', 'rel', 'download'].forEach((name) => copyAttribute(link, nextLink, name))
  nextLink.textContent = link.textContent?.trim() || nextLink.getAttribute('href') || ''
  return nextLink
}

function createNormalizedCaption(caption: Element) {
  const doc = caption.ownerDocument
  const nextCaption = doc.createElement('figcaption')
  moveChildNodes(caption, nextCaption)
  return nextCaption
}

function moveChildNodes(source: Element, target: Element) {
  Array.from(source.childNodes).forEach((child) => {
    target.append(child.cloneNode(true))
  })
}

interface AttachmentMetadata {
  width: number
  height: number
  filesize: number
  mimeType: string
  file?: string
  sizeFiles?: string[]
  originalImage?: string
}

interface WordPressAttachmentAsset {
  id: string
  originalUrl?: string
  originalRelativePath?: string
  aliases: string[]
  metadata?: AttachmentMetadata
}

interface WordPressAttachmentResolver {
  byId: Map<string, string>
  byUrl: Map<string, string>
  assetsById: Map<string, WordPressAttachmentAsset>
}

interface Category {
  'wp:term_id': number
  'wp:category_nicename': string
  'wp:category_parent': string
  'wp:cat_name': string
  'wp:category_description'?: string
}

interface Tag {
  'wp:term_id': number
  'wp:tag_slug': string
  'wp:tag_name': string
  'wp:tag_description'?: string
}

interface Item {
  title: string
  link: string
  pubDate: string
  'dc:creator': string
  guid: Guid
  description: string
  'content:encoded': string
  'excerpt:encoded': string
  'wp:post_id': number
  'wp:post_date': string
  'wp:post_date_gmt': string
  'wp:comment_status': 'open' | 'closed'
  'wp:ping_status': string
  'wp:post_name': string
  'wp:status': 'publish' | 'draft' | 'trash' | 'inherit' | 'private'
  'wp:post_parent': string | number
  'wp:menu_order': number
  'wp:post_type': 'post' | 'page' | 'attachment' | 'wp_global_styles' | 'nav_menu_item'
  'wp:post_password': string
  'wp:is_sticky': 0 | 1
  'wp:attachment_url'?: string
  'wp:postmeta'?: PostMeta[]
  category?: ItemCategory[]
  'wp:comment'?: Comment[]
  'wp:term'?: Tag[]
}

interface Guid {
  value: string
  _isPermaLink: boolean
}

interface ItemCategory {
  value: string
  _domain: 'category' | 'post_tag' | 'nav_menu'
  _nicename: string
}

interface PostMeta {
  'wp:meta_key': string
  'wp:meta_value': string
}

interface Comment {
  'wp:comment_id': number
  'wp:comment_author': string
  'wp:comment_author_email': string
  'wp:comment_author_url': string
  'wp:comment_author_IP': string
  'wp:comment_date': string
  'wp:comment_date_gmt': string
  'wp:comment_content': string
  'wp:comment_approved': 0 | 1 | 'trash' | 'post-trashed'
  'wp:comment_type': string
  'wp:comment_parent': number
  'wp:comment_user_id': number
  'wp:commentmeta': CommentMeta[]
}

interface CommentMeta {
  'wp:meta_key': string
  'wp:meta_value': string
}

interface Author {
  'wp:author_id': number
  'wp:author_login': string
  'wp:author_email': string
  'wp:author_display_name': string
  'wp:author_first_name': string
  'wp:author_last_name': string
}

interface Term {
  'wp:term_id': number
  'wp:term_taxonomy': 'post_tag' | 'category' | 'nav_menu'
  'wp:term_slug': string
  'wp:term_parent': string
  'wp:term_name': string
  'wp:term_description': string
}

interface Channel {
  title: string
  link: string
  description: string
  pubDate: string
  language: string
  'wp:wxr_version': number
  'wp:base_site_url': string
  'wp:base_blog_url': string
  'wp:author': Author[]
  'wp:category': Category[]
  'wp:tag': Tag[]
  'wp:term': Term[]
  'wp:generator': string
  item: Item[]
}
