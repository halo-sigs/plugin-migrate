import { normalizePath } from '@/composables/use-attachment-preprocessor'
import type { MigrateAttachment } from '@/types'

const ATTACHMENT_FILE_RE =
  /\.(?:png|jpe?g|gif|webp|svg|bmp|ico|avif|mp4|webm|ogg|mov|mp3|wav|aac|flac|m4a|pdf|docx?|xlsx?|pptx?|zip|rar|7z|tar|gz|bz2|xz)$/i

export function extractMarkdownAttachments(
  content: string,
  filePath: string,
  createId: () => string
): MigrateAttachment[] {
  const seenPaths = new Set<string>()
  const attachments: MigrateAttachment[] = []

  const addAttachment = (rawReference: string, force = false) => {
    const reference = normalizeAttachmentReference(rawReference)
    if (!isLocalAttachmentReference(reference)) {
      return
    }

    if (!force && !looksLikeAttachmentReference(reference)) {
      return
    }

    const path = resolveMarkdownAttachmentPath(reference, filePath)
    if (!path || seenPaths.has(path)) {
      return
    }

    seenPaths.add(path)
    attachments.push({
      id: createId(),
      name: path.split('/').pop() || 'attachment',
      path,
      url: reference,
      type: 'LOCAL'
    })
  }

  extractMarkdownImageReferences(content).forEach((reference) => addAttachment(reference, true))
  extractMarkdownLinkReferences(content).forEach((reference) => addAttachment(reference))
  extractMarkdownHtmlReferences(content).forEach(({ url, force }) => addAttachment(url, force))
  extractHugoFigureShortcodes(content).forEach((reference) => addAttachment(reference, true))

  return attachments
}

export function normalizeAttachmentReference(reference: string) {
  const normalized = reference.trim()
  if (!normalized) {
    return ''
  }

  const wrapped = normalized.match(/^<(.+)>$/)
  const unwrapped = wrapped ? wrapped[1].trim() : normalized
  const titled = unwrapped.match(/^(\S+)\s+(?:"[^"]*"|'[^']*')$/)

  return titled ? titled[1] : unwrapped
}

export function isLocalAttachmentReference(reference: string) {
  const normalized = reference.trim()
  if (!normalized) {
    return false
  }

  if (
    normalized.startsWith('#') ||
    normalized.startsWith('//') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('mailto:') ||
    normalized.startsWith('tel:') ||
    normalized.startsWith('javascript:')
  ) {
    return false
  }

  return !/^[a-z][a-z0-9+.-]*:/i.test(normalized)
}

export function looksLikeAttachmentReference(reference: string) {
  return ATTACHMENT_FILE_RE.test(reference.split(/[?#]/)[0] || '')
}

export function resolveMarkdownAttachmentPath(reference: string, filePath: string) {
  const cleanReference = reference.split(/[?#]/)[0]?.replace(/\\/g, '/')
  if (!cleanReference) {
    return ''
  }

  if (cleanReference.startsWith('/')) {
    return normalizePath(cleanReference)
  }

  const fileSegments = normalizePath(filePath).split('/').filter(Boolean)
  const baseSegments = fileSegments.slice(0, -1)

  cleanReference.split('/').forEach((segment) => {
    const normalizedSegment = decodeSegment(segment)
    if (!normalizedSegment || normalizedSegment === '.') {
      return
    }

    if (normalizedSegment === '..') {
      baseSegments.pop()
      return
    }

    baseSegments.push(normalizedSegment)
  })

  return normalizePath(baseSegments.join('/'))
}

function extractMarkdownImageReferences(content: string) {
  return [...content.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)].map((match) => match[1] || '')
}

function extractMarkdownLinkReferences(content: string) {
  const references: string[] = []
  const regex = /\[[^\]]+]\(([^)]+)\)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    if (match.index > 0 && content[match.index - 1] === '!') {
      continue
    }

    references.push(match[1] || '')
  }

  return references
}

function extractMarkdownHtmlReferences(content: string) {
  const doc = new DOMParser().parseFromString(content, 'text/html')
  const references: Array<{ url: string; force: boolean }> = []

  doc.querySelectorAll('img, source, video, audio').forEach((element) => {
    const src = element.getAttribute('src')
    if (src) {
      references.push({ url: src, force: true })
    }
  })

  doc.querySelectorAll('a').forEach((element) => {
    const href = element.getAttribute('href')
    if (href) {
      references.push({ url: href, force: false })
    }
  })

  return references
}

function extractHugoFigureShortcodes(content: string) {
  return [...content.matchAll(/{{[%<]\s*figure[^}]*src=["']([^"']+)["'][^}]*[%>]}}/gi)].map(
    (match) => match[1] || ''
  )
}

function decodeSegment(segment: string) {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}
