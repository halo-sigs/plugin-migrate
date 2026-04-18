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
})
