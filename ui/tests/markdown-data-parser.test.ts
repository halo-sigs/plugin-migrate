import {
  extractMarkdownAttachments,
  normalizeAttachmentReference,
  resolveMarkdownAttachmentPath
} from '@/modules/markdown/markdown-attachments'
import {
  normalizeMarkdownMetadata,
  parseMarkdownFrontmatter
} from '@/modules/markdown/markdown-frontmatter'
import { useMarkdownDataParser } from '@/modules/markdown/use-markdown-data-parser'
import { describe, expect, it } from '@rstest/core'

function createMarkdownFile(name: string, content: string, relativePath?: string) {
  const file = new File([content], name, { type: 'text/markdown' })

  if (relativePath) {
    Object.defineProperty(file, 'webkitRelativePath', {
      configurable: true,
      value: relativePath
    })
  }

  return file
}

describe('markdown frontmatter helpers', () => {
  it('parses yaml frontmatter and normalizes metadata aliases', () => {
    const parsed = parseMarkdownFrontmatter(`---
title: Hello Halo
description: Summary from description
category: Notes
tags: demo, markdown
publishDate: "2026-04-18T10:00:00+08:00"
draft: true
layout: page
---

# Heading
`)

    expect(parsed.body).toContain('# Heading')
    expect(parsed.metadata).toEqual({
      title: 'Hello Halo',
      slug: undefined,
      excerpt: 'Summary from description',
      cover: undefined,
      categories: ['Notes'],
      tags: ['demo', 'markdown'],
      publishTime: '2026-04-18T02:00:00.000Z',
      publish: false,
      kind: 'page'
    })
  })

  it('parses toml and json frontmatter', () => {
    const tomlParsed = parseMarkdownFrontmatter(`+++
title = "Toml Post"
tags = ["alpha", "beta"]
+++

Toml body
`)

    const jsonParsed = parseMarkdownFrontmatter(`{
  "title": "Json Post",
  "summary": "Json summary",
  "date": "2026-04-18T12:00:00+08:00"
}

Json body
`)

    expect(tomlParsed.metadata.title).toBe('Toml Post')
    expect(tomlParsed.metadata.tags).toEqual(['alpha', 'beta'])
    expect(jsonParsed.metadata.excerpt).toBe('Json summary')
    expect(jsonParsed.metadata.publishTime).toBe('2026-04-18T04:00:00.000Z')
  })

  it('normalizes metadata without frontmatter parsing', () => {
    expect(
      normalizeMarkdownMetadata({
        Title: 'Loose Keys',
        Thumbnail: '/images/cover.png',
        Categories: ['Docs', 'Guide'],
        Tag: 'halo',
        CreatedAt: '2026-04-18',
        draft: 'false'
      })
    ).toEqual({
      title: 'Loose Keys',
      slug: undefined,
      excerpt: undefined,
      cover: '/images/cover.png',
      categories: ['Docs', 'Guide'],
      tags: ['halo'],
      publishTime: '2026-04-18T00:00:00.000Z',
      publish: true,
      kind: 'post'
    })
  })
})

describe('markdown attachment helpers', () => {
  it('extracts local references from markdown, html, and hugo figure shortcodes', () => {
    const attachments = extractMarkdownAttachments(
      `
![cover](../images/cover.png)
[manual](../files/guide.pdf)
<img src="/assets/poster.jpg" />
<a href="https://example.com/remote.pdf">remote</a>
{{< figure src="gallery/photo.webp" >}}
      `,
      'content/posts/hello.md',
      () => 'id'
    )

    expect(attachments.map((item) => ({ path: item.path, url: item.url }))).toEqual([
      { path: 'content/images/cover.png', url: '../images/cover.png' },
      { path: 'content/files/guide.pdf', url: '../files/guide.pdf' },
      { path: 'assets/poster.jpg', url: '/assets/poster.jpg' },
      { path: 'content/posts/gallery/photo.webp', url: 'gallery/photo.webp' }
    ])
  })

  it('normalizes references and resolves relative paths', () => {
    expect(normalizeAttachmentReference('<images/photo.png>')).toBe('images/photo.png')
    expect(normalizeAttachmentReference('files/doc.pdf "Guide"')).toBe('files/doc.pdf')
    expect(resolveMarkdownAttachmentPath('../images/photo.png', 'posts/2026/hello.md')).toBe(
      'posts/images/photo.png'
    )
    expect(resolveMarkdownAttachmentPath('/images/photo.png', 'posts/2026/hello.md')).toBe(
      'images/photo.png'
    )
  })
})

