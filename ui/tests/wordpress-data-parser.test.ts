import {
  createWordPressAttachmentResolver,
  sanitizeWordPressHtml,
  useWordPressDataParser
} from '@/modules/wordpress/use-wordpress-data-parser'
import { describe, expect, it } from '@rstest/core'
import { createWordPressWxr, createWordPressWxrFile } from './fixtures/provider-fixtures'

function createAttachmentItem(overrides: Record<string, unknown> = {}) {
  return {
    title: 'demo',
    guid: { value: 'https://example.com/wp-content/uploads/2026/04/image-scaled.jpg' },
    'wp:post_id': 42,
    'wp:attachment_url': 'https://example.com/wp-content/uploads/2026/04/image-scaled.jpg',
    'wp:postmeta': [
      {
        'wp:meta_key': '_wp_attached_file',
        'wp:meta_value': '2026/04/image-scaled.jpg'
      },
      {
        'wp:meta_key': '_wp_attachment_metadata',
        'wp:meta_value':
          'a:6:{s:5:"width";i:1200;s:6:"height";i:800;s:4:"file";s:24:"2026/04/image-scaled.jpg";s:5:"sizes";a:1:{s:5:"large";a:1:{s:4:"file";s:18:"image-1024x576.jpg";}}s:14:"original_image";s:9:"image.jpg";s:9:"mime_type";s:10:"image/jpeg";}'
      }
    ],
    ...overrides
  }
}

function createMediaAttachmentItem(
  id: number,
  filename: string,
  options: {
    mimeType?: string
    sizeFiles?: string[]
    originalImage?: string
  } = {}
) {
  const scaledName = options.originalImage ? filename.replace(/\.[^.]+$/, '-scaled.jpg') : filename
  const metadataParts = [
    's:5:"width";i:1200;',
    's:6:"height";i:800;',
    `s:4:"file";s:${`2026/04/${scaledName}`.length}:"2026/04/${scaledName}";`,
    `s:5:"sizes";a:${options.sizeFiles?.length || 0}:{${(options.sizeFiles || [])
      .map(
        (file, index) =>
          `s:${String(index).length}:"${index}";a:1:{s:4:"file";s:${file.length}:"${file}";}`
      )
      .join('')}}`,
    options.originalImage
      ? `s:14:"original_image";s:${options.originalImage.length}:"${options.originalImage}";`
      : '',
    `s:9:"mime_type";s:${(options.mimeType || 'application/octet-stream').length}:"${options.mimeType || 'application/octet-stream'}";`
  ].join('')

  return createAttachmentItem({
    title: filename,
    'wp:post_id': id,
    guid: { value: `https://example.com/wp-content/uploads/2026/04/${scaledName}` },
    'wp:attachment_url': `https://example.com/wp-content/uploads/2026/04/${scaledName}`,
    'wp:postmeta': [
      {
        'wp:meta_key': '_wp_attached_file',
        'wp:meta_value': `2026/04/${scaledName}`
      },
      {
        'wp:meta_key': '_wp_attachment_metadata',
        'wp:meta_value': `a:6:{${metadataParts}}`
      }
    ]
  })
}

