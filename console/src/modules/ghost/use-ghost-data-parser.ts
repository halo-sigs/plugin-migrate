import type { MigrateData, MigratePost, MigrateSinglePage, MigrateTag } from '@/types'
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
            tags: parseTags(tags)
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
              raw: rawPost.html,
              content: rawPost.html,
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
              raw: rawPost.html,
              content: rawPost.html,
              rawType: 'HTML'
            }
          },
          counter: {}
        } as MigrateSinglePage
      })
  }

  return {
    parse
  }
}
