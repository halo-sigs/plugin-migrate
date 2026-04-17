import type {
  MigrateAttachment,
  MigrateData,
  MigratePost,
  MigrateSinglePage,
  MigrateTag
} from '@/types'
import type { Post, PostsTag, Root, Tag } from './types'

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
          const { posts, tags, posts_tags } = ghostDBData

          resolve({
            posts: parsePosts(posts, posts_tags),
            pages: parsePages(posts),
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

  function parsePosts(rawPosts: Post[], rawPostsTags: PostsTag[]): MigratePost[] {
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
          }
        }
      })
  }

  function parsePages(rawPosts: Post[]): MigrateSinglePage[] {
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
          counter: {}
        } as MigrateSinglePage
      })
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

  doc.querySelectorAll('img, source').forEach((element) => {
    element.removeAttribute('srcset')
    element.removeAttribute('sizes')
  })

  return doc.body.innerHTML
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
