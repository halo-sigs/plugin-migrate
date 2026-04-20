import { sanitizeGhostHtml, useGhostDataParser } from '@/modules/ghost/use-ghost-data-parser'
import { describe, expect, it } from '@rstest/core'
import { createGhostExport, createGhostExportFile } from './fixtures/provider-fixtures'

describe('ghost parser helpers', () => {
  it('sanitizes common ghost cards into stable html', () => {
    const sanitized = sanitizeGhostHtml(`
      <figure class="kg-card kg-gallery-card kg-width-wide">
        <div class="kg-gallery-container">
          <div class="kg-gallery-row">
            <div class="kg-gallery-image">
              <img src="/content/images/2026/04/gallery-1.jpg" width="1200" height="800" srcset="demo 1200w" sizes="100vw">
            </div>
            <div class="kg-gallery-image">
              <img src="/content/images/2026/04/gallery-2.jpg" width="600" height="600">
            </div>
          </div>
        </div>
        <figcaption>Gallery caption</figcaption>
      </figure>
      <div class="kg-card kg-file-card">
        <a class="kg-file-card-container" href="/content/files/2026/04/demo.pdf">
          <div class="kg-file-card-title">Sample File</div>
          <div class="kg-file-card-caption">Sample file caption</div>
          <div class="kg-file-card-filename">demo.pdf</div>
          <div class="kg-file-card-filesize">488 KB</div>
        </a>
      </div>
      <figure class="kg-card kg-video-card">
        <div class="kg-video-container">
          <video
            src="/content/files/2026/04/video.mp4"
            poster="/content/images/2026/04/video-poster.jpg"
            width="640"
            height="480"
            playsinline
            preload="metadata"
          ></video>
        </div>
        <figcaption>Video caption</figcaption>
      </figure>
      <div class="kg-card kg-audio-card">
        <img src="/content/images/2026/04/audio-thumb.png" alt="audio-thumbnail" class="kg-audio-thumbnail">
        <div class="kg-audio-player-container">
          <audio src="/content/files/2026/04/audio.mp3" preload="metadata"></audio>
          <div class="kg-audio-title">Audio Title</div>
        </div>
      </div>
      <figure class="kg-card kg-bookmark-card">
        <a href="https://ghost.org/" class="kg-bookmark-container">
          <div class="kg-bookmark-content">
            <div class="kg-bookmark-title">The bookmark card</div>
            <div class="kg-bookmark-description">Bookmark description</div>
            <div class="kg-bookmark-metadata">
              <span class="kg-bookmark-author">Ghost</span>
              <span class="kg-bookmark-publisher">Docs</span>
            </div>
          </div>
          <div class="kg-bookmark-thumbnail">
            <img src="/content/images/2026/04/bookmark.jpg" alt="bookmark">
          </div>
        </a>
      </figure>
    `)

    expect(sanitized).toContain('data-type="gallery"')
    expect(sanitized).toContain('data-type="gallery-group"')
    expect(sanitized).toContain('Gallery caption')
    expect(sanitized).not.toContain('srcset=')
    expect(sanitized).not.toContain('sizes=')
    expect(sanitized).toContain('<a href="/content/files/2026/04/demo.pdf">Sample File</a>')
    expect(sanitized).toContain('demo.pdf · 488 KB')
    expect(sanitized).toContain('<video src="/content/files/2026/04/video.mp4"')
    expect(sanitized).toContain('poster="/content/images/2026/04/video-poster.jpg"')
    expect(sanitized).toContain('controls=""')
    expect(sanitized).toContain('<audio src="/content/files/2026/04/audio.mp3"')
    expect(sanitized).toContain('Audio Title')
    expect(sanitized).toContain('<img src="/content/images/2026/04/bookmark.jpg" alt="bookmark">')
    expect(sanitized).toContain('<a href="https://ghost.org/">The bookmark card</a>')
    expect(sanitized).toContain('Bookmark description')
    expect(sanitized).toContain('Ghost · Docs')
  })
})

