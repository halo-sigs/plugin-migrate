import { useHaloDataParser } from '@/modules/halo/use-halo-data-parser'
import { describe, expect, it } from '@rstest/core'

function createHaloFile(data: Record<string, unknown>) {
  return new File([JSON.stringify(data)], 'halo-export.json', { type: 'application/json' })
}

function createBaseHaloExport(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.6.0',
    user: {
      userId: 9,
      username: 'halo-admin',
      nickname: 'Halo Admin',
      email: 'admin@example.com',
      avatarUrl: 'https://example.com/avatar.png',
      description: 'bio',
      website: 'https://example.com',
      roles: ['admin']
    },
    tags: [{ id: 1, name: 'Tag', slug: 'tag', color: '#fff', thumbnail: 'tag-cover.png' }],
    categories: [
      {
        id: 10,
        name: 'Parent',
        slug: 'parent',
        description: 'desc',
        thumbnail: 'cat-cover.png',
        priority: 0,
        parentId: 0
      },
      {
        id: 11,
        name: 'Child',
        slug: 'child',
        description: 'child',
        thumbnail: '',
        priority: 1,
        parentId: 10
      }
    ],
    posts: [
      {
        id: 100,
        title: 'Post',
        status: 'PUBLISHED',
        slug: 'post',
        topPriority: 1,
        disallowComment: false,
        summary: 'summary',
        thumbnail: 'post-cover.png',
        visits: 8,
        likes: 3,
        createTime: 1710000000000
      }
    ],
    sheets: [
      {
        id: 200,
        title: 'Page',
        status: 'RECYCLE',
        slug: 'page',
        topPriority: 0,
        disallowComment: true,
        summary: 'page-summary',
        thumbnail: 'page-cover.png',
        visits: 5,
        likes: 1,
        createTime: 1710001000000
      }
    ],
    contents: [
      { id: 100, originalContent: 'raw-post', content: '<p>post</p>' },
      { id: 200, originalContent: 'raw-page', content: '<p>page</p>' }
    ],
    post_tags: [{ postId: 100, tagId: 1 }],
    post_categories: [{ postId: 100, categoryId: 10 }],
    post_metas: [{ postId: 100, key: 'k', value: 'v' }],
    sheet_metas: [{ postId: 200, key: 'sk', value: 'sv' }],
    post_comments: [
      {
        id: 301,
        postId: 100,
        parentId: 0,
        content: 'post comment',
        author: 'Post User',
        email: 'post@example.com',
        authorUrl: 'https://post.example.com',
        gravatarMd5: 'abc',
        userAgent: 'UA',
        ipAddress: '127.0.0.1',
        allowNotification: true,
        status: 'PUBLISHED',
        createTime: 1710002000000
      },
      {
        id: 302,
        postId: 100,
        parentId: 301,
        content: 'post reply',
        author: 'Post Reply',
        email: 'reply@example.com',
        authorUrl: '',
        gravatarMd5: '',
        userAgent: 'UA',
        ipAddress: '127.0.0.2',
        allowNotification: false,
        status: 'AUDITING',
        createTime: 1710002001000
      }
    ],
    sheet_comments: [],
    journal_comments: [
      {
        id: 401,
        postId: 501,
        parentId: 0,
        content: 'moment comment',
        author: 'Moment User',
        email: 'moment@example.com',
        authorUrl: '',
        gravatarMd5: '',
        userAgent: 'UA',
        ipAddress: '127.0.0.3',
        allowNotification: true,
        status: 'PUBLISHED',
        createTime: 1710003000000
      }
    ],
    menus: [
      { id: 601, name: 'Parent Menu', url: '/parent', priority: 0, parentId: 0, team: 'main' },
      { id: 602, name: 'Child Menu', url: '/child', priority: 1, parentId: 601, team: 'main' }
    ],
    journals: [{ id: 501, content: 'moment', createTime: 1710004000000, type: 'PUBLIC' }],
    photos: [
      {
        id: 701,
        name: 'Photo',
        url: 'photo.jpg',
        thumbnail: 'photo-thumb.jpg',
        team: '',
        description: 'photo desc'
      }
    ],
    links: [
      {
        id: 801,
        name: 'Link',
        url: 'https://halo.run',
        logo: 'logo.png',
        description: 'desc',
        team: '',
        priority: 9
      }
    ],
    attachments: [
      {
        id: 901,
        name: 'Attachment',
        path: '/upload/file.png',
        fileKey: 'file-key',
        thumbPath: '/upload/thumb.png',
        mediaType: 'image/png',
        suffix: 'png',
        width: 10,
        height: 20,
        size: 30,
        type: 'LOCAL',
        createTime: 1710005000000,
        updateTime: 1710005000000
      }
    ],
    ...overrides
  }
}

describe('useHaloDataParser', () => {
  it('parses halo 1.5/1.6 exports including single user objects and related resources', async () => {
    const data = await useHaloDataParser(createHaloFile(createBaseHaloExport())).parse()

    expect(data.sourceProvider).toBe('halo')
    expect(data.users).toEqual([
      expect.objectContaining({
        id: 'halo:9',
        provider: 'halo',
        displayName: 'Halo Admin',
        email: 'admin@example.com'
      })
    ])
    expect(data.posts?.[0]).toMatchObject({
      postRequest: {
        post: {
          spec: {
            title: 'Post',
            categories: ['10'],
            tags: ['1'],
            pinned: true
          },
          metadata: {
            annotations: { k: 'v' }
          }
        },
        content: {
          raw: 'raw-post',
          content: '<p>post</p>'
        }
      },
      counter: {
        visit: 8,
        upvote: 3
      }
    })
    expect(data.pages?.[0]).toMatchObject({
      singlePageRequest: {
        page: {
          spec: {
            title: 'Page',
            deleted: true,
            publish: false
          },
          metadata: {
            annotations: { sk: 'sv' }
          }
        }
      }
    })
    expect(data.comments?.map((comment) => comment.kind)).toEqual(['Comment', 'Reply', 'Comment'])
    expect(data.comments?.[0]).toMatchObject({
      refType: 'Post',
      metadata: { name: '301' },
      spec: {
        owner: {
          kind: 'Email',
          name: 'post@example.com'
        },
        subjectRef: {
          kind: 'Post',
          name: '100'
        }
      }
    })
    expect(data.comments?.[1]).toMatchObject({
      kind: 'Reply',
      refType: 'Post',
      spec: {
        commentName: '301',
        quoteReply: '301'
      }
    })
    expect(data.comments?.[2]).toMatchObject({
      refType: 'Moment',
      spec: {
        subjectRef: {
          kind: 'Moment',
          name: '501'
        }
      }
    })
    expect(data.menuItems?.[0]).toMatchObject({
      menu: {
        spec: {
          displayName: 'Parent Menu',
          children: ['602']
        }
      },
      groupId: 'main'
    })
    expect(data.moments?.[0]).toMatchObject({
      spec: {
        content: {
          raw: 'moment',
          html: 'moment'
        },
        visible: 'PUBLIC'
      }
    })
    expect(data.photos?.[0]?.spec.groupName).toBe('default')
    expect(data.links?.[0]?.spec.groupName).toBe('default')
    expect(data.attachments?.[0]).toMatchObject({
      id: 901,
      path: '/upload/file.png',
      type: 'LOCAL'
    })
  })

  it('rejects unsupported halo versions', async () => {
    await expect(
      useHaloDataParser(createHaloFile(createBaseHaloExport({ version: '2.0.0' }))).parse()
    ).rejects.toBe('暂不支持该版本的迁移，仅支持 Halo 1.5 / 1.6 版本')
  })
})
