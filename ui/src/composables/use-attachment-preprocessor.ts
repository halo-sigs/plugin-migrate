import type { MigrateData } from '@/types'
import { replaceUrlsInMigrateData } from '@/utils/migrate-data-media'
import { consoleApiClient } from '@halo-dev/api-client'
import { ref } from 'vue'

interface AttachmentUploadFailure {
  url: string
  reason: string
}

interface AttachmentProcessResult {
  replacedCount: number
  matchedCount: number
  unmatchedCount: number
}

export function normalizeUrl(url: string): string {
  const ghostPlaceholderPath = url.replace(/^__GHOST_URL__\/?/, '')
  if (ghostPlaceholderPath !== url) {
    return normalizePath(ghostPlaceholderPath)
  }

  try {
    const u = new URL(url)
    return normalizePath(u.pathname)
  } catch {
    return normalizePath(url)
  }
}

export function normalizePath(path: string): string {
  const withoutQuery = path
    .split(/[?#]/)[0]
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
  const decodedPath = decodePath(withoutQuery)

  return decodedPath
    .replace(/^\/+/, '')
    .replace(/^content\/images\/size\/w\d+\//, 'content/images/')
}

export function findMatchingFile(path: string, files: FileList): File | undefined {
  const normalizedPath = normalizePath(path)
  // 精确匹配
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const comparablePaths = getComparableFilePaths(file)
    if (comparablePaths.includes(normalizedPath)) return file
  }
  // 后缀匹配（兼容用户选择不同层级根目录）
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const comparablePaths = getComparableFilePaths(file)
    if (comparablePaths.some((candidate) => normalizedPath.endsWith(candidate))) return file
  }
  // basename fallback（处理 WordPress 缩略图变体，如 image-1024x526.jpg 匹配到原图 image.jpg）
  const pathBasename = normalizedPath.split('/').pop()
  if (pathBasename) {
    const baseWithoutSize = pathBasename.replace(/-\d+x\d+(?=\.[^.]+$)/, '')
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const basename = (file.webkitRelativePath || file.name).split('/').pop()
      if (!basename) continue
      if (basename === pathBasename) return file
      if (basename.replace(/-\d+x\d+(?=\.[^.]+$)/, '') === baseWithoutSize) return file
    }
  }
  return undefined
}

function decodePath(path: string): string {
  try {
    return decodeURI(path)
  } catch {
    return path
  }
}

function getComparableFilePaths(file: File): string[] {
  const normalized = normalizePath(file.webkitRelativePath || file.name)
  const comparable = new Set<string>([normalized])
  const firstSlashIndex = normalized.indexOf('/')

  // 浏览器目录选择通常会把所选根目录名带进 webkitRelativePath，
  // 这里额外兼容一次“去掉首段目录”的比较，便于直接选择站点根目录。
  if (firstSlashIndex !== -1) {
    comparable.add(normalized.slice(firstSlashIndex + 1))
  }

  return [...comparable].filter(Boolean)
}