describe('markdown data parser', () => {
  it('parses markdown files from a directory into posts, pages, tags, categories, and attachments', async () => {
    const postFile = createMarkdownFile(
      'hello.md',
      `---
title: Hello Markdown
slug: hello-markdown
excerpt: Custom excerpt
cover: ../images/post-cover.png
categories:
  - Notes
tags:
  - Halo
  - Markdown
date: 2026-04-18T12:00:00+08:00
---

# Hello

![Cover](../images/cover.png)

[Manual](../files/manual.pdf)
`,
      'content/posts/hello.md'
    )

    const pageFile = createMarkdownFile(
      'about.markdown',
      `+++
title = "About"
layout = "page"
draft = true
category = "Pages"
feature_image = "../images/page-cover.png"
+++

About body
`,
      'content/about.markdown'
    )

    const fallbackFile = createMarkdownFile(
      'untitled.md',
      `No frontmatter

<img src="./images/inline.png" />
`,
      'content/posts/untitled.md'
    )

    const chineseTitleFile = createMarkdownFile(
      'hello-world.md',
      `---
title: 你好世界
---

Title only
`,
      'content/posts/hello-world.md'
    )

    const data = await useMarkdownDataParser([
      postFile,
      pageFile,
      fallbackFile,
      chineseTitleFile
    ]).parse()

    expect(data.sourceProvider).toBe('markdown')
    expect(data.posts).toHaveLength(3)
    expect(data.pages).toHaveLength(1)
    expect(data.categories).toHaveLength(2)
    expect(data.tags).toHaveLength(2)
    expect(data.attachments?.map((item) => item.path)).toEqual([
      'content/files/manual.pdf',
      'content/images/cover.png',
      'content/images/post-cover.png',
      'content/posts/images/inline.png',
      'images/page-cover.png'
    ])

    const post = data.posts?.find((item) => item.postRequest.post.spec.slug === 'hello-markdown')
    expect(post?.postRequest.post.spec.publish).toBe(true)
    expect(post?.postRequest.post.spec.publishTime).toBe('2026-04-18T04:00:00.000Z')
    expect(post?.postRequest.post.spec.cover).toBe('../images/post-cover.png')
    expect(post?.postRequest.post.spec.excerpt).toEqual({
      autoGenerate: false,
      raw: 'Custom excerpt'
    })
    expect(post?.postRequest.content.rawType).toBe('markdown')
    expect(post?.postRequest.content.content).toContain('<h1 id="Hello">Hello</h1>')

    const fallbackPost = data.posts?.find((item) => item.postRequest.post.spec.title === 'untitled')
    expect(fallbackPost?.postRequest.post.spec.slug).toBe('untitled')

    const chineseTitlePost = data.posts?.find(
      (item) => item.postRequest.post.spec.title === '你好世界'
    )
    expect(chineseTitlePost?.postRequest.post.spec.slug).toBe('hello-world')

    const page = data.pages?.[0]
    expect(page?.singlePageRequest.page.spec.title).toBe('About')
    expect(page?.singlePageRequest.page.spec.publish).toBe(false)
    expect(page?.singlePageRequest.page.spec.cover).toBe('../images/page-cover.png')
  })

  it('fails with file name when frontmatter is invalid', async () => {
    const invalidFile = createMarkdownFile(
      'broken.md',
      `---
title: Broken
tags:
  - demo

Body
`
    )

    await expect(useMarkdownDataParser([invalidFile]).parse()).rejects.toThrow(
      '解析 Markdown 文件失败：broken.md'
    )
  })
})
