import { sanitizeGhostHtml, useGhostDataParser } from '@/modules/ghost/use-ghost-data-parser'
import { describe, expect, it } from '@rstest/core'

function createGhostFile(data: Record<string, unknown>) {
  return new File([JSON.stringify(data)], 'ghost-export.json', { type: 'application/json' })
}

function createGhostExport(overrides: Record<string, unknown> = {}) {
  return {
    db: [
      {
        meta: {
          exported_on: 1710000000000,
          version: '6.28.0'
        },
        data: {
          benefits: [],
          custom_theme_settings: [],
          newsletters: [],
          offer_redemptions: [],
          offers: [],
          posts: [
            {
              id: 'post-1',
              uuid: 'post-uuid',
              title: 'Ghost Post',
              slug: 'ghost-post',
              html: `
                <p>Intro</p>
                <figure class="kg-card kg-gallery-card kg-width-wide">
                  <div class="kg-gallery-container">
                    <div class="kg-gallery-row">
                      <div class="kg-gallery-image">
                        <img src="https://demo.ghost.io/content/images/size/w600/2026/04/gallery-1.jpg" width="1200" height="800" srcset="demo 1200w" sizes="100vw">
                      </div>
                      <div class="kg-gallery-image">
                        <img src="https://demo.ghost.io/content/images/2026/04/gallery-2.jpg" width="600" height="600">
                      </div>
                    </div>
                  </div>
                  <figcaption>Gallery caption</figcaption>
                </figure>
                <div class="kg-card kg-file-card">
                  <a class="kg-file-card-container" href="https://demo.ghost.io/content/files/2026/04/demo.pdf" title="Download">
                    <div class="kg-file-card-contents">
                      <div class="kg-file-card-title">Sample File</div>
                      <div class="kg-file-card-caption">Sample file caption</div>
                      <div class="kg-file-card-metadata">
                        <div class="kg-file-card-filename">demo.pdf</div>
                        <div class="kg-file-card-filesize">488 KB</div>
                      </div>
                    </div>
                  </a>
                </div>
                <figure class="kg-card kg-video-card">
                  <div class="kg-video-container">
                    <video
                      src="https://demo.ghost.io/content/files/2026/04/video.mp4"
                      poster="https://demo.ghost.io/content/images/size/w1000/2026/04/video-poster.jpg"
                      width="640"
                      height="480"
                      playsinline
                      preload="metadata"
                    ></video>
                  </div>
                  <figcaption>Video caption</figcaption>
                </figure>
                <div class="kg-card kg-audio-card">
                  <img src="https://demo.ghost.io/content/images/2026/04/audio-thumb.png" alt="audio-thumbnail" class="kg-audio-thumbnail">
                  <div class="kg-audio-player-container">
                    <audio src="https://demo.ghost.io/content/files/2026/04/audio.mp3" preload="metadata"></audio>
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
                      <img src="https://demo.ghost.io/content/images/2026/04/bookmark.jpg" alt="bookmark">
                    </div>
                  </a>
                </figure>
              `,
              mobiledoc: null,
              lexical: null,
              plaintext: 'Ghost plain text',
              feature_image:
                'https://demo.ghost.io/content/images/size/w1200/2026/04/post-cover.jpg',
              custom_excerpt: 'Ghost custom excerpt',
              comment_id: 'legacy-post-1',
              type: 'post',
              status: 'published',
              visibility: 'public',
              created_at: '2026-04-01 00:00:00',
              updated_at: '2026-04-01 01:00:00',
              published_at: '2026-04-01 02:00:00',
              featured: 1,
              email_recipient_filter: 'all',
              show_title_and_feature_image: 1,
              locale: null,
              canonical_url: null,
              codeinjection_head: null,
              codeinjection_foot: null,
              custom_template: null,
              newsletter_id: null
            },
            {
              id: 'page-1',
              uuid: 'page-uuid',
              title: 'Ghost Page',
              slug: 'ghost-page',
              html: '<p>Page content</p>',
              mobiledoc: null,
              lexical: null,
              plaintext: '',
              feature_image: null,
              custom_excerpt: null,
              comment_id: 'legacy-page-1',
              type: 'page',
              status: 'draft',
              visibility: 'members',
              created_at: '2026-04-02 00:00:00',
              updated_at: '2026-04-02 01:00:00',
              published_at: null,
              featured: 0,
              email_recipient_filter: 'none',
              show_title_and_feature_image: 1,
              locale: null,
              canonical_url: null,
              codeinjection_head: null,
              codeinjection_foot: null,
              custom_template: null,
              newsletter_id: null
            }
          ],
          posts_authors: [
            { id: 'pa-1', post_id: 'post-1', author_id: 'user-1', sort_order: 1 },
            { id: 'pa-2', post_id: 'page-1', author_id: 'user-1', sort_order: 1 }
          ],
          posts_meta: [],
          posts_products: [],
          posts_tags: [{ id: 'pt-1', post_id: 'post-1', tag_id: 'tag-1', sort_order: 0 }],
          products: [],
          products_benefits: [],
          roles: [],
          roles_users: [],
          settings: [],
          snippets: [],
          stripe_prices: [],
          stripe_products: [],
          tags: [
            {
              id: 'tag-1',
              name: 'Ghost Tag',
              slug: 'ghost-tag',
              accent_color: '#ffffff',
              feature_image: 'https://demo.ghost.io/content/images/2026/04/tag-cover.jpg',
              canonical_url: null,
              codeinjection_foot: null,
              codeinjection_head: null,
              created_at: '2026-04-01 00:00:00',
              description: null,
              meta_description: null,
              meta_title: null,
              og_description: null,
              og_image: null,
              og_title: null,
              parent_id: null,
              twitter_description: null,
              twitter_image: null,
              twitter_title: null,
              updated_at: '2026-04-01 00:00:00',
              visibility: 'public'
            }
          ],
          users: [
            {
              id: 'user-1',
              name: 'Ghost Admin',
              slug: 'ghost-admin',
              email: 'ghost@example.com',
              profile_image: 'https://demo.ghost.io/content/images/2026/04/avatar.jpg',
              bio: 'bio',
              website: 'https://ghost.example.com',
              accessibility: 'false',
              comment_notifications: 0,
              cover_image: null,
              created_at: '2026-04-01 00:00:00',
              donation_notifications: 0,
              facebook: null,
              free_member_signup_notification: 0,
              last_seen: '2026-04-01 00:00:00',
              locale: null,
              location: null,
              mention_notifications: 0,
              meta_description: null,
              meta_title: null,
              milestone_notifications: 0,
              paid_subscription_canceled_notification: 0,
              paid_subscription_started_notification: 0,
              password: 'hash',
              recommendation_notifications: 0,
              status: 'active',
              tour: null,
              twitter: null,
              updated_at: '2026-04-01 00:00:00',
              visibility: 'public'
            }
          ],
          ...overrides
        }
      }
    ]
  }
}

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
    const data = await useGhostDataParser(createGhostFile(createGhostExport())).parse()

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
})
