<script setup lang="ts">
import AttachmentPolicy from '@/components/AttachmentPolicy.vue'
import MigratePreview from '@/components/MigratePreview.vue'
import MigrateProvider from '@/components/MigrateProvider.vue'
import Steps, { type Step } from '@/components/Steps.vue'
import { useMigrateTask, type MigrateRequestTask } from '@/composables/use-migrate-task'
import { providerItems } from '@/modules/index'
import type { MigrateData, Provider } from '@/types'
import { consoleApiClient, type PluginList, type User } from '@halo-dev/api-client'
import { Dialog, VPageHeader } from '@halo-dev/components'
import type { AxiosResponse } from 'axios'
import * as fastq from 'fastq'
import type { queueAsPromised } from "fastq";
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import SolarTransferHorizontalBoldDuotone from '~icons/solar/transfer-horizontal-bold-duotone'

const activatedPluginNames = ref<string[]>([])
const currentUser = ref<User>()
onMounted(async () => {
  const { data }: { data: PluginList } = await consoleApiClient.plugin.plugin.listPlugins({
    enabled: true,
    size: 0,
    page: 0
  })
  activatedPluginNames.value =
    data.items
      .filter((plugin) => plugin.status?.phase === 'STARTED')
      .map((plugin) => {
        return plugin.metadata.name
      }) || []

  const userDetailResponse = await consoleApiClient.user.getCurrentUserDetail()
  currentUser.value = userDetailResponse.data.user
})

const migrateData = ref<MigrateData>()
const activeProvider = ref<Provider>()
const handleSelectProvider = (provider: Provider) => {
  activeProvider.value = provider
  migrateData.value = undefined
}
const disabledProviderView = computed(() => {
  return !activeProvider.value
})
const disabledImportDataView = computed(() => {
  return !migrateData.value || !activeProvider.value
})
const policyMap = ref<Map<string, string>>(new Map())
const handlePolicyChange = (typeToPolicyMap: Map<string, string>) => {
  policyMap.value = typeToPolicyMap
}

const taskQueue: queueAsPromised<MigrateRequestTask<any>> = fastq.promise(asyncWorker, 9)

async function asyncWorker(arg: MigrateRequestTask<any>): Promise<AxiosResponse<any, any>> {
  return arg.run()
}

const importLoading = ref(false)
const handleImport = () => {
  importLoading.value = true
  window.onbeforeunload = function (e) {
    e.preventDefault()
    e.returnValue = ''
    const message = '数据正在导入中，请勿关闭或刷新此页面。'
    e = e || window.event
    if (e) {
      e.returnValue = message
    }
    return message
  }
  const {
    createTagTasks,
    createCategoryTasks,
    createPostTasks,
    createSinglePageTasks,
    createCommentAndReplyTasks,
    createMenuTasks,
    createMomentTasks,
    createPhotoTasks,
    createLinkTasks,
    createAttachmentTasks
  } = useMigrateTask(migrateData.value as MigrateData)
  // 调用 tasks
  const tasks = [
    ...createTagTasks(),
    ...createCategoryTasks(),
    ...createPostTasks(),
    ...createSinglePageTasks(),
    ...createCommentAndReplyTasks(),
    ...createMenuTasks(),
    ...createMomentTasks(),
    ...createPhotoTasks(),
    ...createLinkTasks(),
    ...createAttachmentTasks(
      activeProvider.value?.options?.attachmentFolderPath as string,
      currentUser.value as User,
      policyMap.value
    )
  ]
  tasks.forEach((task) => {
    taskQueue.push(task).catch((error) => {
      console.error(error)
    })
  })
  taskQueue.drained().then(() => {
    importLoading.value = false
    Dialog.success({
      title: '导入完成'
    })
    window.onbeforeunload = null
  })
  taskQueue.error((error) => {
    importLoading.value = false
    Dialog.error({
      title: '导入失败',
      description: error.message
    })
    window.onbeforeunload = null
  })
}

const stepItems: Step[] = [
  {
    key: 'provider',
    name: '选择渠道',
    next: {
      disabled: disabledProviderView,
      disabledMessage: '需要选择数据渠道'
    }
  },
  {
    key: 'importData',
    name: '导入数据',
    next: {
      disabled: disabledImportDataView,
      disabledMessage: '不存在需要导入的数据'
    }
  },
  {
    key: 'attachmentPolicy',
    name: '设置附件存储策略',
    next: {
      disabled: computed(() => {
        return policyMap.value.size === 0
      }),
      disabledMessage: '未设置附件存储策略'
    },
    visible: computed(() => {
      const attachments = migrateData.value?.attachments
      return attachments && attachments.length > 0
    })
  },
  {
    key: 'migrate',
    name: '待迁移数据',
    next: {
      text: '执行导入',
      handler: handleImport,
      loading: computed(() => {
        return importLoading.value
      })
    },
    prev: {
      disabled: computed(() => {
        return importLoading.value
      }),
      disabledMessage: '数据正在导入中。'
    }
  }
]

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
  <VPageHeader title="迁移">
    <template #icon>
      <SolarTransferHorizontalBoldDuotone class=":uno: mr-2 self-center" />
    </template>
  </VPageHeader>
  <div class=":uno: m-4 flex flex-1 flex-col">
    <Steps :items="stepItems" submitText="执行导入">
      <template #provider>
        <div>
          <MigrateProvider
            :providers="providerItems"
            @selectProvider="handleSelectProvider"
          ></MigrateProvider>
        </div>
      </template>
      <template #importData>
        <div class=":uno: h-full flex flex-col">
          <component :is="activeProvider?.importComponent" v-model:data="migrateData" />
        </div>
      </template>
      <template #attachmentPolicy>
        <div class=":uno: h-full w-1/2 flex flex-col">
          <AttachmentPolicy
            v-if="migrateData"
            :activatedPluginNames="activatedPluginNames"
            :attachments="migrateData.attachments"
            @policyChange="handlePolicyChange"
          >
          </AttachmentPolicy>
        </div>
      </template>
      <template #migrate>
        <div class=":uno: h-full w-1/2 flex flex-col">
          <MigratePreview
            v-if="migrateData"
            :provider="activeProvider"
            :data="migrateData"
          ></MigratePreview>
        </div>
      </template>
    </Steps>
  </div>
</template>
