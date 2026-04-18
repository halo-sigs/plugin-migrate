import type {
  MigrateAttachment,
  MigrateCategory,
  MigrateComment,
  MigrateData,
  MigrateMenu,
  MigrateReply
} from '@/types'
import type { Ref } from '@halo-dev/api-client'
import { XMLParser } from 'fast-xml-parser'

interface useWordPressDataParserReturn {
  parse: () => Promise<MigrateData>
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

          const {
            ['wp:tag']: rawTags,
            ['wp:category']: rawCategories,
            ['wp:term']: rawTerms
          } = channel || {}

          // 校验 wxr 版本 result.rss.channel["wp:wxr_version"]
          // 解析 item 数据，获取文章、页面、附件
          const { posts, pages, attachments, navMenuItems } = itemClassification(channel.item)
          const menuItems = parseMenuItems(rawTerms, navMenuItems)
          menuItems.map((item) => {
            if (menuChildrenMap.has(item.menu.metadata.name)) {
              item.menu.spec.children = menuChildrenMap.get(item.menu.metadata.name) as string[]
            }
          })

          resolve({
            posts: parsePosts(posts, rawTags, rawCategories, attachments),
            pages: parsePages(pages, attachments),
            comments: parseComments(channel.item),
            tags: parseTags(rawTags),
            categories: parseCategories(rawCategories),
            // 菜单
            menuItems: menuItems,
            // 附件
            attachments: parseAttachments(attachments)
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

  const parsePosts = (posts: Item[], tags: Tag[], categories: Category[], attachments: Item[]) => {
    const attachmentUrlMap = createAttachmentUrlMap(attachments)

    return posts?.map((post: Item) => {
      const cleanedHtml = sanitizeWordPressHtml(post['content:encoded'])
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

      const thumbnail = resolveFeaturedImageUrl(post, attachmentUrlMap)

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
        }
      }
    })
  }