describe('wordpress parser helpers', () => {
  it('resolves scaled attachment urls back to the original asset', () => {
    const resolver = createWordPressAttachmentResolver([createAttachmentItem()])

    expect(resolver.byId.get('42')).toBe('https://example.com/wp-content/uploads/2026/04/image.jpg')
    expect(
      resolver.byUrl.get('https://example.com/wp-content/uploads/2026/04/image-1024x576.jpg')
    ).toBe('https://example.com/wp-content/uploads/2026/04/image.jpg')
  })

  it('sanitizes wordpress media html and preserves attachment id based resolution', () => {
    const resolver = createWordPressAttachmentResolver([createAttachmentItem()])
    const html = `
      <!-- wp:image {"id":42} -->
      <figure class="wp-block-image">
        <img class="wp-image-42" src="https://example.com/wp-content/uploads/2026/04/image-1024x576.jpg" srcset="https://example.com/wp-content/uploads/2026/04/image-1024x576.jpg 1024w" />
        <figcaption>Caption</figcaption>
      </figure>
      <!-- /wp:image -->
      <a href="https://example.com/wp-content/uploads/2026/04/image-1024x576.jpg">file</a>
    `

    const sanitized = sanitizeWordPressHtml(html, resolver)

    expect(sanitized).not.toContain('<!-- wp:image')
    expect(sanitized).toContain('wp-image-42')
    expect(sanitized).toContain('https://example.com/wp-content/uploads/2026/04/image.jpg')
    expect(sanitized).not.toContain('srcset=')
    expect(sanitized).toContain('Caption')
  })

  it('normalizes gallery cover file video audio and embed blocks', () => {
    const resolver = createWordPressAttachmentResolver([
      createAttachmentItem(),
      createMediaAttachmentItem(50, 'cover.jpg', {
        mimeType: 'image/jpeg',
        sizeFiles: ['cover-1024x576.jpg'],
        originalImage: 'cover-original.jpg'
      }),
      createMediaAttachmentItem(60, 'video.mp4', {
        mimeType: 'video/mp4'
      }),
      createMediaAttachmentItem(61, 'poster.jpg', {
        mimeType: 'image/jpeg',
        sizeFiles: ['poster-1024x576.jpg'],
        originalImage: 'poster-original.jpg'
      }),
      createMediaAttachmentItem(70, 'audio.mp3', {
        mimeType: 'audio/mpeg'
      }),
      createMediaAttachmentItem(80, 'manual.pdf', {
        mimeType: 'application/pdf'
      })
    ])

    const html = `
      <figure class="wp-block-gallery columns-2">
        <figure class="wp-block-image"><img class="wp-image-42" width="1200" height="800" src="https://example.com/wp-content/uploads/2026/04/image-1024x576.jpg" /><figcaption>Gallery 1</figcaption></figure>
        <figure class="wp-block-image"><img width="600" height="600" src="https://example.com/wp-content/uploads/2026/04/cover-1024x576.jpg" /></figure>
      </figure>
      <div class="wp-block-cover" style="min-height:320px">
        <img class="wp-block-cover__image-background wp-image-50" src="https://example.com/wp-content/uploads/2026/04/cover-1024x576.jpg" />
        <span class="wp-block-cover__background" style="background-color: rgba(0,0,0,.4)"></span>
        <div class="wp-block-cover__inner-container"><p>Cover Content</p></div>
      </div>
      <div class="wp-block-file">
        <a href="https://example.com/wp-content/uploads/2026/04/manual.pdf">Manual</a>
        <a href="https://example.com/wp-content/uploads/2026/04/manual.pdf">Download</a>
      </div>
      <figure class="wp-block-video">
        <video controls src="https://example.com/wp-content/uploads/2026/04/video.mp4" poster="https://example.com/wp-content/uploads/2026/04/poster-1024x576.jpg">
          <source src="https://example.com/wp-content/uploads/2026/04/video.mp4" type="video/mp4" />
        </video>
        <figcaption>Video Caption</figcaption>
      </figure>
      <figure class="wp-block-audio">
        <audio controls src="https://example.com/wp-content/uploads/2026/04/audio.mp3"></audio>
        <figcaption>Audio Caption</figcaption>
      </figure>
      <figure class="wp-block-embed">
        <div class="wp-block-embed__wrapper"><iframe src="https://player.example.com/embed/123" allowfullscreen></iframe></div>
        <figcaption>Embed Caption</figcaption>
      </figure>
      <div class="wp-block-embed"><div class="wp-block-embed__wrapper">https://video.example.com/watch/abc</div></div>
    `

    const sanitized = sanitizeWordPressHtml(html, resolver)

    expect(sanitized).toContain('data-type="gallery"')
    expect(sanitized).toContain('data-group-size="2"')
    expect(sanitized).toContain('data-type="gallery-image"')
    expect(sanitized).toContain('https://example.com/wp-content/uploads/2026/04/cover-original.jpg')
    expect(sanitized).toContain('data-type="cover"')
    expect(sanitized).toContain('Cover Content')
    expect(sanitized).toContain(
      '<p><a href="https://example.com/wp-content/uploads/2026/04/manual.pdf">Manual</a>'
    )
    expect(sanitized).toContain(
      '<video src="https://example.com/wp-content/uploads/2026/04/video.mp4"'
    )
    expect(sanitized).toContain('controls=""')
    expect(sanitized).toContain(
      'poster="https://example.com/wp-content/uploads/2026/04/poster-original.jpg"'
    )
    expect(sanitized).toContain(
      '<audio src="https://example.com/wp-content/uploads/2026/04/audio.mp3"'
    )
    expect(sanitized).toContain('Video Caption')
    expect(sanitized).toContain('Audio Caption')
    expect(sanitized).toContain('<iframe src="https://player.example.com/embed/123"')
    expect(sanitized).toContain('allowfullscreen=""')
    expect(sanitized).toContain(
      '<a href="https://video.example.com/watch/abc">https://video.example.com/watch/abc</a>'
    )
  })

  it('keeps unresolved media references unchanged when no attachment match exists', () => {
    const resolver = createWordPressAttachmentResolver([createAttachmentItem()])
    const html = `
      <figure class="wp-block-image">
        <img src="https://example.com/wp-content/uploads/2026/04/missing.jpg" />
      </figure>
      <a href="https://example.com/wp-content/uploads/2026/04/manual.pdf">manual</a>
    `

    const sanitized = sanitizeWordPressHtml(html, resolver)

    expect(sanitized).toContain('https://example.com/wp-content/uploads/2026/04/missing.jpg')
    expect(sanitized).toContain('https://example.com/wp-content/uploads/2026/04/manual.pdf')
  })
})

