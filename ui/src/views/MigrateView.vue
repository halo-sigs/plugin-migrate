<script setup lang="ts">
import AttachmentPolicy from '@/components/AttachmentPolicy.vue'
import MigrateTaskDashboard from '@/components/MigrateTaskDashboard.vue'
import { useMigrateTask } from '@/composables/use-migrate-task'
import { providerItems } from '@/modules/index'
import type { MigrateData, MigrateTaskGroup, MigrateTaskItem } from '@/types'
import { consoleApiClient, type PluginList, type User } from '@halo-dev/api-client'
import { Dialog, VAlert, VButton, VPageHeader } from '@halo-dev/components'
import type { queueAsPromised } from 'fastq'
import * as fastq from 'fastq'
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import SolarTransferHorizontalBoldDuotone from '~icons/solar/transfer-horizontal-bold-duotone'

const route = useRoute()
const router = useRouter()

const activatedPluginNames = ref<string[]>([])
const currentUser = ref<User>()

onMounted(async () => {
  const providerName = route.query.provider as string | undefined
  if (!providerName) {
    router.replace({ name: 'MigrateSelect' })
    return
  }
  const provider = providerItems.find((p) => p.name === providerName)
  if (!provider) {
    router.replace({ name: 'MigrateSelect' })
    return
  }
  activeProvider.value = provider

  const { data }: { data: PluginList } = await consoleApiClient.plugin.plugin.listPlugins({
    enabled: true,
    size: 0,
    page: 0
  })
  activatedPluginNames.value =
    data.items
      .filter((plugin) => plugin.status?.phase === 'STARTED')
      .map((plugin) => plugin.metadata.name) || []

  const userDetailResponse = await consoleApiClient.user.getCurrentUserDetail()
  currentUser.value = userDetailResponse.data.user
})

const migrateData = ref<MigrateData>()
const activeProvider = ref(providerItems.find((p) => p.name === route.query.provider))
const policyMap = ref<Map<string, string>>(new Map())
const taskGroups = ref<MigrateTaskGroup[]>([])
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

const hasFailedTasks = computed(() => {
  return taskGroups.value.some((g) => g.tasks.some((t) => t.status === 'failed'))
})

const allTasks = computed(() => taskGroups.value.flatMap((g) => g.tasks))

const pendingTasks = computed(() => allTasks.value.filter((t) => t.status === 'pending'))

const failedTasks = computed(() => allTasks.value.filter((t) => t.status === 'failed'))

function bindTaskRetry(groups: MigrateTaskGroup[]) {
  groups.forEach((group) => {
    group.tasks.forEach((task) => {
      task.retry = () => {
        if (task.status !== 'running') {
          task.status = 'pending'
          task.error = undefined
          taskQueue.push(task)
          importLoading.value = true
        }
      }
    })
  })
}

watch(
  () => migrateData.value,
  (data) => {
    if (data) {
      const groups = useMigrateTask(data, {
        relativePathFolder: activeProvider.value?.options?.attachmentFolderPath,
        user: currentUser.value,
        typeToPolicyMap: policyMap.value
      })
      bindTaskRetry(groups)
      taskGroups.value = groups
      isImportStarted.value = false
    } else {
      taskGroups.value = []
      isImportStarted.value = false
    }
  },
  { deep: false }
)

watch(
  () => policyMap.value,
  () => {
    if (migrateData.value) {
      const groups = useMigrateTask(migrateData.value, {
        relativePathFolder: activeProvider.value?.options?.attachmentFolderPath,
        user: currentUser.value,
        typeToPolicyMap: policyMap.value
      })
      bindTaskRetry(groups)
      taskGroups.value = groups
      isImportStarted.value = false
    }
  },
  { deep: true }
)

const handleBackToSelect = () => {
  if (importLoading.value) {
    Dialog.warning({
      title: '数据正在导入中',
      description: '数据正在导入中，请勿离开此页面。'
    })
    return
  }
  router.push({ name: 'MigrateSelect' })
}

const handlePolicyChange = (typeToPolicyMap: Map<string, string>) => {
  policyMap.value = typeToPolicyMap
}

