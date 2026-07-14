import { useMigrateTask } from '@/composables/use-migrate-task'
import type { MigrateData } from '@/types'
import { describe, expect, it } from '@rstest/core'

describe('useMigrateTask', () => {
  it('declares parent dependencies for direct and nested replies', () => {
    const data = {
      sourceProvider: 'wordpress',
      comments: [
        {
          kind: 'Comment',
          refType: 'Post',
          metadata: { name: 'comment-1' },
          spec: { owner: { kind: 'Email', name: 'a@example.com', displayName: 'A' } }
        },
        {
          kind: 'Reply',
          refType: 'Post',
          metadata: { name: 'reply-1' },
          spec: {
            commentName: 'comment-1',
            owner: { kind: 'Email', name: 'b@example.com', displayName: 'B' }
          }
        },
        {
          kind: 'Reply',
          refType: 'Post',
          metadata: { name: 'reply-2' },
          spec: {
            commentName: 'comment-1',
            quoteReply: 'reply-1',
            owner: { kind: 'Email', name: 'c@example.com', displayName: 'C' }
          }
        }
      ]
    } as MigrateData

    const tasks = useMigrateTask(data).flatMap((group) => group.tasks)

    expect(tasks.find((task) => task.id === 'comment-1')?.dependsOn).toBeUndefined()
    expect(tasks.find((task) => task.id === 'reply-1')?.dependsOn).toEqual(['comment:comment-1'])
    expect(tasks.find((task) => task.id === 'reply-2')?.dependsOn).toEqual([
      'comment:comment-1',
      'reply:reply-1'
    ])
  })
})
