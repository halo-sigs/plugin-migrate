<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import type { MigrateData } from '@/types'
import { coreApiClient, type Policy } from '@halo-dev/api-client'
import { VAlert, VTag } from '@halo-dev/components'
import { useQuery } from '@tanstack/vue-query'
import { groupBy } from 'es-toolkit'
import { computed, ref, watch } from 'vue'

interface Props {
  data: MigrateData
  activatedPluginNames: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
  (event: 'policyChange', value: Map<string, string>): void
}>()

const attachments = computed(() => props.data.attachments || [])
const typeGroups = computed(() => groupBy(attachments.value, (a) => a.type))
const attachmentTypes = computed(() => Object.keys(typeGroups.value))
const hasLocal = computed(() => attachmentTypes.value.includes('LOCAL'))
const hasRemote = computed(() => attachmentTypes.value.some((t) => t !== 'LOCAL'))
const remoteTypes = computed(() => attachmentTypes.value.filter((t) => t !== 'LOCAL'))
const typeGroupCounts = computed(() => {
  const counts: Record<string, number> = {}
  Object.entries(typeGroups.value).forEach(([type, items]) => {
    counts[type] = items.length
  })
  return counts
})

const localStrategy = ref<'upload' | 'manual' | null>(null)
const selectedFolderFiles = ref<FileList | null>(null)

const policyOptions = ref<{ label: string; value: string; templateName: string }[]>([])
const localPolicyOptions = ref<{ label: string; value: string; templateName: string }[]>([])

useQuery({
  queryKey: ['attachment-policy-migrate'],
  queryFn: async () => {
    const { data } = await coreApiClient.storage.policy.listPolicy()
    return data.items
  },
  onSuccess(data: Policy[]) {
    policyOptions.value = data.map((policy) => ({
      label: policy.spec.displayName,
      value: policy.metadata.name,
      templateName: policy.spec.templateName
    }))
    localPolicyOptions.value = policyOptions.value.filter((item) => item.templateName === 'local')
  },
  enabled: computed(() => attachments.value.length > 0)
})

const typeToPolicyMap = ref<Map<string, string>>(new Map())
const remotePolicySelections = ref<Record<string, string>>({})

watch(
  () => remoteTypes.value,
  (types) => {
    types.forEach((type) => {
      if (!remotePolicySelections.value[type]) {
        remotePolicySelections.value[type] = policyOptions.value[0]?.value || ''
      }
    })
  },
  { immediate: true }
)

watch(
  () => remotePolicySelections.value,
  (selections) => {
    Object.entries(selections).forEach(([type, policyName]) => {
      typeToPolicyMap.value.set(type, policyName)
    })
    emit('policyChange', typeToPolicyMap.value)
  },
  { deep: true }
)

watch(
  () => localStrategy.value,
  (strategy) => {
    if (strategy === 'manual' && localPolicyOptions.value.length > 0) {
      typeToPolicyMap.value.set('LOCAL', localPolicyOptions.value[0]?.value)
    } else {
      typeToPolicyMap.value.delete('LOCAL')
    }
    emit('policyChange', typeToPolicyMap.value)
  }
)

watch(
  () => localPolicyOptions.value,
  (options) => {
    if (localStrategy.value === 'manual' && options.length > 0) {
      typeToPolicyMap.value.set('LOCAL', options[0]?.value)
      emit('policyChange', typeToPolicyMap.value)
    }
  }
)

function getProcessedData(): MigrateData {
  const result: MigrateData = JSON.parse(JSON.stringify(props.data))
  if (hasLocal.value && localStrategy.value === 'upload') {
    result.attachments = (result.attachments || []).filter((a) => a.type !== 'LOCAL')
  }
  return result
}

function canConfirm() {
  if (!hasLocal.value && !hasRemote.value) return true
  if (hasLocal.value && !localStrategy.value) return false
  if (hasLocal.value && localStrategy.value === 'upload' && !selectedFolderFiles.value) {
    return false
  }
  if (hasRemote.value) {
    for (const type of remoteTypes.value) {
      if (!remotePolicySelections.value[type]) return false
    }
  }
  return true
}

const handleConfirm = () => {
  emit('update:data', getProcessedData())
}

const handleFolderChange = (files: FileList) => {
  selectedFolderFiles.value = files
}

defineExpose({
  getProcessedData,
  canConfirm,
  selectedFolderFiles,
  localStrategy
})
</script>

