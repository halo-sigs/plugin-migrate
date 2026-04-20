import type { MigrateData } from '@/types'
import { isProxy, toRaw } from 'vue'

export function cloneMigrateData(data: MigrateData): MigrateData {
  return cloneValue(data)
}

function cloneValue<T>(value: T): T {
  const rawValue = isProxy(value) ? toRaw(value) : value

  if (rawValue === null || typeof rawValue !== 'object') {
    return rawValue
  }

  if (rawValue instanceof Date) {
    return new Date(rawValue.getTime()) as T
  }

  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => cloneValue(item)) as T
  }

  if (rawValue instanceof File || rawValue instanceof Blob) {
    return rawValue
  }

  const prototype = Object.getPrototypeOf(rawValue)
  if (prototype === Object.prototype || prototype === null) {
    const result: Record<string, unknown> = {}
    Object.entries(rawValue).forEach(([key, item]) => {
      result[key] = cloneValue(item)
    })
    return result as T
  }

  return structuredClone(rawValue)
}

function replaceText(text: string, urlMap: ReadonlyMap<string, string>) {
  let result = text
  urlMap.forEach((newUrl, oldUrl) => {
    result = result.replaceAll(oldUrl, newUrl)
  })
  return result
}

export function replaceUrlsInMigrateData(data: MigrateData, urlMap: ReadonlyMap<string, string>) {
  data.posts?.forEach((post) => {
    const content = post.postRequest.content
    if (content) {
      content.raw = replaceText(content.raw || '', urlMap)
      content.content = replaceText(content.content || '', urlMap)
    }

    const cover = post.postRequest.post?.spec?.cover
    if (cover) {
      post.postRequest.post.spec.cover = replaceText(cover, urlMap)
    }
  })

  data.pages?.forEach((page) => {
    const content = page.singlePageRequest.content
    if (content) {
      content.raw = replaceText(content.raw || '', urlMap)
      content.content = replaceText(content.content || '', urlMap)
    }

    const cover = page.singlePageRequest.page?.spec?.cover
    if (cover) {
      page.singlePageRequest.page.spec.cover = replaceText(cover, urlMap)
    }
  })

  data.moments?.forEach((moment) => {
    const content = moment.spec?.content
    if (content) {
      content.raw = replaceText(content.raw || '', urlMap)
      content.html = replaceText(content.html || '', urlMap)
    }
  })

  data.photos?.forEach((photo) => {
    if (photo.spec?.url) {
      photo.spec.url = replaceText(photo.spec.url, urlMap)
    }
    if (photo.spec?.cover) {
      photo.spec.cover = replaceText(photo.spec.cover, urlMap)
    }
  })

  data.tags?.forEach((tag) => {
    if (tag.spec?.cover) {
      tag.spec.cover = replaceText(tag.spec.cover, urlMap)
    }
  })

  data.categories?.forEach((category) => {
    if (category.spec?.cover) {
      category.spec.cover = replaceText(category.spec.cover, urlMap)
    }
  })

  data.links?.forEach((link) => {
    if (link.spec?.logo) {
      link.spec.logo = replaceText(link.spec.logo, urlMap)
    }
  })
}
