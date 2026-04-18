import type {
  MigrateAttachment,
  MigrateData,
  MigratePost,
  MigrateSinglePage,
  MigrateSourceUser,
  MigrateTag
} from '@/types'
import { createSourceUserId } from '@/utils/migrate-user'
import type { Post, PostsAuthor, PostsTag, Root, Tag, User } from './types'

interface useGhostDataParserReturn {
  parse: () => Promise<MigrateData>
}

export function useGhostDataParser(file: File): useGhostDataParserReturn {
  const parse = (): Promise<MigrateData> => {
    return new Promise<MigrateData>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const ghostRawData = JSON.parse(event.target?.result as string) as Root
        const ghostDBData = ghostRawData.db[0].data

        if (!ghostDBData) {
          reject('Failed to parse data. No data found')
        }

        try {
          const { posts, tags, posts_tags, users, posts_authors } = ghostDBData

          resolve({
            users: parseUsers(users),
            posts: parsePosts(posts, posts_tags, posts_authors),
            pages: parsePages(posts, posts_authors),
            tags: parseTags(tags),
            attachments: extractAttachments(posts, tags)
          })
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

  function parseTags(rawTags: Tag[]): MigrateTag[] {
    return rawTags.map((rawTag) => {
      return {
        spec: {
          displayName: rawTag.name,
          slug: rawTag.slug,
          color: rawTag.accent_color,
          cover: rawTag.feature_image
        },
        apiVersion: 'content.halo.run/v1alpha1',
        kind: 'Tag',
        metadata: {
          name: rawTag.id
        }
      }
    })
  }

  function parsePosts(
    rawPosts: Post[],
    rawPostsTags: PostsTag[],
    rawPostsAuthors: PostsAuthor[]
  ): MigratePost[] {
    return rawPosts
      .filter((rawPost) => rawPost.type === 'post')
      .map((rawPost) => {
        const cleanedHtml = sanitizeGhostHtml(rawPost.html)
        const postTagIds = rawPostsTags
          .filter((postTag) => postTag.post_id === rawPost.id)
          .map((postTag) => {
            return postTag.tag_id
          })

        return {
          postRequest: {
            post: {
              spec: {
                title: rawPost.title,
                slug: rawPost.slug,
                template: '',
                cover: rawPost.feature_image,
                deleted: false,
                publish: rawPost.status === 'published',
                publishTime: rawPost.published_at,
                pinned: rawPost.featured === 1,
                allowComment: true,
                visible: rawPost.visibility === 'public' ? 'PUBLIC' : 'PRIVATE',
                priority: 0,
                excerpt: {
                  autoGenerate: !rawPost.plaintext,
                  raw: rawPost.plaintext
                },
                categories: [],
                tags: postTagIds,
                htmlMetas: []
              },
              apiVersion: 'content.halo.run/v1alpha1',
              kind: 'Post',
              metadata: {
                name: rawPost.id,
                annotations: {}
              }
            },
            content: {
              raw: cleanedHtml,
              content: cleanedHtml,
              rawType: 'HTML'
            }
          },
          ownerRef: resolveGhostOwnerRef(rawPost.id, rawPostsAuthors)
        }
      })
  }

  function parsePages(rawPosts: Post[], rawPostsAuthors: PostsAuthor[]): MigrateSinglePage[] {
    return rawPosts
      .filter((rawPost) => rawPost.type === 'page')
      .map((rawPost) => {
        const cleanedHtml = sanitizeGhostHtml(rawPost.html)
        return {
          singlePageRequest: {
            page: {
              spec: {
                title: rawPost.title,
                slug: rawPost.slug,
                template: '',
                cover: rawPost.feature_image,
                deleted: false,
                publish: rawPost.status === 'published',
                publishTime: rawPost.published_at,
                pinned: rawPost.featured === 1,
                allowComment: true,
                visible: rawPost.visibility === 'public' ? 'PUBLIC' : 'PRIVATE',
                priority: 0,
                excerpt: {
                  autoGenerate: !rawPost.plaintext,
                  raw: rawPost.plaintext
                },
                htmlMetas: []
              },
              apiVersion: 'content.halo.run/v1alpha1',
              kind: 'SinglePage',
              metadata: {
                name: rawPost.id,
                annotations: {}
              }
            },
            content: {
              raw: cleanedHtml,
              content: cleanedHtml,
              rawType: 'HTML'
            }
          },
          counter: {},
          ownerRef: resolveGhostOwnerRef(rawPost.id, rawPostsAuthors)
        } as MigrateSinglePage
      })
  }

  function parseUsers(rawUsers: User[]): MigrateSourceUser[] {
    return rawUsers.map((user) => ({
      id: createSourceUserId('ghost', user.id),
      provider: 'ghost',
      displayName: user.name || user.slug || user.email,
      email: user.email,
      username: user.slug,
      avatar: user.profile_image,
      bio: user.bio || undefined,
      website: user.website || undefined
    }))
  }

  function extractAttachments(rawPosts: Post[], rawTags: Tag[]): MigrateAttachment[] {
    const attachments: MigrateAttachment[] = []
    const seenPaths = new Set<string>()

    const addAttachment = (url: string | null | undefined) => {
      if (!isGhostLocalMediaUrl(url)) return

      const path = normalizeGhostMediaPath(url)
      if (!path || seenPaths.has(path)) return

      seenPaths.add(path)

      attachments.push({
        id: uuid(),
        name: path.split('/').pop() || 'attachment',
        path,
        url,
        type: 'LOCAL'
      })
    }

    rawPosts.forEach((post) => {
      addAttachment(post.feature_image)
      extractMediaUrlsFromHtml(post.html).forEach(addAttachment)
    })

    rawTags.forEach((tag) => {
      addAttachment(tag.feature_image)
    })

    return attachments
  }

  return {
    parse
  }
}

function resolveGhostOwnerRef(postId: string, rawPostsAuthors: PostsAuthor[]) {
  const relation = rawPostsAuthors
    .filter((item) => item.post_id === postId)
    .sort((a, b) => a.sort_order - b.sort_order)[0]

  if (!relation) {
    return undefined
  }

  return {
    sourceId: createSourceUserId('ghost', relation.author_id)
  }
}

function extractMediaUrlsFromHtml(html?: string): string[] {
  if (!html) {
    return []
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const urls: string[] = []

  doc.querySelectorAll('img, video, audio, source').forEach((element) => {
    const src = element.getAttribute('src')
    if (src) {
      urls.push(src)
    }
  })

  doc.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href')
    if (href) {
      urls.push(href)
    }
  })

  return urls
}

function sanitizeGhostHtml(html?: string): string {
  if (!html) {
    return ''
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')

  transformGhostGalleryCards(doc)

  doc.querySelectorAll('img, source').forEach((element) => {
    element.removeAttribute('srcset')
    element.removeAttribute('sizes')
  })

  return doc.body.innerHTML
}

function transformGhostGalleryCards(doc: Document) {
  doc.querySelectorAll('figure.kg-gallery-card').forEach((figure) => {
    const rows = Array.from(
      figure.querySelectorAll(':scope > .kg-gallery-container > .kg-gallery-row')
    )
    if (rows.length === 0) {
      return
    }

    const groupSize = Math.max(
      ...rows.map((row) => row.querySelectorAll(':scope > .kg-gallery-image').length)
    )
    const gallery = doc.createElement('div')
    gallery.setAttribute('data-type', 'gallery')
    gallery.setAttribute('data-group-size', String(groupSize))
    gallery.setAttribute('data-layout', 'auto')
    gallery.setAttribute('data-gap', '8')

    const galleryGrid = doc.createElement('div')
    galleryGrid.setAttribute('style', 'display: grid; gap: 8px;')

    rows.forEach((row) => {
      const group = doc.createElement('div')
      group.setAttribute('data-type', 'gallery-group')
      group.setAttribute(
        'style',
        'display: flex; flex-direction: row; justify-content: center; gap: 8px;'
      )

      Array.from(row.querySelectorAll(':scope > .kg-gallery-image')).forEach((item) => {
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
        if (img.getAttribute('width')) {
          nextImg.setAttribute('width', img.getAttribute('width') || '')
        }
        if (img.getAttribute('height')) {
          nextImg.setAttribute('height', img.getAttribute('height') || '')
        }
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

    const caption = figure.querySelector(':scope > figcaption')
    if (caption?.textContent?.trim()) {
      const captionParagraph = doc.createElement('p')
      captionParagraph.textContent = caption.textContent.trim()
      gallery.append(captionParagraph)
    }

    figure.replaceWith(gallery)
  })
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

function isGhostLocalMediaUrl(url?: string | null): url is string {
  if (!url) {
    return false
  }

  return /^content\/(images|files)\//.test(normalizeGhostMediaPath(url))
}

function normalizeGhostMediaPath(url: string): string {
  try {
    const parsedUrl = new URL(url)
    return normalizeGhostMediaPath(parsedUrl.pathname)
  } catch {
    const withoutQuery = url.split(/[?#]/)[0]
    const withoutPlaceholder = withoutQuery.replace(/^__GHOST_URL__\/?/, '')
    const withoutLeadingSlash = withoutPlaceholder.replace(/^\/+/, '')

    return withoutLeadingSlash.replace(/^content\/images\/size\/w\d+\//, 'content/images/')
  }
}

function uuid() {
  function r4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
  }
  return `${r4() + r4()}-${r4()}-${r4()}-${r4()}-${r4() + r4() + r4()}`
}