const handleImport = () => {
  if (pendingTasks.value.length === 0 && failedTasks.value.length === 0) {
    Dialog.info({
      title: '没有可导入的任务',
      description: '当前没有待执行或失败的任务。'
    })
    return
  }

  importLoading.value = true
  isImportStarted.value = true
  window.onbeforeunload = function (e: BeforeUnloadEvent) {
    e.preventDefault()
    e.returnValue = ''
    const message = '数据正在导入中，请勿关闭或刷新此页面。'
    return message
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

  taskQueue.drained().then(() => {
    importLoading.value = false
    window.onbeforeunload = null
    if (failedTasks.value.length === 0) {
      Dialog.success({ title: '导入完成' })
    } else {
      Dialog.warning({
        title: '导入完成',
        description: `共 ${allTasks.value.length} 个任务，${failedTasks.value.length} 个失败，请查看详情并尝试重试。`
      })
    }
  })
}

const handleRetryAll = () => {
  if (failedTasks.value.length === 0) return
  importLoading.value = true
  failedTasks.value.forEach((task) => {
    task.retry()
  })

  taskQueue.drained().then(() => {
    importLoading.value = false
    if (failedTasks.value.length === 0) {
      Dialog.success({ title: '重试完成' })
    } else {
      Dialog.warning({
        title: '重试完成',
        description: `仍有 ${failedTasks.value.length} 个任务失败，请查看详情。`
      })
    }
  })
}

const handleRetryTask = (task: MigrateTaskItem) => {
  task.retry()
  importLoading.value = true
  taskQueue.drained().then(() => {
    importLoading.value = false
  })
}

onBeforeRouteLeave((to, from, next) => {
  if (importLoading.value) {
    Dialog.warning({
      title: '数据正在导入中',
      description: '数据正在导入中，请勿关闭或刷新此页面。'
    })
    next(false)
    return
  }
  next()
})
</script>

<template>
  <VPageHeader :title="activeProvider?.name ? `${activeProvider.name} 数据迁移` : '迁移'">
    <template #icon>
      <img
        v-if="activeProvider?.icon"
        :src="activeProvider.icon"
        class=":uno: mr-2 h-6 w-6 rounded"
        :alt="activeProvider.name"
      />
      <SolarTransferHorizontalBoldDuotone v-else class=":uno: mr-2 self-center" />
    </template>
    <template #actions>
      <VButton @click="handleBackToSelect">重新选择平台</VButton>
    </template>
  </VPageHeader>

  <div class=":uno: m-4 flex flex-1 flex-col gap-4">
    <!-- 顶部：文件解析 + 附件策略 + 提示 -->
    <div
      class=":uno: rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200"
      :class="{ ':uno: pb-2': !migrateData?.attachments?.length }"
    >
      <div class=":uno: flex flex-col gap-4">
        <div>
          <h3 class=":uno: mb-2 text-base font-semibold">导入数据</h3>
          <component
            :is="activeProvider?.importComponent"
            v-model:data="migrateData"
            :activatedPluginNames="activatedPluginNames"
            @policyChange="handlePolicyChange"
          />
        </div>

        <div
          v-if="
            migrateData?.attachments &&
            migrateData.attachments.length > 0 &&
            activeProvider?.name !== 'Halo'
          "
        >
          <h3 class=":uno: mb-2 text-base font-semibold">附件存储策略</h3>
          <AttachmentPolicy
            :activatedPluginNames="activatedPluginNames"
            :attachments="migrateData.attachments"
            @policyChange="handlePolicyChange"
          />
        </div>

        <VAlert v-if="!migrateData" type="info" title="提示" :closable="false">
          <template #description>
            请先上传或选择迁移文件，解析成功后将在下方显示具体的迁移任务。
          </template>
        </VAlert>
      </div>
    </div>

    <!-- 底部：任务面板 -->
    <div v-if="migrateData" class=":uno: rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div class=":uno: mb-4 flex items-center justify-between">
        <h3 class=":uno: text-base font-semibold">迁移任务</h3>
        <div class=":uno: flex gap-2">
          <VButton v-if="hasFailedTasks" :disabled="importLoading" @click="handleRetryAll">
            全部重试
          </VButton>
          <VButton
            type="primary"
            :loading="importLoading"
            :disabled="!taskGroups.length || importLoading"
            @click="handleImport"
          >
            {{ isImportStarted ? '继续导入' : '开始导入' }}
          </VButton>
        </div>
      </div>

      <MigrateTaskDashboard
        :taskGroups="taskGroups"
        :loading="importLoading"
        @retry="handleRetryTask"
      />
    </div>
  </div>
</template>
