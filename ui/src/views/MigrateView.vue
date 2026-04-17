<script setup lang="ts">
import MigrateAttachmentHandler from '@/components/MigrateAttachmentHandler.vue'
import MigrateTaskDashboard from '@/components/MigrateTaskDashboard.vue'
import { useMigrateTask } from '@/composables/use-migrate-task'
import { providerItems } from '@/modules/index'
import type { MigrateData, MigrateTaskGroup, MigrateTaskItem } from '@/types'
import { consoleApiClient, type PluginList, type User } from '@halo-dev/api-client'
import { Dialog, VButton, VEmpty, VPageHeader } from '@halo-dev/components'
import type { queueAsPromised } from 'fastq'
import * as fastq from 'fastq'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
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
const showTasks = ref(false)
const attachmentHandlerRef = ref<InstanceType<typeof MigrateAttachmentHandler> | null>(null)

const dataSummaryItems = computed(() => {
  if (!migrateData.value) return []
  return [
    { key: 'tags', label: '标签', count: migrateData.value.tags?.length || 0 },
    { key: 'categories', label: '分类', count: migrateData.value.categories?.length || 0 },
    { key: 'posts', label: '文章', count: migrateData.value.posts?.length || 0 },
    { key: 'pages', label: '页面', count: migrateData.value.pages?.length || 0 },
    { key: 'comments', label: '评论', count: migrateData.value.comments?.length || 0 },
    { key: 'moments', label: '日志', count: migrateData.value.moments?.length || 0 },
    { key: 'menuItems', label: '菜单', count: migrateData.value.menuItems?.length || 0 },
    { key: 'links', label: '链接', count: migrateData.value.links?.length || 0 },
    { key: 'photos', label: '图库', count: migrateData.value.photos?.length || 0 },
    { key: 'attachments', label: '附件', count: migrateData.value.attachments?.length || 0 }
  ].filter((item) => item.count > 0)
})

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
    showTasks.value = false
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

const handleNextStep = () => {
  nextTick(() => {
    showTasks.value = true
  })
}

const handleNonHaloNextStep = () => {
  if (migrateData.value?.attachments?.length && attachmentHandlerRef.value) {
    if (!attachmentHandlerRef.value.canConfirm()) {
      return
    }
    migrateData.value = attachmentHandlerRef.value.getProcessedData()
  }
  handleNextStep()
}

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
        alt=""
      />
      <SolarTransferHorizontalBoldDuotone v-else class=":uno: mr-2 self-center" />
    </template>
    <template #actions>
      <VButton type="secondary" @click="handleBackToSelect">重新选择平台</VButton>
    </template>
  </VPageHeader>

  <div class=":uno: m-4 flex flex-1 flex-col gap-5">
    <!-- 步骤导航 -->
    <div class=":uno: mx-auto max-w-3xl w-full flex items-center justify-center gap-4 py-2">
      <div class=":uno: flex items-center gap-2 text-sm text-gray-400 font-medium">
        <span
          class=":uno: h-6 w-6 flex items-center justify-center rounded-full bg-gray-100 text-xs"
          >1</span
        >
        <span>选择平台</span>
      </div>
      <div class=":uno: w-8 border-t border-gray-300 border-dashed" />
      <div
        class=":uno: flex items-center gap-2 text-sm font-medium"
        :class="migrateData ? ':uno: text-gray-400' : ':uno: text-gray-900'"
      >
        <span
          class=":uno: h-6 w-6 flex items-center justify-center rounded-full text-xs"
          :class="migrateData ? ':uno: bg-gray-100' : ':uno: bg-gray-900 text-white'"
          >2</span
        >
        <span>上传数据</span>
      </div>
      <div class=":uno: w-8 border-t border-gray-300 border-dashed" />
      <div
        class=":uno: flex items-center gap-2 text-sm font-medium"
        :class="migrateData ? ':uno: text-indigo-600' : ':uno: text-gray-400'"
      >
        <span
          class=":uno: h-6 w-6 flex items-center justify-center rounded-full text-xs"
          :class="migrateData ? ':uno: bg-indigo-100' : ':uno: bg-gray-100'"
          >3</span
        >
        <span>开始迁移</span>
      </div>
    </div>

    <!-- 数据准备卡片 -->
    <div
      v-if="!showTasks"
      class=":uno: mx-auto max-w-3xl w-full rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"
    >
      <div class=":uno: mb-4 flex items-center gap-3">
        <div
          class=":uno: h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"
        >
          <svg
            class=":uno: h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <h2 class=":uno: text-lg font-semibold">导入数据</h2>
      </div>

      <div class=":uno: space-y-5">
        <!-- 数据概览 -->
        <div
          v-if="migrateData && dataSummaryItems.length > 0"
          class=":uno: border border-gray-200 rounded-lg bg-white p-4"
        >
          <h3 class=":uno: mb-2 text-sm text-gray-900 font-semibold">数据概览</h3>
          <div class=":uno: flex flex-wrap gap-2"
          >
            <div
              v-for="item in dataSummaryItems"
              :key="item.key"
              class=":uno: flex items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm"
            >
              <span class=":uno: text-gray-500">{{ item.label }}</span>
              <span class=":uno: text-gray-900 font-semibold">{{ item.count }}</span>
            </div>
          </div>
        </div>

        <component
          :is="activeProvider?.importComponent"
          v-model:data="migrateData"
          :activatedPluginNames="activatedPluginNames"
          @policyChange="handlePolicyChange"
          @next="handleNextStep"
        />

        <!-- 附件存储策略（非 Halo） -->
        <div
          v-if="
            migrateData?.attachments &&
            migrateData.attachments.length > 0 &&
            activeProvider?.name !== 'Halo'
          "
        >
          <h3 class=":uno: mb-2 text-sm text-gray-900 font-semibold">附件存储策略</h3>
          <MigrateAttachmentHandler
            ref="attachmentHandlerRef"
            :data="migrateData"
            :activatedPluginNames="activatedPluginNames"
            @policyChange="handlePolicyChange"
          />
        </div>

        <!-- 下一步按钮（非 Halo 提供商） -->
        <div
          v-if="migrateData && activeProvider?.name !== 'Halo'"
          class=":uno: flex justify-end pt-2"
        >
          <VButton
            type="primary"
            :disabled="
              !!(migrateData?.attachments?.length &&
                attachmentHandlerRef &&
                !attachmentHandlerRef.canConfirm())
            "
            @click="handleNonHaloNextStep"
          >
            下一步
          </VButton>
        </div>
      </div>
    </div>

    <!-- 任务执行卡片 -->
    <div
      v-if="migrateData && showTasks"
      class=":uno: mx-auto max-w-5xl w-full flex-1 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"
    >
      <div class=":uno: mb-5 flex flex-wrap items-center justify-between gap-4">
        <div class=":uno: flex items-center gap-3">
          <div
            class=":uno: h-8 w-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600"
          >
            <svg
              class=":uno: h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h2 class=":uno: text-lg font-semibold">迁移任务</h2>
            <p class=":uno: text-sm text-gray-500">共 {{ allTasks.length }} 个任务，准备就绪</p>
          </div>
        </div>
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

    <!-- 未就绪空状态 -->
    <div
      v-if="!migrateData"
      class=":uno: mx-auto max-w-3xl w-full flex flex-1 flex-col items-center justify-center rounded-xl bg-white p-10 shadow-sm ring-1 ring-gray-200"
    >
      <VEmpty title="等待数据导入" description="请在上方的数据导入区域上传迁移文件" />
    </div>
  </div>
</template>
