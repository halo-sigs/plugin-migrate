import { useHaloDataParser } from '@/modules/halo/use-halo-data-parser'
import { describe, expect, it } from '@rstest/core'
import { createHaloExportFile } from './fixtures/provider-fixtures'

describe('useHaloDataParser', () => {
  it('parses halo 1.5/1.6 exports including single user objects and related resources', async () => {
    const data = await useHaloDataParser(createHaloExportFile()).parse()

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
      useHaloDataParser(createHaloExportFile({ version: '2.0.0' })).parse()
    ).rejects.toBe('暂不支持该版本的迁移，仅支持 Halo 1.5 / 1.6 版本')
  })
})
