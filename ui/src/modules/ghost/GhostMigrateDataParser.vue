<script lang="ts" setup>
import MigrateSourceUploadCard from '@/components/MigrateSourceUploadCard.vue'
import type { MigrateData } from '@/types'
import { VButton } from '@halo-dev/components'
import { ref } from 'vue'
import { useGhostDataParser } from './use-ghost-data-parser'

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
  useGhostDataParser(file)
    .parse()
    .then((data) => {
      emit('update:data', data)
    })
    .catch((error) => {
      console.error(error)
      parseError.value = error instanceof Error ? error.message : String(error)
    })
}

function openDocument() {
  window.open('https://www.halo.run/docs/plugin-migrate/migrate/ghost', '_blank')
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
    :parse-error="parseError"
    buttonText="选择 JSON 文件"
    @file-change="handleFileChange"
  >
    <template #description>
      <ol>
        <li>1. 在 Ghost 后台的 Settings -> Labs 中导出网站数据，格式为 JSON</li>
        <li>2. 下载 Ghost 站点的 content 目录（可选），用于后续附件迁移</li>
        <li>3. 点击下方的选择 JSON 文件按钮，并选择刚刚导出的 JSON 文件</li>
        <li>4. 如果检测到本地媒体链接，根据后续提示选择上传到 Halo 或手动迁移</li>
        <li>5. 最后，点击开始导入按钮开始迁移</li>
        <li>6. 迁移完成后，建议抽样检查文章、页面、标签封面和附件链接</li>
      </ol>
    </template>
    <template #actions>
      <VButton ghost size="sm" type="default" @click="openDocument"> 查阅详细迁移文档 </VButton>
    </template>
  </MigrateSourceUploadCard>
</template>
