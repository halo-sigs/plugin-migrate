<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import type { MigrateData } from '@/types'
import { Toast } from '@halo-dev/components'
import { useWordPressDataParser } from './use-wordpress-data-parser'
defineProps<{
  data: MigrateData
}>()

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
}>()

const handleFileChange = (files: FileList) => {
  const file = files.item(0)
  if (!file) {
    return
  }
  useWordPressDataParser(file)
    .parse()
    .then((data) => {
      emit('update:data', data)
    })
    .catch((error: any) => {
      Toast.error(error)
      console.error(error)
    })
}
</script>
<template>
  <div>
    <VAlert title="迁移提示" type="info" :closable="false" class=":uno: mb-3">
      <template #description>
        请选择从 WordPress 后台【工具 &rarr; 导出】中下载的 WXR 文件（.xml）。
      </template>
    </VAlert>
    <FileSelector
      :options="{ accept: '.xml', multiple: false }"
      @fileChange="handleFileChange"
    ></FileSelector>
  </div>
</template>
