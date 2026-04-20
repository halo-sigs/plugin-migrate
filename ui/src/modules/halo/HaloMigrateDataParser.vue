<script setup lang="ts">
import MigrateSourceUploadCard from '@/components/MigrateSourceUploadCard.vue'
import type { MigrateData } from '@/types'
import { VButton } from '@halo-dev/components'
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

function openDocument() {
  window.open('https://www.halo.run/docs/plugin-migrate/migrate/halo-1.x', '_blank')
}
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
      <ol>
        <li>1. 在 Halo 1.x 的系统 -> 小工具中导出网站数据，格式为 JSON</li>
        <li>2. 下载 Halo 1.x 工作目录（.halo）中的 upload 目录（可选）</li>
        <li>3. 点击下方的选择 JSON 文件按钮，并选择刚刚导出的 JSON 文件</li>
        <li>4. 根据后续提示处理附件导入方式</li>
        <li>5. 最后，点击开始导入按钮开始迁移</li>
        <li>6. 迁移完成后，建议完整验证数据的完整性</li>
      </ol>
    </template>
    <template #actions>
      <VButton ghost size="sm" type="default" @click="openDocument"> 查阅详细迁移文档 </VButton>
    </template>
  </MigrateSourceUploadCard>
</template>
