<script setup lang="ts">
import MigrateSourceUploadCard from '@/components/MigrateSourceUploadCard.vue'
import type { MigrateData } from '@/types'
import { VButton } from '@halo-dev/components'
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

function openDocument() {
  window.open('https://www.halo.run/docs/plugin-migrate/migrate/wordpress', '_blank')
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
      <ol>
        <li>1. 在 WordPress 后台的工具 -> 导出中导出网站数据，格式为 XML</li>
        <li>2. 下载 WordPress 站点中的 wp-content/uploads 目录（可选），用于后续附件迁移</li>
        <li>3. 点击下方的选择 XML 文件按钮，并选择刚刚导出的 WXR 文件</li>
        <li>4. 如果检测到本地附件，根据后续提示选择上传到 Halo 或手动迁移</li>
        <li>5. 最后，点击开始导入按钮开始迁移</li>
        <li>6. 迁移完成后，建议抽样检查文章、页面、评论和附件链接</li>
      </ol>
    </template>
    <template #actions>
      <VButton ghost size="sm" type="default" @click="openDocument"> 查阅详细迁移文档 </VButton>
    </template>
  </MigrateSourceUploadCard>
</template>