<template>
  <div class=":uno: space-y-4">
    <!-- 本地附件 -->
    <div v-if="hasLocal" class=":uno: border border-gray-200 rounded-lg bg-white p-4">
      <div class=":uno: mb-3 flex items-center gap-2">
        <h4 class=":uno: text-sm text-gray-900 font-semibold">本地附件</h4>
        <VTag size="sm">{{ typeGroupCounts['LOCAL'] }} 个</VTag>
      </div>

      <!-- 方案选择 -->
      <div class=":uno: flex gap-2">
        <button
          type="button"
          class=":uno: flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-all"
          :class="
            localStrategy === 'upload'
              ? ':uno: border-indigo-500 bg-indigo-50 text-indigo-900'
              : ':uno: border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          "
          @click="localStrategy = 'upload'"
        >
          <span
            class=":uno: h-4 w-4 flex-shrink-0 flex items-center justify-center rounded-full border"
            :class="
              localStrategy === 'upload'
                ? ':uno: border-indigo-500 bg-indigo-500'
                : ':uno: border-gray-300'
            "
          >
            <span v-if="localStrategy === 'upload'" class=":uno: h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <div>
            <div class=":uno: font-medium">上传到新 Halo</div>
            <div class=":uno: text-xs opacity-80">自动替换文章中的附件链接</div>
          </div>
        </button>

        <button
          type="button"
          class=":uno: flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-all"
          :class="
            localStrategy === 'manual'
              ? ':uno: border-indigo-500 bg-indigo-50 text-indigo-900'
              : ':uno: border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          "
          @click="localStrategy = 'manual'"
        >
          <span
            class=":uno: h-4 w-4 flex-shrink-0 flex items-center justify-center rounded-full border"
            :class="
              localStrategy === 'manual'
                ? ':uno: border-indigo-500 bg-indigo-500'
                : ':uno: border-gray-300'
            "
          >
            <span v-if="localStrategy === 'manual'" class=":uno: h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <div>
            <div class=":uno: font-medium">手动迁移</div>
            <div class=":uno: text-xs opacity-80">仅创建 attachments 数据记录</div>
          </div>
        </button>
      </div>

      <!-- 上传方案详情 -->
      <div v-if="localStrategy === 'upload'" class=":uno: mt-3 rounded-md bg-gray-50 p-3">
        <p class=":uno: mb-2 text-xs text-gray-600">
          请选择包含附件的文件夹，系统会在开始导入时自动匹配文章中的图片链接并上传。
        </p>

        <div class=":uno: flex flex-wrap items-center gap-2">
          <FileSelector folder button-text="选择文件夹" @fileChange="handleFolderChange" />
          <span v-if="selectedFolderFiles" class=":uno: text-xs text-gray-600">
            已选择 {{ selectedFolderFiles.length }} 个文件
          </span>
        </div>
      </div>

      <!-- 手动迁移详情 -->
      <div v-if="localStrategy === 'manual'" class=":uno: mt-3 rounded-md bg-gray-50 p-3">
        <p class=":uno: mb-2 text-xs text-gray-600">
          选择本地存储策略，系统仅创建 attachments 数据记录，不会移动或上传文件。
        </p>
        <FormKit
          v-if="localPolicyOptions.length"
          :model-value="typeToPolicyMap.get('LOCAL')"
          type="select"
          label="本地存储策略"
          :options="localPolicyOptions"
          @update:model-value="(v: string) => typeToPolicyMap.set('LOCAL', v)"
        />
        <VAlert v-else type="warning" title="警告" :closable="false">
          <template #description> 当前没有可用的本地存储策略，请先创建一个。 </template>
        </VAlert>
      </div>
    </div>

    <!-- 云存储附件 -->
    <div v-if="hasRemote" class=":uno: border border-gray-200 rounded-lg bg-white p-4">
      <div class=":uno: mb-3 flex items-center gap-2">
        <h4 class=":uno: text-sm text-gray-900 font-semibold">云存储附件</h4>
      </div>

      <VAlert
        v-if="!activatedPluginNames.includes('PluginS3ObjectStorage')"
        type="warning"
        title="警告"
        :closable="false"
        class=":uno: mb-3"
      >
        <template #description>
          当前未安装/启用 S3 插件，云存储附件将无法迁移。
          <a
            href="https://halo.run/store/apps/app-Qxhpp"
            target="_blank"
            class=":uno: text-indigo-600 hover:underline"
            >前往安装</a
          >。
        </template>
      </VAlert>

      <VAlert v-else type="info" :closable="false" class=":uno: mb-3">
        <template #description>
          为每种云存储类型选择对应的存储策略，系统会创建 attachments 数据记录，不移动远程文件。
        </template>
      </VAlert>

      <div class=":uno: grid grid-cols-1 gap-3 md:grid-cols-2">
        <div
          v-for="type in remoteTypes"
          :key="type"
          class=":uno: rounded-md bg-gray-50 p-3"
        >
          <div class=":uno: mb-1.5 flex items-center justify-between">
            <span class=":uno: text-sm text-gray-700 font-medium">{{ type }}</span>
            <VTag size="sm">{{ typeGroupCounts[type] }} 个</VTag>
          </div>
          <FormKit
            v-model="remotePolicySelections[type]"
            type="select"
            label="存储策略"
            :options="policyOptions"
            :disabled="!activatedPluginNames.includes('PluginS3ObjectStorage')"
          />
        </div>
      </div>
    </div>

    <!-- 无附件 -->
    <VAlert v-if="!hasLocal && !hasRemote" type="info" title="提示" :closable="false">
      <template #description> 当前数据中不包含附件，可以直接开始迁移。 </template>
    </VAlert>
  </div>
</template>