describe('useGhostDataParser', () => {
  it('parses posts pages users tags and extracts local attachments from common ghost cards', async () => {
    const data = await useGhostDataParser(createGhostExportFile()).parse()

    expect(data.sourceProvider).toBe('ghost')
    expect(data.users).toEqual([
      expect.objectContaining({
        id: 'ghost:user-1',
        provider: 'ghost',
        displayName: 'Ghost Admin',
        email: 'ghost@example.com'
      })
    ])
    expect(data.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metadata: { name: 'tag-1' },
          spec: expect.objectContaining({ displayName: 'Ghost Tag', slug: 'ghost-tag' })
        })
      ])
    )
    expect(data.posts?.[0]).toMatchObject({
      ownerRef: { sourceId: 'ghost:user-1' },
      postRequest: {
        post: {
          metadata: {
            name: 'post-1',
            annotations: {
              'plugin-migrate.halo.run/ghost-visibility': 'public'
            }
          },
          spec: {
            title: 'Ghost Post',
            slug: 'ghost-post',
            cover: 'https://demo.ghost.io/content/images/size/w1200/2026/04/post-cover.jpg',
            publish: true,
            pinned: true,
            visible: 'PUBLIC',
            tags: ['tag-1'],
            excerpt: {
              autoGenerate: false,
              raw: 'Ghost custom excerpt'
            }
          }
        },
        content: {
          rawType: 'HTML'
        }
      }
    })
    expect(data.posts?.[0].postRequest.content.raw).toContain('data-type="gallery"')
    expect(data.posts?.[0].postRequest.content.raw).toContain(
      '<a href="https://demo.ghost.io/content/files/2026/04/demo.pdf">Sample File</a>'
    )
    expect(data.posts?.[0].postRequest.content.raw).toContain(
      '<video src="https://demo.ghost.io/content/files/2026/04/video.mp4"'
    )
    expect(data.posts?.[0].postRequest.content.raw).toContain(
      '<audio src="https://demo.ghost.io/content/files/2026/04/audio.mp3"'
    )
    expect(data.posts?.[0].postRequest.content.raw).toContain(
      '<a href="https://ghost.org/">The bookmark card</a>'
    )

    expect(data.pages?.[0]).toMatchObject({
      ownerRef: { sourceId: 'ghost:user-1' },
      singlePageRequest: {
        page: {
          metadata: {
            name: 'page-1',
            annotations: {
              'plugin-migrate.halo.run/ghost-visibility': 'members'
            }
          },
          spec: {
            title: 'Ghost Page',
            publish: false,
            visible: 'PRIVATE',
            excerpt: {
              autoGenerate: true,
              raw: ''
            }
          }
        },
        content: {
          raw: '<p>Page content</p>'
        }
      }
    })

    expect(data.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'content/images/2026/04/post-cover.jpg',
          type: 'LOCAL'
        }),
        expect.objectContaining({
          path: 'content/images/2026/04/gallery-1.jpg',
          type: 'LOCAL'
        }),
        expect.objectContaining({
          path: 'content/files/2026/04/demo.pdf',
          type: 'LOCAL'
        }),
        expect.objectContaining({
          path: 'content/files/2026/04/video.mp4',
          type: 'LOCAL'
        }),
        expect.objectContaining({
          path: 'content/files/2026/04/audio.mp3',
          type: 'LOCAL'
        }),
        expect.objectContaining({
          path: 'content/images/2026/04/bookmark.jpg',
          type: 'LOCAL'
        }),
        expect.objectContaining({
          path: 'content/images/2026/04/tag-cover.jpg',
          type: 'LOCAL'
        })
      ])
    )
  })

  it('falls back to plaintext html and ignores sparse relations safely', async () => {
    const data = await useGhostDataParser(
      createGhostExportFile({
        posts: [
          {
            ...createGhostExport().db[0].data.posts[0],
            id: 'post-fallback',
            slug: 'post-fallback',
            html: '',
            plaintext: 'Fallback line 1\n\nFallback line 2',
            lexical: '{"root":{"children":[]}}',
            feature_image: '',
            custom_excerpt: ''
          }
        ],
        posts_tags: [
          { id: 'missing-tag', post_id: 'post-fallback', tag_id: 'tag-missing', sort_order: 0 }
        ],
        posts_authors: [
          {
            id: 'missing-author',
            post_id: 'post-fallback',
            author_id: 'user-missing',
            sort_order: 0
          }
        ],
        tags: [],
        users: []
      })
    ).parse()

    expect(data.posts?.[0]).toMatchObject({
      ownerRef: undefined,
      postRequest: {
        post: {
          spec: {
            cover: undefined,
            tags: [],
            excerpt: {
              autoGenerate: false,
              raw: 'Fallback line 1\n\nFallback line 2'
            }
          }
        },
        content: {
          rawType: 'HTML',
          raw: '<p>Fallback line 1</p><p>Fallback line 2</p>'
        }
      }
    })
    expect(data.attachments).toEqual([])
    expect(data.tags).toEqual([])
    expect(data.users).toEqual([])
  })
})
