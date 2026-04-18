import SparkMD5 from 'spark-md5'

export function createWordPressWxrFile() {
  return new File([createWordPressWxr()], 'wordpress-export.xml', { type: 'application/xml' })
}

export function createWordPressWxr() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
  <channel>
    <title>Demo Blog</title>
    <wp:wxr_version>1.2</wp:wxr_version>
    <wp:author>
      <wp:author_id>7</wp:author_id>
      <wp:author_login><![CDATA[admin]]></wp:author_login>
      <wp:author_email><![CDATA[admin@example.com]]></wp:author_email>
      <wp:author_display_name><![CDATA[WP Admin]]></wp:author_display_name>
    </wp:author>
    <wp:category>
      <wp:term_id>3</wp:term_id>
      <wp:category_nicename><![CDATA[notes]]></wp:category_nicename>
      <wp:category_parent><![CDATA[]]></wp:category_parent>
      <wp:cat_name><![CDATA[Notes]]></wp:cat_name>
      <wp:category_description><![CDATA[Category desc]]></wp:category_description>
    </wp:category>
    <wp:tag>
      <wp:term_id>5</wp:term_id>
      <wp:tag_slug><![CDATA[tips]]></wp:tag_slug>
      <wp:tag_name><![CDATA[Tips]]></wp:tag_name>
    </wp:tag>
    <item>
      <title><![CDATA[Attachment]]></title>
      <guid isPermaLink="false">https://example.com/wp-content/uploads/2026/04/cover-scaled.jpg</guid>
      <wp:post_id>200</wp:post_id>
      <wp:post_date><![CDATA[2026-04-17 10:00:00]]></wp:post_date>
      <wp:post_name><![CDATA[attachment]]></wp:post_name>
      <wp:status><![CDATA[inherit]]></wp:status>
      <wp:post_type><![CDATA[attachment]]></wp:post_type>
      <wp:attachment_url><![CDATA[https://example.com/wp-content/uploads/2026/04/cover-scaled.jpg]]></wp:attachment_url>
      <wp:postmeta>
        <wp:meta_key><![CDATA[_wp_attached_file]]></wp:meta_key>
        <wp:meta_value><![CDATA[2026/04/cover-scaled.jpg]]></wp:meta_value>
      </wp:postmeta>
      <wp:postmeta>
        <wp:meta_key><![CDATA[_wp_attachment_metadata]]></wp:meta_key>
        <wp:meta_value><![CDATA[a:6:{s:5:"width";i:1200;s:6:"height";i:800;s:4:"file";s:25:"2026/04/cover-scaled.jpg";s:5:"sizes";a:1:{s:5:"large";a:1:{s:4:"file";s:18:"cover-1024x576.jpg";}}s:14:"original_image";s:9:"cover.jpg";s:9:"mime_type";s:10:"image/jpeg";}]]></wp:meta_value>
      </wp:postmeta>
    </item>
    <item>
      <title><![CDATA[WordPress Post]]></title>
      <dc:creator><![CDATA[admin]]></dc:creator>
      <content:encoded><![CDATA[<p>Hello</p><figure class="wp-block-image"><img class="wp-image-200" src="https://example.com/wp-content/uploads/2026/04/cover-1024x576.jpg" /></figure>]]></content:encoded>
      <excerpt:encoded><![CDATA[Post excerpt]]></excerpt:encoded>
      <wp:post_id>100</wp:post_id>
      <wp:post_date><![CDATA[2026-04-18 10:00:00]]></wp:post_date>
      <wp:post_name><![CDATA[wordpress-post]]></wp:post_name>
      <wp:status><![CDATA[publish]]></wp:status>
      <wp:post_type><![CDATA[post]]></wp:post_type>
      <wp:comment_status><![CDATA[open]]></wp:comment_status>
      <wp:is_sticky>1</wp:is_sticky>
      <category domain="category" nicename="notes"><![CDATA[Notes]]></category>
      <category domain="post_tag" nicename="tips"><![CDATA[Tips]]></category>
      <wp:postmeta>
        <wp:meta_key><![CDATA[_thumbnail_id]]></wp:meta_key>
        <wp:meta_value><![CDATA[200]]></wp:meta_value>
      </wp:postmeta>
      <wp:comment>
        <wp:comment_id>501</wp:comment_id>
        <wp:comment_author><![CDATA[Comment User]]></wp:comment_author>
        <wp:comment_author_email><![CDATA[comment@example.com]]></wp:comment_author_email>
        <wp:comment_author_url><![CDATA[https://comment.example.com]]></wp:comment_author_url>
        <wp:comment_author_IP><![CDATA[127.0.0.1]]></wp:comment_author_IP>
        <wp:comment_date><![CDATA[2026-04-18 10:10:00]]></wp:comment_date>
        <wp:comment_content><![CDATA[First comment]]></wp:comment_content>
        <wp:comment_approved>1</wp:comment_approved>
        <wp:comment_parent>0</wp:comment_parent>
        <wp:comment_user_id>7</wp:comment_user_id>
      </wp:comment>
      <wp:comment>
        <wp:comment_id>502</wp:comment_id>
        <wp:comment_author><![CDATA[Reply User]]></wp:comment_author>
        <wp:comment_author_email><![CDATA[reply@example.com]]></wp:comment_author_email>
        <wp:comment_author_url><![CDATA[]]></wp:comment_author_url>
        <wp:comment_author_IP><![CDATA[127.0.0.2]]></wp:comment_author_IP>
        <wp:comment_date><![CDATA[2026-04-18 10:20:00]]></wp:comment_date>
        <wp:comment_content><![CDATA[Reply comment]]></wp:comment_content>
        <wp:comment_approved>1</wp:comment_approved>
        <wp:comment_parent>501</wp:comment_parent>
        <wp:comment_user_id>0</wp:comment_user_id>
      </wp:comment>
    </item>
    <item>
      <title><![CDATA[WordPress Page]]></title>
      <dc:creator><![CDATA[admin]]></dc:creator>
      <content:encoded><![CDATA[<p>Page body</p>]]></content:encoded>
      <excerpt:encoded><![CDATA[Page excerpt]]></excerpt:encoded>
      <wp:post_id>101</wp:post_id>
      <wp:post_date><![CDATA[2026-04-18 11:00:00]]></wp:post_date>
      <wp:post_name><![CDATA[wordpress-page]]></wp:post_name>
      <wp:status><![CDATA[draft]]></wp:status>
      <wp:post_type><![CDATA[page]]></wp:post_type>
      <wp:comment_status><![CDATA[closed]]></wp:comment_status>
      <wp:is_sticky>0</wp:is_sticky>
    </item>
  </channel>
</rss>`
}

type TypechoBackupRows = Record<string, Record<string, string | null>[]>

export function createTypechoBackupFile(overrides: Partial<TypechoBackupRows> = {}) {
  const rows: TypechoBackupRows = {
    contents: [
      {
        cid: '1',
        title: 'Typecho Post',
        slug: 'typecho-post',
        created: '1710000000',
        modified: '1710000100',
        text: 'Post body ![img](usr/uploads/2026/04/demo.png)',
        order: '0',
        authorId: '7',
        template: null,
        type: 'post',
        status: 'publish',
        password: null,
        commentsNum: '2',
        allowComment: '1',
        allowPing: '1',
        allowFeed: '1',
        parent: '0'
      },
      {
        cid: '2',
        title: 'Typecho Page',
        slug: 'typecho-page',
        created: '1710000200',
        modified: '1710000300',
        text: 'Page body',
        order: '0',
        authorId: '7',
        template: null,
        type: 'page',
        status: 'hidden',
        password: null,
        commentsNum: '0',
        allowComment: '0',
        allowPing: '1',
        allowFeed: '1',
        parent: '0'
      },
      {
        cid: '3',
        title: 'Attachment Title',
        slug: 'attachment-title',
        created: '1710000400',
        modified: '1710000500',
        text: '{"name":"demo.png","path":"/usr/uploads/2026/04/demo.png","size":"12","type":"image","mime":"image/png"}',
        order: '0',
        authorId: '7',
        template: null,
        type: 'attachment',
        status: 'publish',
        password: null,
        commentsNum: '0',
        allowComment: '0',
        allowPing: '0',
        allowFeed: '0',
        parent: '0'
      }
    ],
    comments: [
      {
        coid: '10',
        cid: '1',
        created: '1710000600',
        author: 'Typecho Admin',
        authorId: '7',
        ownerId: '7',
        mail: 'admin@example.com',
        url: 'https://example.com',
        ip: '127.0.0.1',
        agent: 'UA',
        text: 'First comment',
        type: 'comment',
        status: 'approved',
        parent: '0'
      },
      {
        coid: '11',
        cid: '1',
        created: '1710000700',
        author: 'Guest Reply',
        authorId: '0',
        ownerId: '7',
        mail: 'guest@example.com',
        url: null,
        ip: '127.0.0.2',
        agent: 'UA',
        text: 'Reply comment',
        type: 'comment',
        status: 'approved',
        parent: '10'
      }
    ],
    metas: [
      {
        mid: '20',
        name: 'Tech',
        slug: 'tech',
        type: 'category',
        description: null,
        count: '1',
        order: '0',
        parent: '0'
      },
      {
        mid: '21',
        name: 'Tips',
        slug: 'tips',
        type: 'tag',
        description: null,
        count: '1',
        order: '0',
        parent: '0'
      }
    ],
    relationships: [
      { cid: '1', mid: '20' },
      { cid: '1', mid: '21' }
    ],
    users: [
      {
        uid: '7',
        name: 'admin',
        password: null,
        mail: 'admin@example.com',
        url: 'https://example.com',
        screenName: 'Typecho Admin',
        created: '1710000000',
        activated: null,
        logged: null,
        group: 'administrator',
        authCode: null
      }
    ],
    ...overrides
  }

  return new File([buildTypechoBackup(rows)], 'typecho-backup.dat', {
    type: 'application/octet-stream'
  })
}

export function createGhostExportFile(overrides: Record<string, unknown> = {}) {
  return new File([JSON.stringify(createGhostExport(overrides))], 'ghost-export.json', {
    type: 'application/json'
  })
}

export function createGhostExport(overrides: Record<string, unknown> = {}) {
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

export function createHaloExportFile(overrides: Record<string, unknown> = {}) {
  return new File([JSON.stringify(createHaloExport(overrides))], 'halo-export.json', {
    type: 'application/json'
  })
}

export function createHaloExport(overrides: Record<string, unknown> = {}) {
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

function buildTypechoBackup(rows: Record<string, Record<string, string | null>[]>): Uint8Array {
  const version = 'V001'
  const encoder = new TextEncoder()
  const blocks: Uint8Array[] = []
  const types: Record<string, number> = {
    contents: 1,
    comments: 2,
    metas: 3,
    relationships: 4,
    users: 5
  }

  Object.entries(rows).forEach(([tableName, tableRows]) => {
    tableRows.forEach((row) => {
      const block = buildTypechoDataBlock(types[tableName], row, encoder)
      if (block) {
        blocks.push(block)
      }
    })
  })

  const header = encoder.encode(`%TYPECHO_BACKUP_${version}%`)
  const footer = encoder.encode(`%TYPECHO_BACKUP_${version}%`)
  const totalLength =
    header.length + footer.length + blocks.reduce((sum, block) => sum + block.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  result.set(header, offset)
  offset += header.length
  blocks.forEach((block) => {
    result.set(block, offset)
    offset += block.length
  })
  result.set(footer, offset)

  return result
}

function buildTypechoDataBlock(
  type: number | undefined,
  row: Record<string, string | null>,
  encoder: TextEncoder
) {
  if (!type) {
    return null
  }

  const schemaEntries = Object.entries(row).map(([key, value]) => [
    key,
    value === null ? null : encoder.encode(value).length
  ])
  const schema = Object.fromEntries(schemaEntries)
  const headerBytes = encoder.encode(JSON.stringify(schema))
  const bodyParts = Object.values(row)
    .filter((value): value is string => value !== null)
    .map((value) => encoder.encode(value))
  const bodyLength = bodyParts.reduce((sum, part) => sum + part.length, 0)
  const meta = new Uint8Array(8)
  const metaView = new DataView(meta.buffer)
  metaView.setUint16(0, type, true)
  metaView.setUint16(2, headerBytes.length, true)
  metaView.setUint32(4, bodyLength, true)

  const bodyBytes = new Uint8Array(bodyLength)
  let bodyOffset = 0
  bodyParts.forEach((part) => {
    bodyBytes.set(part, bodyOffset)
    bodyOffset += part.length
  })

  const hashSource = new Uint8Array(meta.length + headerBytes.length + bodyBytes.length)
  hashSource.set(meta, 0)
  hashSource.set(headerBytes, meta.length)
  hashSource.set(bodyBytes, meta.length + headerBytes.length)
  const md5 = encoder.encode(SparkMD5.ArrayBuffer.hash(hashSource.buffer))

  const result = new Uint8Array(meta.length + headerBytes.length + bodyBytes.length + md5.length)
  let offset = 0
  result.set(meta, offset)
  offset += meta.length
  result.set(headerBytes, offset)
  offset += headerBytes.length
  result.set(bodyBytes, offset)
  offset += bodyBytes.length
  result.set(md5, offset)

  return result
}
