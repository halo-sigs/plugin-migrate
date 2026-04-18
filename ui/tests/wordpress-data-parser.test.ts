import {
  createWordPressAttachmentResolver,
  sanitizeWordPressHtml
} from '@/modules/wordpress/use-wordpress-data-parser'
import { describe, expect, it } from '@rstest/core'

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
})