describe('useWordPressDataParser', () => {
  it('parses users posts pages comments tags categories and attachments from a minimal wxr file', async () => {
    const data = await useWordPressDataParser(createWordPressWxrFile()).parse()

    expect(data.users).toEqual([
      expect.objectContaining({
        id: 'wordpress:7',
        provider: 'wordpress',
        displayName: 'WP Admin',
        email: 'admin@example.com'
      })
    ])
    expect(data.posts?.[0]).toMatchObject({
      ownerRef: { sourceId: 'wordpress:7' },
      postRequest: {
        post: {
          metadata: { name: '100' },
          spec: {
            title: 'WordPress Post',
            slug: 'wordpress-post',
            publish: true,
            pinned: true,
            allowComment: true,
            categories: ['3'],
            tags: ['5'],
            cover: 'https://example.com/wp-content/uploads/2026/04/cover.jpg'
          }
        }
      }
    })
    expect(data.posts?.[0].postRequest.content.raw).toContain(
      'https://example.com/wp-content/uploads/2026/04/cover.jpg'
    )
    expect(data.pages?.[0]).toMatchObject({
      ownerRef: { sourceId: 'wordpress:7' },
      singlePageRequest: {
        page: {
          metadata: { name: '101' },
          spec: {
            title: 'WordPress Page',
            slug: 'wordpress-page',
            publish: false,
            allowComment: false
          }
        }
      }
    })
    expect(data.comments?.map((item) => item.kind)).toEqual(['Comment', 'Reply'])
    expect(data.comments?.[0]).toMatchObject({
      ownerRef: { sourceId: 'wordpress:7' },
      spec: {
        subjectRef: { name: '100', kind: 'Post' }
      }
    })
    expect(data.comments?.[1]).toMatchObject({
      kind: 'Reply',
      spec: {
        commentName: '501',
        quoteReply: '501'
      }
    })
    expect(data.tags?.[0]).toMatchObject({
      metadata: { name: '5' },
      spec: { displayName: 'Tips', slug: 'tips' }
    })
    expect(data.categories?.[0]).toMatchObject({
      metadata: { name: '3' },
      spec: { displayName: 'Notes', slug: 'notes' }
    })
    expect(data.attachments?.[0]).toMatchObject({
      id: '200',
      name: 'Attachment',
      path: 'wp-content/uploads/2026/04/cover.jpg',
      type: 'LOCAL'
    })
  })

  it('parses numeric anonymous comment author names', async () => {
    const xml = createWordPressWxr()
      .replace(
        '<wp:comment_author><![CDATA[Reply User]]></wp:comment_author>',
        '<wp:comment_author><![CDATA[1900]]></wp:comment_author>'
      )
      .replace(
        '<wp:comment_author_email><![CDATA[reply@example.com]]></wp:comment_author_email>',
        '<wp:comment_author_email><![CDATA[]]></wp:comment_author_email>'
      )

    const data = await useWordPressDataParser(createWordPressWxrFile(xml)).parse()

    expect(data.comments?.[1]).toMatchObject({
      spec: {
        owner: {
          name: '1900@migrate.invalid',
          displayName: '1900'
        }
      }
    })
  })

  it('preserves empty comments with an invisible placeholder', async () => {
    const xml = createWordPressWxr()
      .replace(
        '<wp:comment_content><![CDATA[First comment]]></wp:comment_content>',
        '<wp:comment_content><![CDATA[]]></wp:comment_content>'
      )
      .replace(
        '<wp:comment_content><![CDATA[Reply comment]]></wp:comment_content>',
        '<wp:comment_content><![CDATA[😂]]></wp:comment_content>'
      )

    const data = await useWordPressDataParser(createWordPressWxrFile(xml)).parse()

    expect(data.comments).toEqual([
      expect.objectContaining({
        kind: 'Comment',
        metadata: { name: '501' },
        spec: expect.objectContaining({
          raw: '<!-- No Content -->',
          content: '<!-- No Content -->'
        })
      }),
      expect.objectContaining({
        kind: 'Reply',
        metadata: { name: '502' },
        spec: expect.objectContaining({
          raw: '😂',
          content: '😂',
          commentName: '501',
          quoteReply: '501'
        })
      })
    ])
  })

  it('derives attachment path from attachment url when metadata is sparse', async () => {
    const sparseAttachmentXml = createWordPressWxr().replace(
      /<item>\s*<title><!\[CDATA\[Attachment\]\]><\/title>[\s\S]*?<\/item>/,
      `<item>
      <title><![CDATA[]]></title>
      <guid isPermaLink="false">https://example.com/wp-content/uploads/2026/04/manual.pdf</guid>
      <wp:post_id>200</wp:post_id>
      <wp:post_date><![CDATA[2026-04-17 10:00:00]]></wp:post_date>
      <wp:post_name><![CDATA[attachment]]></wp:post_name>
      <wp:status><![CDATA[inherit]]></wp:status>
      <wp:post_type><![CDATA[attachment]]></wp:post_type>
      <wp:attachment_url><![CDATA[https://example.com/wp-content/uploads/2026/04/manual.pdf]]></wp:attachment_url>
    </item>`
    )

    const data = await useWordPressDataParser(createWordPressWxrFile(sparseAttachmentXml)).parse()

    expect(data.posts?.[0].postRequest.content.raw).toContain(
      'https://example.com/wp-content/uploads/2026/04/manual.pdf'
    )
    expect(data.attachments?.[0]).toMatchObject({
      id: '200',
      name: 'manual.pdf',
      path: 'wp-content/uploads/2026/04/manual.pdf',
      url: 'https://example.com/wp-content/uploads/2026/04/manual.pdf',
      type: 'LOCAL'
    })
  })

  it('maps nested comment trees to Halo replies and ignores comments on unsupported post types', async () => {
    const wxrWithNestedComments = createWordPressWxr()
      .replace(
        '</wp:comment>\n    </item>',
        `</wp:comment>
      <wp:comment>
        <wp:comment_id>503</wp:comment_id>
        <wp:comment_author><![CDATA[Nested Reply User]]></wp:comment_author>
        <wp:comment_author_email><![CDATA[nested@example.com]]></wp:comment_author_email>
        <wp:comment_author_url><![CDATA[]]></wp:comment_author_url>
        <wp:comment_author_IP><![CDATA[127.0.0.3]]></wp:comment_author_IP>
        <wp:comment_date><![CDATA[2026-04-18 10:30:00]]></wp:comment_date>
        <wp:comment_content><![CDATA[Nested reply comment]]></wp:comment_content>
        <wp:comment_approved>1</wp:comment_approved>
        <wp:comment_parent>502</wp:comment_parent>
        <wp:comment_user_id>0</wp:comment_user_id>
      </wp:comment>
    </item>`
      )
      .replace(
        '</channel>',
        `<item>
      <title><![CDATA[Product Review]]></title>
      <wp:post_id>999</wp:post_id>
      <wp:post_date><![CDATA[2026-04-18 12:00:00]]></wp:post_date>
      <wp:post_name><![CDATA[product-review]]></wp:post_name>
      <wp:status><![CDATA[publish]]></wp:status>
      <wp:post_type><![CDATA[product]]></wp:post_type>
      <wp:comment>
        <wp:comment_id>900</wp:comment_id>
        <wp:comment_author><![CDATA[Buyer]]></wp:comment_author>
        <wp:comment_author_email><![CDATA[buyer@example.com]]></wp:comment_author_email>
        <wp:comment_author_url><![CDATA[]]></wp:comment_author_url>
        <wp:comment_author_IP><![CDATA[127.0.0.9]]></wp:comment_author_IP>
        <wp:comment_date><![CDATA[2026-04-18 12:10:00]]></wp:comment_date>
        <wp:comment_content><![CDATA[Product review]]></wp:comment_content>
        <wp:comment_approved>1</wp:comment_approved>
        <wp:comment_parent>0</wp:comment_parent>
        <wp:comment_user_id>0</wp:comment_user_id>
      </wp:comment>
    </item>
  </channel>`
      )

    const data = await useWordPressDataParser(createWordPressWxrFile(wxrWithNestedComments)).parse()

    expect(data.comments?.map((item) => item.metadata?.name)).toEqual(['501', '502', '503'])
    expect(data.comments?.[1]).toMatchObject({
      kind: 'Reply',
      spec: {
        commentName: '501',
        quoteReply: '501'
      }
    })
    expect(data.comments?.[2]).toMatchObject({
      kind: 'Reply',
      spec: {
        commentName: '501',
        quoteReply: '502'
      }
    })
  })
})
