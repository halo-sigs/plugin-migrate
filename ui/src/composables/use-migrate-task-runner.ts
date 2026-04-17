import { useAttachmentPreprocessor } from '@/composables/use-attachment-preprocessor'
import type {
  LocalAttachmentStrategy,
  MigrateData,
  MigrateTaskGroup,
  MigrateTaskItem
} from '@/types'
import { Dialog } from '@halo-dev/components'
import type { queueAsPromised } from 'fastq'
import * as fastq from 'fastq'
import { computed, ref, watch, type Ref } from 'vue'

export function useMigrateTaskRunner(taskGroups: Ref<MigrateTaskGroup[]>) {
  const attachmentPreprocessor = useAttachmentPreprocessor()
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

  watch(
    taskGroups,
    (groups) => {
      groups.forEach((group) => {
        group.tasks.forEach((task) => {
          task.retry = () => {
            if (task.status === 'running') {
              return
            }

            task.status = 'pending'
            task.error = undefined
            importLoading.value = true
            taskQueue.push(task)
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
  }) {
    const { data, attachmentFiles, localStrategy } = options

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

    if (localStrategy === 'upload' && attachmentFiles && attachmentFiles.length > 0) {
      importLoading.value = true
      await attachmentPreprocessor.process(data, attachmentFiles)
      importLoading.value = false
    }

    importLoading.value = true
    isImportStarted.value = true
    window.onbeforeunload = function (event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
      return '数据正在导入中，请勿关闭或刷新此页面。'
    }

    const tasksToRun = [...pendingTasks.value, ...failedTasks.value]
    tasksToRun.forEach((task) => {
      if (task.status !== 'running') {
        task.status = 'pending'
        task.error = undefined
      }

      taskQueue.push(task).catch(() => {
        // error is handled in asyncWorker
      })
    })

    await taskQueue.drained()

    importLoading.value = false
    window.onbeforeunload = null

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
    failedTasks.value.forEach((task) => {
      task.retry()
    })

    await taskQueue.drained()

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
    task.retry()
    importLoading.value = true
    await taskQueue.drained()
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
