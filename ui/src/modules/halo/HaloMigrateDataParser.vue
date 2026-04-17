<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import type { MigrateData } from '@/types'
import { VAlert, VButton } from '@halo-dev/components'
import { ref } from 'vue'
import HaloMigrateAttachmentHandler from './HaloMigrateAttachmentHandler.vue'
import { useHaloDataParser } from './use-halo-data-parser'

defineProps<{
  data: MigrateData
  activatedPluginNames: string[]
}>()

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
  (event: 'policyChange', value: Map<string, string>): void
  (event: 'next'): void
}>()

const parsedData = ref<MigrateData>()
const parsing = ref(false)
const attachmentHandlerRef = ref<InstanceType<typeof HaloMigrateAttachmentHandler> | null>(null)

const handleFileChange = (files: FileList) => {
  const file = files.item(0)
  if (!file) {
    return
  }
  parsing.value = true
  useHaloDataParser(file)
    .parse()
    .then((data) => {
      parsedData.value = data
      emit('update:data', data)
    })
    .catch((error: any) => {
      console.error(error)
      alert(error?.message || String(error))
    })
    .finally(() => {
      parsing.value = false
    })
}

const handlePolicyChange = (map: Map<string, string>) => {
  emit('policyChange', map)
}

const handleReset = () => {
  parsedData.value = undefined
  emit('update:data', {} as MigrateData)
}

const handleNext = () => {
  let finalData = parsedData.value
  if (
    attachmentHandlerRef.value &&
    parsedData.value?.attachments &&
    parsedData.value.attachments.length > 0
  ) {
    if (!attachmentHandlerRef.value.canConfirm()) {
      return
    }
    finalData = attachmentHandlerRef.value.getProcessedData()
  }
  if (finalData) {
    emit('update:data', finalData)
    emit('next')
  }
}
</script>

<template>
  <div class=":uno: space-y-4">
    <div v-if="!parsedData">
      <FileSelector
        :options="{ accept: '.json', multiple: false }"
        @fileChange="handleFileChange"
      />
      <div v-if="parsing" class=":uno: mt-3 text-sm text-gray-600">正在解析数据...</div>
    </div>

    <div v-else class=":uno: space-y-4">
      <VAlert type="success" title="解析完成" :closable="false">
        <template #description>
          数据文件解析成功。
          <span v-if="parsedData.attachments && parsedData.attachments.length > 0">
            检测到 {{ parsedData.attachments.length }} 个附件，请配置下方的附件处理方案。
          </span>
          <span v-else> 数据中不包含附件，可直接开始迁移。 </span>
        </template>
      </VAlert>

      <HaloMigrateAttachmentHandler
        v-if="parsedData.attachments && parsedData.attachments.length > 0"
        ref="attachmentHandlerRef"
        :data="parsedData"
        :activatedPluginNames="activatedPluginNames"
        @policyChange="handlePolicyChange"
      />

      <div class=":uno: flex items-center justify-between pt-2">
        <VButton type="secondary" size="sm" @click="handleReset">重新选择文件</VButton>
        <VButton type="primary" @click="handleNext">下一步</VButton>
      </div>
    </div>
  </div>
</template>
