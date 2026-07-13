import type { CommentOwner } from '@halo-dev/api-client'

export function createSourceUserId(provider: string, rawId: string | number) {
  return `${provider}:${rawId}`
}

export function normalizeEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase()
  return normalized || undefined
}

export function createSyntheticEmail(sourceId: string) {
  const safeId =
    sourceId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'user'

  return `${safeId}@migrate.invalid`
}

export function createEmailCommentOwner(options: {
  email?: string | null
  displayName?: string | number | null
  website?: string | null
  avatar?: string | null
  sourceId?: string
}): CommentOwner {
  const annotations: Record<string, string> = {}
  const displayName =
    options.displayName === undefined || options.displayName === null
      ? undefined
      : String(options.displayName)

  if (options.website) {
    annotations.website = options.website
  }

  if (options.avatar) {
    annotations.avatar = options.avatar
  }

  return {
    kind: 'Email',
    name:
      normalizeEmail(options.email) ||
      createSyntheticEmail(options.sourceId || displayName || 'comment-owner'),
    displayName: displayName || undefined,
    annotations: Object.keys(annotations).length > 0 ? annotations : undefined
  }
}

export function createUserOwner(name: string, displayName?: string | null): CommentOwner {
  return {
    kind: 'User',
    name,
    displayName: displayName || undefined
  }
}
