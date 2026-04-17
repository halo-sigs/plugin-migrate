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

defineExpose({
  attachmentHandlerRef,
  get selectedFolderFiles() {
    return attachmentHandlerRef.value?.selectedFolderFiles
  },
  get localStrategy() {
    return attachmentHandlerRef.value?.localStrategy
  }
})
</script>

<template>
  <div>
    <div v-if="!parsedData">
      <VAlert title="迁移提示" type="info" :closable="false" class=":uno: mb-3">
        <template #description>请选择从 Halo 1.x 后台导出的 JSON 数据文件（如 migrate-xxxxxxxx.json）。</template>
      </VAlert>
      <FileSelector
        :options="{ accept: '.json', multiple: false }"
        @fileChange="handleFileChange"
      />
      <div v-if="parsing" class=":uno: mt-3 text-sm text-gray-600">正在解析数据...</div>
    </div>

    <div v-else class=":uno: space-y-5">
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