export function useAttachmentPreprocessor() {
  const isUploading = ref(false)
  const uploadProgress = ref({ current: 0, total: 0 })

  function extractMediaUrls(data: MigrateData): string[] {
    const urls: string[] = []
    const addUrl = (url?: string) => {
      if (!url) {
        return
      }

      const normalized = url.trim()
      if (
        !normalized ||
        normalized.startsWith('data:') ||
        normalized.startsWith('#') ||
        normalized.startsWith('mailto:') ||
        normalized.startsWith('tel:') ||
        normalized.startsWith('javascript:')
      ) {
        return
      }

      urls.push(normalized)
    }

    const extractSrcSet = (srcset?: string | null) => {
      if (!srcset) {
        return
      }

      srcset.split(',').forEach((candidate) => {
        const [src] = candidate.trim().split(/\s+/)
        if (src) {
          addUrl(src)
        }
      })
    }

    const isLikelyFileUrl = (url: string) => {
      const normalized = normalizeUrl(url)

      return (
        normalized.includes('content/files/') ||
        /\.(?:zip|rar|7z|tar|gz|bz2|xz|pdf|docx?|xlsx?|pptx?|mp4|webm|ogg|mov|mp3|wav|aac|flac|m4a)$/i.test(
          normalized
        )
      )
    }

    const extractFromHtml = (html: string) => {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      doc.querySelectorAll('img').forEach((img) => {
        addUrl(img.getAttribute('src') || undefined)
        extractSrcSet(img.getAttribute('srcset'))
      })
      doc.querySelectorAll('video, audio, source').forEach((el) => {
        const src = el.getAttribute('src')
        if (src) addUrl(src)
        extractSrcSet(el.getAttribute('srcset'))
      })
      doc.querySelectorAll('a').forEach((link) => {
        const href = link.getAttribute('href')
        if (href && isLikelyFileUrl(href)) {
          addUrl(href)
        }
      })
      // 提取 style="background-image: url(...)"
      const urlMatches = html.match(/url\(["']?([^"')]+)["']?\)/g)
      urlMatches?.forEach((match) => {
        const url = match.replace(/url\(["']?([^"')]+)["']?\)/, '$1')
        addUrl(url)
      })
    }

    const extractFromMarkdown = (text: string) => {
      // 图片
      const imgRegex = /!\[.*?\]\((.+?)\)/g
      let match
      while ((match = imgRegex.exec(text)) !== null) {
        addUrl(match[1])
      }
      // Markdown 中的视频/音频链接（常见写法）
      const mediaRegex =
        /\[(?:视频|音频|video|audio)?.*?\]\(([^)]+\.(?:mp4|webm|ogg|mov|mp3|wav|aac|flac|m4a))\)/gi
      while ((match = mediaRegex.exec(text)) !== null) {
        addUrl(match[1])
      }
    }

    data.posts?.forEach((post) => {
      const raw = post.postRequest.content?.raw
      const content = post.postRequest.content?.content
      if (raw) {
        extractFromHtml(raw)
        extractFromMarkdown(raw)
      }
      if (content) {
        extractFromHtml(content)
      }
      addUrl(post.postRequest.post?.spec?.cover)
    })

    data.pages?.forEach((page) => {
      const raw = page.singlePageRequest.content?.raw
      const content = page.singlePageRequest.content?.content
      if (raw) {
        extractFromHtml(raw)
        extractFromMarkdown(raw)
      }
      if (content) {
        extractFromHtml(content)
      }
      addUrl(page.singlePageRequest.page?.spec?.cover)
    })

    data.moments?.forEach((moment) => {
      const raw = moment.spec?.content?.raw
      const html = moment.spec?.content?.html
      if (raw) {
        extractFromHtml(raw)
        extractFromMarkdown(raw)
      }
      if (html) {
        extractFromHtml(html)
      }
    })

    data.photos?.forEach((photo) => {
      addUrl(photo.spec?.url)
      addUrl(photo.spec?.cover)
    })

    data.tags?.forEach((tag) => {
      addUrl(tag.spec?.cover)
    })

    data.categories?.forEach((category) => {
      addUrl(category.spec?.cover)
    })

    data.links?.forEach((link) => {
      addUrl(link.spec?.logo)
    })

    return [...new Set(urls)]
  }

  async function process(data: MigrateData, files: FileList): Promise<AttachmentProcessResult> {
    isUploading.value = true

    try {
      const urls = extractMediaUrls(data)
      uploadProgress.value = { current: 0, total: urls.length }

      const urlMap = new Map<string, string>()
      const uploadedCache = new Map<string, string>()
      const failures: AttachmentUploadFailure[] = []
      let matchedCount = 0

      for (const url of urls) {
        const path = normalizeUrl(url)
        const file = findMatchingFile(path, files)

        if (!file) {
          uploadProgress.value.current++
          continue
        }

        matchedCount++

        try {
          const cacheKey = file.webkitRelativePath || file.name
          let permalink = uploadedCache.get(cacheKey)

          if (!permalink) {
            const blob = await file.arrayBuffer()
            const newFile = new File([blob], file.name, { type: file.type })
            const res = await consoleApiClient.storage.attachment.uploadAttachmentForConsole({
              file: newFile,
              filename: newFile.name
            })

            permalink = res.data.status?.permalink
            if (!permalink) {
              throw new Error('上传成功但未返回 permalink')
            }

            uploadedCache.set(cacheKey, permalink)
          }

          urlMap.set(url, permalink)
          urlMap.set(path, permalink)
        } catch (error) {
          failures.push({
            url,
            reason: error instanceof Error ? error.message : String(error)
          })
        } finally {
          uploadProgress.value.current++
        }
      }

      if (failures.length > 0) {
        throw new Error(
          `有 ${failures.length} 个附件上传失败，已停止替换内容中的附件链接。首个失败链接：${failures[0]?.url}`
        )
      }

      replaceUrlsInMigrateData(data, urlMap)

      return {
        replacedCount: urlMap.size / 2,
        matchedCount,
        unmatchedCount: urls.length - matchedCount
      }
    } finally {
      isUploading.value = false
    }
  }

  return { process, isUploading, uploadProgress }
}
