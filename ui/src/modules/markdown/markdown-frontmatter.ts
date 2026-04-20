import * as toml from 'toml'
import YAML from 'yaml'

export interface NormalizedMarkdownMetadata {
  title?: string
  slug?: string
  excerpt?: string
  cover?: string
  categories: string[]
  tags: string[]
  publishTime?: string
  publish: boolean
  kind: 'post' | 'page'
}

export interface ParsedMarkdownFrontmatter {
  attributes: Record<string, unknown>
  body: string
  metadata: NormalizedMarkdownMetadata
}

export function parseMarkdownFrontmatter(content: string): ParsedMarkdownFrontmatter {
  const normalizedContent = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const lines = normalizedContent.split('\n')
  const firstLineIndex = lines.findIndex((line) => line.trim().length > 0)

  if (firstLineIndex === -1) {
    return createResult({}, '')
  }

  const firstLine = lines[firstLineIndex]?.trim()

  if (firstLine === '---') {
    return parseDelimitedFrontmatter(lines, firstLineIndex, 'yaml', '---')
  }

  if (firstLine === '+++') {
    return parseDelimitedFrontmatter(lines, firstLineIndex, 'toml', '+++')
  }

  if (firstLine?.startsWith('{')) {
    return parseJsonFrontmatter(lines, firstLineIndex)
  }

  return createResult({}, normalizedContent)
}

export function normalizeMarkdownMetadata(
  attributes: Record<string, unknown>
): NormalizedMarkdownMetadata {
  const keyMap = createLowercaseKeyMap(attributes)
  const title = getStringValue(keyMap, attributes, ['title'])
  const slug = getStringValue(keyMap, attributes, ['slug'])
  const excerpt = getStringValue(keyMap, attributes, ['excerpt', 'description', 'summary'])
  const cover = getStringValue(keyMap, attributes, [
    'cover',
    'thumbnail',
    'feature_image',
    'featured_image',
    'featureImage',
    'featuredImage'
  ])
  const publishTime = getDateValue(keyMap, attributes, [
    'date',
    'publishDate',
    'published',
    'created',
    'createdAt'
  ])

  return {
    title,
    slug,
    excerpt,
    cover,
    categories: getStringListValue(keyMap, attributes, ['categories', 'category']),
    tags: getStringListValue(keyMap, attributes, ['tags', 'tag']),
    publishTime,
    publish: !getBooleanValue(keyMap, attributes, ['draft']),
    kind: resolveMarkdownKind(keyMap, attributes)
  }
}

function parseDelimitedFrontmatter(
  lines: string[],
  startIndex: number,
  type: 'yaml' | 'toml',
  delimiter: string
) {
  const endIndex = findDelimitedFrontmatterEnd(lines, startIndex + 1, delimiter)
  if (endIndex === -1) {
    throw new Error(`Front matter 缺少结束分隔符 ${delimiter}`)
  }

  const rawMatter = lines.slice(startIndex + 1, endIndex).join('\n')
  const body = extractBody(lines, endIndex + 1)
  const attributes =
    type === 'yaml'
      ? ((YAML.parse(rawMatter) as Record<string, unknown> | null) ?? {})
      : ((toml.parse(rawMatter) as Record<string, unknown> | null) ?? {})

  return createResult(attributes, body)
}

function parseJsonFrontmatter(lines: string[], startIndex: number) {
  const jsonLines: string[] = []
  let balance = 0
  let endIndex = -1

  for (let index = startIndex; index < lines.length; index++) {
    const line = lines[index] || ''
    jsonLines.push(line)
    balance += countCharacters(line, '{')
    balance -= countCharacters(line, '}')

    if (balance === 0) {
      endIndex = index
      break
    }
  }

  if (endIndex === -1) {
    throw new Error('JSON front matter 缺少结束大括号')
  }

  const attributes = JSON.parse(jsonLines.join('\n')) as Record<string, unknown>
  const body = extractBody(lines, endIndex + 1)

  return createResult(attributes, body)
}

function createResult(
  attributes: Record<string, unknown>,
  body: string
): ParsedMarkdownFrontmatter {
  return {
    attributes,
    body,
    metadata: normalizeMarkdownMetadata(attributes)
  }
}

function createLowercaseKeyMap(attributes: Record<string, unknown>) {
  return Object.keys(attributes).reduce((map, key) => {
    map.set(key.toLowerCase(), key)
    return map
  }, new Map<string, string>())
}

function getValue(
  keyMap: Map<string, string>,
  attributes: Record<string, unknown>,
  candidates: string[]
) {
  for (const candidate of candidates) {
    const key = keyMap.get(candidate.toLowerCase())
    if (key) {
      return attributes[key]
    }
  }

  return undefined
}

function getStringValue(
  keyMap: Map<string, string>,
  attributes: Record<string, unknown>,
  candidates: string[]
) {
  const value = getValue(keyMap, attributes, candidates)
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized || undefined
}

function getStringListValue(
  keyMap: Map<string, string>,
  attributes: Record<string, unknown>,
  candidates: string[]
) {
  const value = getValue(keyMap, attributes, candidates)
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item).trim()))
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return [String(value).trim()].filter(Boolean)
}

function getDateValue(
  keyMap: Map<string, string>,
  attributes: Record<string, unknown>,
  candidates: string[]
) {
  const value = getValue(keyMap, attributes, candidates)
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
    return undefined
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function getBooleanValue(
  keyMap: Map<string, string>,
  attributes: Record<string, unknown>,
  candidates: string[]
) {
  const value = getValue(keyMap, attributes, candidates)

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true
    }

    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false
    }
  }

  return false
}

function resolveMarkdownKind(
  keyMap: Map<string, string>,
  attributes: Record<string, unknown>
): 'post' | 'page' {
  const value = getValue(keyMap, attributes, ['type', 'layout', 'kind'])

  if (typeof value === 'string' && /^pages?$/i.test(value.trim())) {
    return 'page'
  }

  return 'post'
}

function findDelimitedFrontmatterEnd(lines: string[], startIndex: number, delimiter: string) {
  for (let index = startIndex; index < lines.length; index++) {
    if ((lines[index] || '').trim() === delimiter) {
      return index
    }
  }

  return -1
}

function extractBody(lines: string[], startIndex: number) {
  let bodyStartIndex = startIndex

  while (bodyStartIndex < lines.length && (lines[bodyStartIndex] || '').trim().length === 0) {
    bodyStartIndex++
  }

  return lines.slice(bodyStartIndex).join('\n')
}

function countCharacters(value: string, char: string) {
  return [...value].filter((item) => item === char).length
}
