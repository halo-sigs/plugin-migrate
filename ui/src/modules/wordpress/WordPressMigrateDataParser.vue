<script setup lang="ts">
import MigrateSourceUploadCard from '@/components/MigrateSourceUploadCard.vue'
import type { MigrateData } from '@/types'
import { ref } from 'vue'
import { useWordPressDataParser } from './use-wordpress-data-parser'
defineProps<{
  data: MigrateData
}>()

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
}>()

const parseError = ref<string>()

const handleFileChange = (files: FileList) => {
  parseError.value = undefined
  const file = files.item(0)
  if (!file) {
    return
  }
  useWordPressDataParser(file)
    .parse()
    .then((data) => {
      emit('update:data', data)
    })
    .catch((error: unknown) => {
      parseError.value = error instanceof Error ? error.message : String(error)
      console.error(error)
    })
}

const reset = () => {
  parseError.value = undefined
  emit('update:data', {} as MigrateData)
}

defineExpose({
  reset
})
</script>
<template>
  <MigrateSourceUploadCard
    :file-options="{ accept: '.xml', multiple: false }"
    :parse-error="parseError"
    buttonText="选择 XML 文件"
    @file-change="handleFileChange"
  >
    <template #description>
      请选择从 WordPress 后台【工具 &rarr; 导出】中下载的 WXR 文件（.xml）。
    </template>
  </MigrateSourceUploadCard>
</template>
