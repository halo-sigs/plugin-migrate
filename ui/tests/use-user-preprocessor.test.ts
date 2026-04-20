import { useUserPreprocessor } from '@/composables/use-user-preprocessor'
import type { MigrateData, MigrateSourceUser } from '@/types'
import { consoleApiClient } from '@halo-dev/api-client'
import { beforeEach, describe, expect, it } from '@rstest/core'

function createMockFn() {
  const fn = (...args: any[]) => {
    fn.calls.push(args)

    if (fn.queue.length > 0) {
      const next = fn.queue.shift()
      if (next?.type === 'resolve') {
        return Promise.resolve(next.value)
      }

      if (next?.type === 'reject') {
        return Promise.reject(next.value)
      }
    }

    return Promise.resolve(undefined)
  }

  fn.calls = [] as any[]
  fn.queue = [] as Array<{ type: 'resolve' | 'reject'; value: any }>
  fn.mockReset = () => {
    fn.calls = []
    fn.queue = []
  }
  fn.mockResolvedValue = (value: any) => {
    fn.queue = [{ type: 'resolve', value }]
    return fn
  }
  fn.mockResolvedValueOnce = (value: any) => {
    fn.queue.push({ type: 'resolve', value })
    return fn
  }
  fn.mockRejectedValueOnce = (value: any) => {
    fn.queue.push({ type: 'reject', value })
    return fn
  }

  return fn
}

const listUsers = createMockFn()
const createUser = createMockFn()

consoleApiClient.user.listUsers = listUsers as any
consoleApiClient.user.createUser = createUser as any

function createSourceUser(overrides: Partial<MigrateSourceUser> = {}): MigrateSourceUser {
  return {
    id: 'wordpress:1',
    provider: 'wordpress',
    displayName: 'Migrated User',
    email: 'author@example.com',
    username: 'author',
    ...overrides
  }
}

function createCurrentUser() {
  return {
    metadata: {
      name: 'current-user'
    },
    spec: {
      displayName: 'Current User'
    }
  } as any
}

function createData(overrides: Partial<MigrateData> = {}): MigrateData {
  return {
    users: [createSourceUser()],
    posts: [
      {
        postRequest: {
          post: {
            spec: {},
            metadata: { name: 'post-1' }
          }
        },
        ownerRef: {
          sourceId: 'wordpress:1'
        }
      }
    ],
    pages: [
      {
        singlePageRequest: {
          page: {
            spec: {},
            metadata: { name: 'page-1' }
          }
        },
        ownerRef: {
          sourceId: 'wordpress:1'
        }
      }
    ],
    comments: [
      {
        kind: 'Comment',
        refType: 'Post',
        spec: {
          owner: {
            kind: 'Email',
            name: 'author@example.com',
            displayName: 'Comment Author'
          }
        },
        ownerRef: {
          sourceId: 'wordpress:1'
        }
      }
    ],
    ...overrides
  } as any
}

function createListedUser(name: string, email: string) {
  return {
    user: {
      metadata: { name },
      spec: { email }
    }
  }
}

