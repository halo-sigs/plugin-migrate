import { useMigrateTaskRunner } from '@/composables/use-migrate-task-runner'
import type { MigrateData, MigrateTaskItem } from '@/types'
import { Dialog } from '@halo-dev/components'
import { afterEach, beforeEach, describe, expect, it } from '@rstest/core'
import { createApp, defineComponent, ref } from 'vue'

const originalDialogSuccess = Dialog.success
const originalDialogWarning = Dialog.warning
const mountedApps: Array<() => void> = []

function createTask(options: {
  id: string
  type: string
  dependsOn?: string[]
  run: () => Promise<void>
}) {
  return {
    id: options.id,
    type: options.type,
    label: options.id,
    item: {},
    status: 'pending',
    dependsOn: options.dependsOn,
    run: async () => {
      await options.run()
      return { data: {} } as any
    },
    retry: () => {}
  } as MigrateTaskItem
}

async function runTasks(tasks: MigrateTaskItem[]) {
  let runner: ReturnType<typeof useMigrateTaskRunner> | undefined
  const app = createApp(
    defineComponent({
      setup() {
        runner = useMigrateTaskRunner(
          ref([
            {
              key: 'test',
              label: 'Test',
              tasks
            }
          ])
        )
        return () => null
      }
    })
  )
  app.mount(document.createElement('div'))
  mountedApps.push(() => app.unmount())

  await runner!.runImport({ data: { sourceProvider: 'halo' } as MigrateData })
  return runner!
}

describe('useMigrateTaskRunner dependency scheduling', () => {
  beforeEach(() => {
    Dialog.success = (() => undefined) as typeof Dialog.success
    Dialog.warning = (() => undefined) as typeof Dialog.warning
  })

  afterEach(() => {
    mountedApps.splice(0).forEach((unmount) => unmount())
    Dialog.success = originalDialogSuccess
    Dialog.warning = originalDialogWarning
  })

  it('waits for a parent comment while keeping unrelated tasks concurrent', async () => {
    const events: string[] = []
    const reply = createTask({
      id: 'reply-1',
      type: 'reply',
      dependsOn: ['comment:comment-1'],
      run: async () => {
        events.push('reply:start')
      }
    })
    const comment = createTask({
      id: 'comment-1',
      type: 'comment',
      run: async () => {
        events.push('comment:start')
        await new Promise((resolve) => setTimeout(resolve, 20))
        events.push('comment:end')
      }
    })
    const tag = createTask({
      id: 'tag-1',
      type: 'tag',
      run: async () => {
        events.push('tag:start')
      }
    })

    await runTasks([reply, comment, tag])

    expect(events.indexOf('tag:start')).toBeLessThan(events.indexOf('comment:end'))
    expect(events.indexOf('reply:start')).toBeGreaterThan(events.indexOf('comment:end'))
  })

  it('runs an out-of-order nested reply chain one level at a time', async () => {
    const events: string[] = []
    const tasks = [
      createTask({
        id: 'reply-2',
        type: 'reply',
        dependsOn: ['comment:comment-1', 'reply:reply-1'],
        run: async () => {
          events.push('reply-2')
        }
      }),
      createTask({
        id: 'reply-1',
        type: 'reply',
        dependsOn: ['comment:comment-1'],
        run: async () => {
          events.push('reply-1')
        }
      }),
      createTask({
        id: 'comment-1',
        type: 'comment',
        run: async () => {
          events.push('comment-1')
        }
      })
    ]

    await runTasks(tasks)

    expect(events).toEqual(['comment-1', 'reply-1', 'reply-2'])
  })

  it('runs sibling replies concurrently after their parent succeeds', async () => {
    let activeReplies = 0
    let maxActiveReplies = 0
    const createReply = (id: string) =>
      createTask({
        id,
        type: 'reply',
        dependsOn: ['comment:comment-1'],
        run: async () => {
          activeReplies++
          maxActiveReplies = Math.max(maxActiveReplies, activeReplies)
          await new Promise((resolve) => setTimeout(resolve, 20))
          activeReplies--
        }
      })
    const comment = createTask({
      id: 'comment-1',
      type: 'comment',
      run: async () => {}
    })

    await runTasks([createReply('reply-1'), createReply('reply-2'), comment])

    expect(maxActiveReplies).toBe(2)
  })

  it('does not run a child when its parent task fails', async () => {
    let childRuns = 0
    const comment = createTask({
      id: 'comment-1',
      type: 'comment',
      run: async () => {
        throw new Error('comment failed')
      }
    })
    const reply = createTask({
      id: 'reply-1',
      type: 'reply',
      dependsOn: ['comment:comment-1'],
      run: async () => {
        childRuns++
      }
    })

    await runTasks([reply, comment])

    expect(comment.status).toBe('failed')
    expect(reply.status).toBe('failed')
    expect(reply.error).toContain('comment:comment-1')
    expect(childRuns).toBe(0)
  })

  it('retries failed parents before their blocked children', async () => {
    const events: string[] = []
    let parentAttempts = 0
    const comment = createTask({
      id: 'comment-1',
      type: 'comment',
      run: async () => {
        parentAttempts++
        events.push(`comment:${parentAttempts}`)
        if (parentAttempts === 1) {
          throw new Error('comment failed')
        }
      }
    })
    const reply = createTask({
      id: 'reply-1',
      type: 'reply',
      dependsOn: ['comment:comment-1'],
      run: async () => {
        events.push('reply')
      }
    })

    const runner = await runTasks([reply, comment])
    await runner.retryAll()

    expect(events).toEqual(['comment:1', 'comment:2', 'reply'])
    expect(comment.status).toBe('success')
    expect(reply.status).toBe('success')
  })

  it('allows dependencies that are outside the current migration data', async () => {
    let runs = 0
    const reply = createTask({
      id: 'reply-1',
      type: 'reply',
      dependsOn: ['comment:already-imported'],
      run: async () => {
        runs++
      }
    })

    await runTasks([reply])

    expect(reply.status).toBe('success')
    expect(runs).toBe(1)
  })

  it('fails cyclic dependencies without running either task', async () => {
    let runs = 0
    const first = createTask({
      id: 'reply-1',
      type: 'reply',
      dependsOn: ['reply:reply-2'],
      run: async () => {
        runs++
      }
    })
    const second = createTask({
      id: 'reply-2',
      type: 'reply',
      dependsOn: ['reply:reply-1'],
      run: async () => {
        runs++
      }
    })

    await runTasks([first, second])

    expect(first.status).toBe('failed')
    expect(second.status).toBe('failed')
    expect(runs).toBe(0)
  })
})
