import { extractMarkdownAttachments } from '@/modules/markdown/markdown-attachments'
import {
  parseMarkdownFrontmatter,
  type NormalizedMarkdownMetadata
} from '@/modules/markdown/markdown-frontmatter'
import MarkdownItIdPlugin from '@/modules/markdown/markdown-it-id'
import type {
  MigrateAttachment,
  MigrateCategory,
  MigrateData,
  MigratePost,
  MigrateSinglePage,
  MigrateTag
} from '@/types'
import markdownit from 'markdown-it'
import { slugify } from 'transliteration'

const markdownRenderer = markdownit({
  html: true,
  xhtmlOut: true,
  breaks: true,
  linkify: true,
  typographer: true
}).use(MarkdownItIdPlugin)

interface ParsedMarkdownDocument {
  filePath: string
  title: string
  slug: string
  body: string
  html: string
  metadata: NormalizedMarkdownMetadata
  attachments: MigrateAttachment[]
}

export function useMarkdownDataParser(files: File[]) {
  const markdownFiles = collectMarkdownFiles(files)

  async function parse(): Promise<MigrateData> {
    if (markdownFiles.length === 0) {
      throw new Error('未找到可解析的 Markdown 文件')
    }

    const documents = await Promise.all(markdownFiles.map((file) => parseMarkdownFile(file)))
    const categories = buildCategories(documents)
    const tags = buildTags(documents)

    const posts: MigratePost[] = []
    const pages: MigrateSinglePage[] = []

    documents.forEach((document) => {
      if (document.metadata.kind === 'page') {
        pages.push(createPage(document))
        return
      }

      posts.push(createPost(document, categories, tags))
    })

    const attachments = dedupeAttachments(documents.flatMap((document) => document.attachments))

    return {
      sourceProvider: 'markdown',
      categories: [...categories.values()],
      tags: [...tags.values()],
      posts,
      pages,
      attachments: attachments.length > 0 ? attachments : undefined
    }
  }

  return {
    parse
  }
}

export function collectMarkdownFiles(files: File[]) {
  return files
    .filter((file) => /\.(md|markdown)$/i.test(file.name))
    .sort((a, b) => getFilePath(a).localeCompare(getFilePath(b)))
}

async function parseMarkdownFile(file: File): Promise<ParsedMarkdownDocument> {
  const filePath = getFilePath(file)

  try {
    const content = await readFileContent(file)
    const parsed = parseMarkdownFrontmatter(content)
    const fileBaseName = getFileBaseName(file.name)
    const title = parsed.metadata.title || fileBaseName
    const slug = parsed.metadata.slug || generateSlug(fileBaseName)
    const body = parsed.body

    return {
      filePath,
      title,
      slug,
      body,
      html: markdownRenderer.render(body),
      metadata: parsed.metadata,
      attachments: extractMarkdownAttachments(body, filePath, createRandomId)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`解析 Markdown 文件失败：${filePath}，${message}`)
  }
}

function buildCategories(documents: ParsedMarkdownDocument[]) {
  const categories = new Map<string, MigrateCategory>()

  documents.forEach((document) => {
    document.metadata.categories.forEach((categoryName) => {
      if (categories.has(categoryName)) {
        return
      }

      categories.set(categoryName, {
        metadata: {
          name: createRandomId()
        },
        kind: 'Category',
        apiVersion: 'content.halo.run/v1alpha1',
        spec: {
          displayName: categoryName,
          slug: generateSlug(categoryName),
          priority: 0,
          children: []
        }
      })
    })
  })

  return categories
}

function buildTags(documents: ParsedMarkdownDocument[]) {
  const tags = new Map<string, MigrateTag>()

  documents.forEach((document) => {
    document.metadata.tags.forEach((tagName) => {
      if (tags.has(tagName)) {
        return
      }

      tags.set(tagName, {
        metadata: {
          name: createRandomId()
        },
        kind: 'Tag',
        apiVersion: 'content.halo.run/v1alpha1',
        spec: {
          displayName: tagName,
          slug: generateSlug(tagName)
        }
      })
    })
  })

  return tags
}

function createPost(
  document: ParsedMarkdownDocument,
  categories: Map<string, MigrateCategory>,
  tags: Map<string, MigrateTag>
): MigratePost {
  return {
    postRequest: {
      post: {
        spec: {
          title: document.title,
          slug: document.slug,
          publishTime: document.metadata.publishTime,
          publish: document.metadata.publish,
          deleted: false,
          pinned: false,
          allowComment: true,
          priority: 0,
          excerpt: createExcerpt(document.metadata.excerpt),
          visible: 'PUBLIC',
          tags: document.metadata.tags
            .map((tagName) => tags.get(tagName)?.metadata.name)
            .filter((value): value is string => !!value),
          categories: document.metadata.categories
            .map((categoryName) => categories.get(categoryName)?.metadata.name)
            .filter((value): value is string => !!value)
        },
        apiVersion: 'content.halo.run/v1alpha1',
        kind: 'Post',
        metadata: {
          name: createRandomId()
        }
      },
      content: {
        raw: document.body,
        content: document.html,
        rawType: 'markdown'
      }
    }
  }
}

function createPage(document: ParsedMarkdownDocument): MigrateSinglePage {
  return {
    singlePageRequest: {
      page: {
        spec: {
          title: document.title,
          slug: document.slug,
          template: '',
          publish: document.metadata.publish,
          publishTime: document.metadata.publishTime,
          deleted: false,
          pinned: false,
          allowComment: true,
          visible: 'PUBLIC',
          priority: 0,
          excerpt: createExcerpt(document.metadata.excerpt),
          htmlMetas: []
        },
        apiVersion: 'content.halo.run/v1alpha1',
        kind: 'SinglePage',
        metadata: {
          name: createRandomId()
        }
      },
      content: {
        raw: document.body,
        content: document.html,
        rawType: 'markdown'
      }
    }
  }
}

function createExcerpt(excerpt?: string) {
  if (!excerpt) {
    return {
      autoGenerate: true
    }
  }

  return {
    autoGenerate: false,
    raw: excerpt
  }
}

function dedupeAttachments(attachments: MigrateAttachment[]) {
  const seenPaths = new Set<string>()

  return attachments
    .filter((attachment) => {
      if (seenPaths.has(attachment.path)) {
        return false
      }

      seenPaths.add(attachment.path)
      return true
    })
    .sort((left, right) => left.path.localeCompare(right.path))
}

function getFilePath(file: File) {
  return file.webkitRelativePath || file.name
}

function getFileBaseName(fileName: string) {
  return fileName.replace(/\.(md|markdown)$/i, '')
}

function generateSlug(value: string) {
  return slugify(value, { trim: true })
}

function createRandomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `migrate-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

function readFileContent(file: File) {
  if (typeof file.text === 'function') {
    return file.text()
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'))
    reader.readAsText(file)
  })
}