describe('useUserPreprocessor', () => {
  beforeEach(() => {
    listUsers.mockReset()
    createUser.mockReset()
  })

  it('applies halo ownership fallback for posts pages and matching comment emails', async () => {
    const data = createData({
      sourceProvider: 'halo',
      users: [createSourceUser({ id: 'halo:9', provider: 'halo', email: 'owner@example.com' })],
      posts: [
        {
          postRequest: {
            post: {
              spec: {},
              metadata: { name: 'post-1' }
            }
          }
        }
      ],
      pages: [
        {
          singlePageRequest: {
            page: {
              spec: {},
              metadata: { name: 'page-1' }
            }
          }
        }
      ],
      comments: [
        {
          kind: 'Comment',
          refType: 'Post',
          spec: {
            owner: {
              kind: 'Email',
              name: 'owner@example.com',
              displayName: 'Old Halo User'
            }
          }
        },
        {
          kind: 'Comment',
          refType: 'Post',
          spec: {
            owner: {
              kind: 'Email',
              name: 'other@example.com',
              displayName: 'Other User'
            }
          }
        }
      ]
    })

    await useUserPreprocessor().process(data, createCurrentUser())

    expect(data.posts?.[0]?.postRequest.post.spec.owner).toBe('current-user')
    expect(data.pages?.[0]?.singlePageRequest.page.spec.owner).toBe('current-user')
    expect(data.comments?.[0]?.spec.owner).toEqual({
      kind: 'User',
      name: 'current-user',
      displayName: 'Current User'
    })
    expect(data.comments?.[1]?.spec.owner).toEqual({
      kind: 'Email',
      name: 'other@example.com',
      displayName: 'Other User'
    })
    expect(listUsers.calls).toHaveLength(0)
    expect(createUser.calls).toHaveLength(0)
  })

  it('matches existing halo users by email and applies them to posts pages and comments', async () => {
    listUsers.mockResolvedValue({
      data: {
        items: [createListedUser('existing-user', 'author@example.com')]
      }
    })

    const data = createData()

    await useUserPreprocessor().process(data, createCurrentUser())

    expect(createUser.calls).toHaveLength(0)
    expect(data.posts?.[0]?.postRequest.post.spec.owner).toBe('existing-user')
    expect(data.pages?.[0]?.singlePageRequest.page.spec.owner).toBe('existing-user')
    expect(data.comments?.[0]?.spec.owner).toEqual({
      kind: 'User',
      name: 'existing-user',
      displayName: 'Migrated User'
    })
  })

  it('creates missing users once per email and reuses them across linked records', async () => {
    listUsers.mockResolvedValue({
      data: {
        items: []
      }
    })
    createUser.mockResolvedValue({
      data: {
        metadata: {
          name: 'created-user'
        }
      }
    })

    const data = createData({
      users: [
        createSourceUser({ id: 'wordpress:1', displayName: 'Author One' }),
        createSourceUser({ id: 'wordpress:2', displayName: 'Author Two', username: 'author-two' })
      ],
      posts: [
        {
          postRequest: {
            post: {
              spec: {},
              metadata: { name: 'post-1' }
            }
          },
          ownerRef: {
            sourceId: 'wordpress:1'
          }
        },
        {
          postRequest: {
            post: {
              spec: {},
              metadata: { name: 'post-2' }
            }
          },
          ownerRef: {
            sourceId: 'wordpress:2'
          }
        }
      ],
      pages: [],
      comments: []
    })

    await useUserPreprocessor().process(data, createCurrentUser())

    expect(createUser.calls).toHaveLength(1)
    expect(createUser.calls[0]?.[0]).toEqual({
      createUserRequest: expect.objectContaining({
        name: 'author',
        email: 'author@example.com',
        displayName: 'Author One',
        roles: ['guest']
      })
    })
    expect(data.posts?.map((post) => post.postRequest.post.spec.owner)).toEqual([
      'created-user',
      'created-user'
    ])
  })

  it('refreshes users after create failure and reuses the discovered account', async () => {
    listUsers
      .mockResolvedValueOnce({
        data: {
          items: []
        }
      })
      .mockResolvedValueOnce({
        data: {
          items: [createListedUser('refreshed-user', 'author@example.com')]
        }
      })
    createUser.mockRejectedValueOnce(new Error('duplicate'))

    const data = createData()

    await useUserPreprocessor().process(data, createCurrentUser())

    expect(listUsers.calls).toHaveLength(2)
    expect(createUser.calls).toHaveLength(1)
    expect(data.posts?.[0]?.postRequest.post.spec.owner).toBe('refreshed-user')
    expect(data.pages?.[0]?.singlePageRequest.page.spec.owner).toBe('refreshed-user')
    expect(data.comments?.[0]?.spec.owner).toEqual({
      kind: 'User',
      name: 'refreshed-user',
      displayName: 'Migrated User'
    })
  })
})
