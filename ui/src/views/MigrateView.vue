<script setup lang="ts">
import MigrateAttachmentHandler from '@/components/MigrateAttachmentHandler.vue'
import MigrateTaskDashboard from '@/components/MigrateTaskDashboard.vue'
import { useMigratePreparation } from '@/composables/use-migrate-preparation'
import { useMigrateTaskRunner } from '@/composables/use-migrate-task-runner'
import { getProviderByName } from '@/modules'
import type {
  AttachmentHandlerExpose,
  MigrateTaskItem,
  Provider,
  ProviderParserExpose
} from '@/types'
import { consoleApiClient, type PluginList, type User } from '@halo-dev/api-client'
import { Dialog, VButton, VEmpty, VPageHeader } from '@halo-dev/components'
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import SolarTransferHorizontalBoldDuotone from '~icons/solar/transfer-horizontal-bold-duotone'

const route = useRoute()
const router = useRouter()

const activeProvider = ref<Provider>()
const activatedPluginNames = ref<string[]>([])
const currentUser = ref<User>()
const attachmentHandlerRef = ref<AttachmentHandlerExpose | null>(null)
const providerComponentRef = ref<ProviderParserExpose | null>(null)

const {
  parsedData,
  preparedData,
  selectedFolderFiles,
  localStrategy,
  taskGroups,
  showTasks,
  dataSummaryItems,
  confirmPreparation,
  setParsedData,
  resetAll
} = useMigratePreparation(activeProvider, currentUser)

const { importLoading, isImportStarted, allTasks, hasFailedTasks, runImport, retryAll, retryTask } =
  useMigrateTaskRunner(taskGroups)

const providerData = computed({
  get: () => parsedData.value,
  set: (value) => {
    setParsedData(value)
  }
})

watch(
  () => route.query.provider,
  (providerName) => {
    const provider = getProviderByName(providerName as string | undefined)
    if (!provider) {
      router.replace({ name: 'MigrateSelect' })
      return
    }

    if (activeProvider.value?.name && activeProvider.value.name !== provider.name) {
      providerComponentRef.value?.reset?.()
      resetAll()
    }

    activeProvider.value = provider
  },
  { immediate: true }
)

onMounted(async () => {
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

const handleResetData = () => {
  providerComponentRef.value?.reset?.()
  resetAll()
}

const handleUnifiedNextStep = () => {
  if (!parsedData.value) {
    return
  }

  if (parsedData.value.attachments?.length && attachmentHandlerRef.value) {
    if (!attachmentHandlerRef.value.canConfirm()) {
      return
    }

    confirmPreparation(attachmentHandlerRef.value.getPreparationResult())
    return
  }

  confirmPreparation()
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

const handleImport = async () => {
  await runImport({
    data: preparedData.value,
    attachmentFiles: selectedFolderFiles.value,
    localStrategy: localStrategy.value
  })
}

const handleRetryAll = async () => {
  await retryAll()
}

const handleRetryTask = async (task: MigrateTaskItem) => {
  await retryTask(task)
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
    <div class=":uno: mx-auto max-w-3xl w-full flex items-center justify-center gap-4 py-2">
      <div class=":uno: flex items-center gap-2 text-sm text-gray-400 font-medium">
        <span
          class=":uno: h-6 w-6 flex items-center justify-center rounded-full bg-gray-100 text-xs"
          >1</span
        >
        <span>选择平台</span>
      </div>
      <div class=":uno: w-8 self-center border-t border-gray-300 border-dashed" />
      <div
        class=":uno: flex items-center gap-2 text-sm font-medium"
        :class="parsedData ? ':uno: text-gray-400' : ':uno: text-gray-900'"
      >
        <span
          class=":uno: h-6 w-6 flex items-center justify-center rounded-full text-xs"
          :class="parsedData ? ':uno: bg-gray-100' : ':uno: bg-gray-900 text-white'"
          >2</span
        >
        <span>上传数据</span>
      </div>
      <div class=":uno: w-8 self-center border-t border-gray-300 border-dashed" />
      <div
        class=":uno: flex items-center gap-2 text-sm font-medium"
        :class="preparedData ? ':uno: text-indigo-600' : ':uno: text-gray-400'"
      >
        <span
          class=":uno: h-6 w-6 flex items-center justify-center rounded-full text-xs"
          :class="preparedData ? ':uno: bg-indigo-100' : ':uno: bg-gray-100'"
          >3</span
        >
        <span>开始迁移</span>
      </div>
    </div>

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
        <div
          v-if="parsedData && dataSummaryItems.length > 0"
          class=":uno: border border-gray-200 rounded-lg bg-white p-4"
        >
          <h3 class=":uno: mb-2 text-sm text-gray-900 font-semibold">数据概览</h3>
          <div class=":uno: flex flex-wrap gap-2">
            <div
              v-for="item in dataSummaryItems"
              :key="item.key"
              class=":uno: flex items-center gap-2 border border-gray-200 rounded-md px-2.5 py-1.5 text-sm"
            >
              <span class=":uno: text-gray-500">{{ item.label }}</span>
              <span class=":uno: text-gray-900 font-semibold">{{ item.count }}</span>
            </div>
          </div>
        </div>

        <component
          :is="activeProvider?.importComponent"
          ref="providerComponentRef"
          v-model:data="providerData"
          :activatedPluginNames="activatedPluginNames"
        />

        <div v-if="parsedData?.attachments && parsedData.attachments.length > 0">
          <h3 class=":uno: mb-2 text-sm text-gray-900 font-semibold">附件存储策略</h3>
          <MigrateAttachmentHandler
            ref="attachmentHandlerRef"
            :data="parsedData"
            :activatedPluginNames="activatedPluginNames"
            :descriptions="activeProvider?.options?.attachmentHandlerDescriptions"
          />
        </div>

        <div v-if="parsedData" class=":uno: flex items-center justify-between pt-2">
          <VButton type="secondary" size="sm" @click="handleResetData"> 重新选择文件 </VButton>
          <VButton
            type="primary"
            :disabled="
              !!(
                parsedData.attachments?.length &&
                attachmentHandlerRef &&
                !attachmentHandlerRef.canConfirm()
              )
            "
            @click="handleUnifiedNextStep"
          >
            下一步
          </VButton>
        </div>
      </div>
    </div>

    <div
      v-if="preparedData && showTasks"
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

    <div
      v-if="!parsedData"
      class=":uno: mx-auto max-w-3xl w-full flex flex-1 flex-col items-center justify-center rounded-xl bg-white p-10 shadow-sm ring-1 ring-gray-200"
    >
      <VEmpty title="等待数据导入" description="请在上方的数据导入区域上传迁移文件" />
    </div>
  </div>
</template>
