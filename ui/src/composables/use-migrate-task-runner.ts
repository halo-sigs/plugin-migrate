import { useAttachmentPreprocessor } from '@/composables/use-attachment-preprocessor'
import { useBeforeUnloadGuard } from '@/composables/use-before-unload-guard'
import { useUserPreprocessor } from '@/composables/use-user-preprocessor'
import type {
  LocalAttachmentStrategy,
  MigrateData,
  MigrateTaskGroup,
  MigrateTaskItem
} from '@/types'
import type { User } from '@halo-dev/api-client'
import { Dialog } from '@halo-dev/components'
import type { queueAsPromised } from 'fastq'
import * as fastq from 'fastq'
import { computed, ref, watch, type Ref } from 'vue'

export function useMigrateTaskRunner(taskGroups: Ref<MigrateTaskGroup[]>) {
  const attachmentPreprocessor = useAttachmentPreprocessor()
  const beforeUnloadGuard = useBeforeUnloadGuard()
  const userPreprocessor = useUserPreprocessor()
  const importLoading = ref(false)
  const isImportStarted = ref(false)

  const taskQueue: queueAsPromised<MigrateTaskItem<any>> = fastq.promise(asyncWorker, 9)

  async function asyncWorker(task: MigrateTaskItem<any>) {
    task.status = 'running'
    try {
      await task.run()
      task.status = 'success'
      task.error = undefined
    } catch (error: any) {
      task.status = 'failed'
      task.error = error?.message || String(error)
    }
  }

  const allTasks = computed(() => taskGroups.value.flatMap((group) => group.tasks))
  const pendingTasks = computed(() => allTasks.value.filter((task) => task.status === 'pending'))
  const failedTasks = computed(() => allTasks.value.filter((task) => task.status === 'failed'))
  const hasFailedTasks = computed(() => failedTasks.value.length > 0)

  function taskKey(task: MigrateTaskItem<any>) {
    return `${task.type}:${task.id}`
  }

  async function runTasksInDependencyOrder(tasks: MigrateTaskItem<any>[]) {
    const tasksToRun = tasks.filter((task) => task.status !== 'running')
    const remaining = new Set(tasksToRun)
    const taskByKey = new Map(allTasks.value.map((task) => [taskKey(task), task]))

    tasksToRun.forEach((task) => {
      task.status = 'pending'
      task.error = undefined
    })

    while (remaining.size > 0) {
      const readyTasks = Array.from(remaining).filter((task) =>
        (task.dependsOn || []).every((dependencyKey) => {
          const dependency = taskByKey.get(dependencyKey)
          return !dependency || dependency.status === 'success'
        })
      )

      if (readyTasks.length === 0) {
        const hasRunningDependency = Array.from(remaining).some((task) =>
          (task.dependsOn || []).some(
            (dependencyKey) => taskByKey.get(dependencyKey)?.status === 'running'
          )
        )
        if (hasRunningDependency) {
          await taskQueue.drained()
          continue
        }

        remaining.forEach((task) => {
          const unresolvedDependencies = (task.dependsOn || []).filter((dependencyKey) => {
            const dependency = taskByKey.get(dependencyKey)
            return dependency && dependency.status !== 'success'
          })
          task.status = 'failed'
          task.error = `依赖任务未成功：${unresolvedDependencies.join('、')}`
        })
        break
      }

      await Promise.all(readyTasks.map((task) => taskQueue.push(task)))
      readyTasks.forEach((task) => remaining.delete(task))
    }
  }

  watch(
    taskGroups,
    (groups) => {
      groups.forEach((group) => {
        group.tasks.forEach((task) => {
          task.retry = () => {
            if (task.status === 'running') {
              return
            }

            void retryTask(task)
          }
        })
      })
    },
    { immediate: true }
  )

  async function runImport(options: {
    data?: MigrateData
    attachmentFiles?: FileList | null
    localStrategy?: LocalAttachmentStrategy | null
    currentUser?: User
  }) {
    const { data, attachmentFiles, localStrategy, currentUser } = options

    if (!data) {
      return
    }

    if (pendingTasks.value.length === 0 && failedTasks.value.length === 0) {
      Dialog.info({
        title: '没有可导入的任务',
        description: '当前没有待执行或失败的任务。'
      })
      return
    }

    importLoading.value = true
    await userPreprocessor.process(data, currentUser)
    importLoading.value = false

    if (localStrategy === 'upload' && attachmentFiles && attachmentFiles.length > 0) {
      importLoading.value = true
      await attachmentPreprocessor.process(data, attachmentFiles)
      importLoading.value = false
    }

    importLoading.value = true
    isImportStarted.value = true
    beforeUnloadGuard.enable()

    await runTasksInDependencyOrder([...pendingTasks.value, ...failedTasks.value])

    importLoading.value = false
    beforeUnloadGuard.disable()

    if (failedTasks.value.length === 0) {
      Dialog.success({ title: '导入完成' })
      return
    }

    Dialog.warning({
      title: '导入完成',
      description: `共 ${allTasks.value.length} 个任务，${failedTasks.value.length} 个失败，请查看详情并尝试重试。`
    })
  }

  async function retryAll() {
    if (failedTasks.value.length === 0) {
      return
    }

    importLoading.value = true
    await runTasksInDependencyOrder([...failedTasks.value])

    importLoading.value = false

    if (failedTasks.value.length === 0) {
      Dialog.success({ title: '重试完成' })
      return
    }

    Dialog.warning({
      title: '重试完成',
      description: `仍有 ${failedTasks.value.length} 个任务失败，请查看详情。`
    })
  }

  async function retryTask(task: MigrateTaskItem) {
    importLoading.value = true
    await runTasksInDependencyOrder([task])
    importLoading.value = false
  }

  return {
    importLoading,
    isImportStarted,
    allTasks,
    pendingTasks,
    failedTasks,
    hasFailedTasks,
    runImport,
    retryAll,
    retryTask
  }
}
