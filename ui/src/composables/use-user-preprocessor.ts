import type { MigrateData, MigrateSourceUser } from '@/types'
import { createUserOwner, normalizeEmail } from '@/utils/migrate-user'
import { consoleApiClient, type User } from '@halo-dev/api-client'

function generatePassword(length = 20) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  const randomValues = crypto.getRandomValues(new Uint8Array(length))

  return Array.from(randomValues, (value) => alphabet[value % alphabet.length]).join('')
}

function normalizeUserNameSegment(value?: string) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || undefined
  )
}

function buildUserName(sourceUser: MigrateSourceUser, usedNames: Set<string>) {
  const emailLocalPart = normalizeEmail(sourceUser.email)?.split('@')[0]
  const base =
    normalizeUserNameSegment(sourceUser.username) ||
    normalizeUserNameSegment(sourceUser.slug) ||
    normalizeUserNameSegment(emailLocalPart) ||
    normalizeUserNameSegment(sourceUser.displayName)

  const fallbackBase = normalizeUserNameSegment(sourceUser.provider)
    ? `migrate-${normalizeUserNameSegment(sourceUser.provider)}-user`
    : 'migrate-user'
  let candidate = base || fallbackBase
  let suffix = 1

  while (usedNames.has(candidate)) {
    suffix++
    candidate = `${base || fallbackBase}-${suffix}`
  }

  usedNames.add(candidate)
  return candidate
}

function applyResolvedUsers(
  data: MigrateData,
  resolvedUserNames: Map<string, string>,
  sourceUsers: Map<string, MigrateSourceUser>,
  fallbackOwnerName?: string
) {
  data.posts?.forEach((post) => {
    const sourceId = post.ownerRef?.sourceId
    if (!sourceId) {
      return
    }

    post.postRequest.post.spec.owner = resolvedUserNames.get(sourceId) || fallbackOwnerName
  })

  data.pages?.forEach((page) => {
    const sourceId = page.ownerRef?.sourceId
    if (!sourceId) {
      return
    }

    page.singlePageRequest.page.spec.owner = resolvedUserNames.get(sourceId) || fallbackOwnerName
  })

  data.comments?.forEach((comment) => {
    const sourceId = comment.ownerRef?.sourceId
    if (!sourceId) {
      return
    }

    const haloUserName = resolvedUserNames.get(sourceId)
    if (!haloUserName) {
      return
    }

    const displayName = sourceUsers.get(sourceId)?.displayName || comment.spec.owner.displayName
    comment.spec.owner = createUserOwner(haloUserName, displayName)
  })
}

export function useUserPreprocessor() {
  async function process(data: MigrateData, currentUser?: User) {
    const sourceUsers = new Map((data.users || []).map((user) => [user.id, user]))
    const fallbackOwnerName = currentUser?.metadata?.name

    if (sourceUsers.size === 0) {
      applyResolvedUsers(data, new Map(), sourceUsers, fallbackOwnerName)
      return
    }

    const { data: listedUsers } = await consoleApiClient.user.listUsers({ page: 0, size: 0 })
    const existingUsers = listedUsers.items || []
    const existingByEmail = new Map<string, string>()
    const usedNames = new Set<string>()

    existingUsers.forEach((item) => {
      const metadataName = item.user.metadata?.name
      if (metadataName) {
        usedNames.add(metadataName)
      }

      const email = normalizeEmail(item.user.spec?.email)
      if (email && metadataName) {
        existingByEmail.set(email, metadataName)
      }
    })

    const resolvedUserNames = new Map<string, string>()
    const createdByEmail = new Map<string, string>()

    for (const sourceUser of sourceUsers.values()) {
      const email = normalizeEmail(sourceUser.email)

      if (!email) {
        continue
      }

      const matchedUserName = existingByEmail.get(email) || createdByEmail.get(email)
      if (matchedUserName) {
        resolvedUserNames.set(sourceUser.id, matchedUserName)
        continue
      }

      const userName = buildUserName(sourceUser, usedNames)

      try {
        const { data: createdUser } = await consoleApiClient.user.createUser({
          createUserRequest: {
            name: userName,
            email,
            displayName: sourceUser.displayName,
            roles: ['guest'],
            password: generatePassword(),
            avatar: sourceUser.avatar,
            bio: sourceUser.bio
          }
        })

        const createdUserName = createdUser.metadata?.name || userName
        resolvedUserNames.set(sourceUser.id, createdUserName)
        createdByEmail.set(email, createdUserName)
        existingByEmail.set(email, createdUserName)
      } catch (error) {
        const { data: refreshedUsers } = await consoleApiClient.user.listUsers({ page: 0, size: 0 })
        const refreshedMatch = refreshedUsers.items?.find(
          (item) => normalizeEmail(item.user.spec?.email) === email
        )

        if (!refreshedMatch?.user.metadata?.name) {
          throw error
        }

        const refreshedUserName = refreshedMatch.user.metadata.name
        resolvedUserNames.set(sourceUser.id, refreshedUserName)
        createdByEmail.set(email, refreshedUserName)
        existingByEmail.set(email, refreshedUserName)
      }
    }

    applyResolvedUsers(data, resolvedUserNames, sourceUsers, fallbackOwnerName)
  }

  return {
    process
  }
}
