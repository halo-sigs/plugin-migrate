<script setup lang="ts">
import MigrateSourceUploadCard from '@/components/MigrateSourceUploadCard.vue'
import type { MigrateData } from '@/types'
import { ref } from 'vue'
import { useHaloDataParser } from './use-halo-data-parser'

defineProps<{
  data: MigrateData
}>()

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
}>()

const parsing = ref(false)
const parseError = ref<string>()

const handleFileChange = (files: FileList) => {
  const file = files.item(0)
  if (!file) {
    return
  }
  parseError.value = undefined
  parsing.value = true
  useHaloDataParser(file)
    .parse()
    .then((data) => {
      emit('update:data', data)
    })
    .catch((error: unknown) => {
      console.error(error)
      parseError.value = error instanceof Error ? error.message : String(error)
    })
    .finally(() => {
      parsing.value = false
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
    :file-options="{ accept: '.json', multiple: false }"
    button-text="选择 JSON 文件"
    :parsing="parsing"
    :parse-error="parseError"
    @file-change="handleFileChange"
  >
    <template #description>
      请选择从 Halo 1.x 后台导出的 JSON 数据文件（如
      halo-data-export-2026-04-17-12-10-54-887748033.json）。
    </template>
  </MigrateSourceUploadCard>
</template>