  const parsePages = (pages: Item[], attachments: Item[]) => {
    const attachmentUrlMap = createAttachmentUrlMap(attachments)

    return pages?.map((page: Item) => {
      const cleanedHtml = sanitizeWordPressHtml(page['content:encoded'])
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
              cover: resolveFeaturedImageUrl(page, attachmentUrlMap),
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
        }
      }
    })
  }

  const parseComments = (items: Item[]): (MigrateComment | MigrateReply)[] => {
    const comments: (MigrateComment | MigrateReply)[] = []
    items?.forEach((item) => {
      const refType = item['wp:post_type'] == 'post' ? 'Post' : 'SinglePage'
      item['wp:comment']?.forEach((comment) => {
        if (comment['wp:comment_parent'] === 0) {
          comments.push(createComment(comment, item, refType))
        } else {
          comments.push(createReply(comment, refType))
        }
      })
    })
    return comments
  }

  const createComment = (
    comment: Comment,
    item: Item,
    refType: 'Post' | 'SinglePage'
  ): MigrateComment => {
    return {
      refType: refType,
      kind: 'Comment',
      apiVersion: 'content.halo.run/v1alpha1',
      spec: {
        raw: comment['wp:comment_content'],
        content: comment['wp:comment_content'],
        owner: {
          kind: 'Email',
          name: comment['wp:comment_author_email'],
          displayName: comment['wp:comment_author'] + '',
          annotations: {
            website: comment['wp:comment_author_url']
          }
        },
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
      }
    }
  }

  const createReply = (reply: Comment, refType: 'Post' | 'SinglePage'): MigrateReply => {
    return {
      refType: refType,
      kind: 'Reply',
      apiVersion: 'content.halo.run/v1alpha1',
      metadata: {
        name: reply['wp:comment_id'] + ''
      },
      spec: {
        raw: reply['wp:comment_content'],
        content: reply['wp:comment_content'],
        owner: {
          kind: 'Email',
          name: reply['wp:comment_author_email'],
          displayName: reply['wp:comment_author'] + '',
          annotations: {
            website: reply['wp:comment_author_url']
          }
        },
        ipAddress: reply['wp:comment_author_IP'],
        priority: 0,
        top: false,
        allowNotification: true,
        approved: reply['wp:comment_approved'] === 1,
        approvedTime: new Date(reply['wp:comment_date']).toISOString(),
        creationTime: new Date(reply['wp:comment_date']).toISOString(),
        hidden: false,
        commentName: reply['wp:comment_parent'] + '',
        quoteReply: reply['wp:comment_parent'] + ''
      },
      status: {}
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

  const ATTACHMENT_PATH_PREFIX = 'wp-content/uploads/'

  const parseAttachments = (attachments: Item[]) => {
    return attachments?.map((attachment) => {
      let path = ''
      let metadata: AttachmentMetadata = {} as AttachmentMetadata
      attachment['wp:postmeta']?.forEach((meta) => {
        if (meta['wp:meta_key'] === '_wp_attached_file') {
          path = meta['wp:meta_value']
        }
        // TODO 解析元数据
        if (meta['wp:meta_key'] === '_wp_attachment_metadata') {
          metadata = extractImageMetadata(meta['wp:meta_value'])
        }
      })
      return {
        id: attachment['wp:post_id'] + '',
        name: attachment.title,
        path: ATTACHMENT_PATH_PREFIX + path,
        url: attachment['wp:attachment_url'],
        type: 'LOCAL',
        height: metadata?.height,
        width: metadata?.width,
        mediaType: metadata?.mimeType,
        size: metadata?.filesize
      } as MigrateAttachment
    })
  }

  const extractImageMetadata = (metadataString: string): AttachmentMetadata => {
    const widthMatch = metadataString.match(/"width";i:(\d+);/)
    const heightMatch = metadataString.match(/"height";i:(\d+);/)
    const filesizeMatch = metadataString.match(/"filesize";i:(\d+);/)
    const mimeMatch = metadataString.match(/"mime[_-]type";s:(\d+):"([^"]+)";/)

    return {
      width: widthMatch ? parseInt(widthMatch[1]) : 0,
      height: heightMatch ? parseInt(heightMatch[1]) : 0,
      filesize: filesizeMatch ? parseInt(filesizeMatch[1]) : 0,
      mimeType: mimeMatch ? mimeMatch[2] : ''
    }
  }

  return {
    parse
  }
}

function createAttachmentUrlMap(attachments: Item[]) {
  return attachments.reduce((map, attachment) => {
    const url = resolveAttachmentUrl(attachment)
    if (url) {
      map.set(String(attachment['wp:post_id']), url)
    }
    return map
  }, new Map<string, string>())
}

function resolveFeaturedImageUrl(item: Item, attachmentUrlMap: Map<string, string>) {
  const thumbnailId = item['wp:postmeta']?.find(
    (meta) => meta['wp:meta_key'] === '_thumbnail_id'
  )?.['wp:meta_value']

  if (!thumbnailId) {
    return undefined
  }

  return attachmentUrlMap.get(String(thumbnailId))
}

function resolveAttachmentUrl(attachment: Item) {
  return attachment['wp:attachment_url'] || attachment.guid?.value || undefined
}

function sanitizeWordPressHtml(html?: string): string {
  if (!html) {
    return ''
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')

  transformWordPressGalleryBlocks(doc)

  doc.querySelectorAll('img, source').forEach((element) => {
    element.removeAttribute('srcset')
    element.removeAttribute('sizes')
  })

  return doc.body.innerHTML
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

        const nextImg = doc.createElement('img')
        copyAttribute(img, nextImg, 'src')
        copyAttribute(img, nextImg, 'alt')
        copyAttribute(img, nextImg, 'width')
        copyAttribute(img, nextImg, 'height')
        nextImg.setAttribute('data-type', 'gallery-image')
        nextImg.setAttribute('style', 'width: 100%; height: 100%; margin: 0; object-fit: cover;')

        imageWrapper.append(nextImg)
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
  const value = source.getAttribute(name)
  if (value) {
    target.setAttribute(name, value)
  }
}

interface AttachmentMetadata {
  width: number
  height: number
  filesize: number
  mimeType: string
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
