<script setup lang="ts">
import MigrateSourceUploadCard from '@/components/MigrateSourceUploadCard.vue'
import type { MigrateData } from '@/types'
import { VButton } from '@halo-dev/components'
import { ref } from 'vue'
import { useMarkdownDataParser } from './use-markdown-data-parser'

defineProps<{
  data: MigrateData
}>()

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
}>()

const parseError = ref<string>()
const parsing = ref(false)

async function parseSelectedFiles(files: File[]) {
  parseError.value = undefined
  emit('update:data', {} as MigrateData)

  if (files.length === 0) {
    return
  }

  parsing.value = true

  try {
    const data = await useMarkdownDataParser(files).parse()
    emit('update:data', data)
  } catch (error) {
    console.error(error)
    parseError.value = error instanceof Error ? error.message : String(error)
  } finally {
    parsing.value = false
  }
}

function handleFolderChange(files: FileList) {
  void parseSelectedFiles(Array.from(files))
}

const reset = () => {
  parseError.value = undefined
  parsing.value = false
  emit('update:data', {} as MigrateData)
}

function openDocument() {
  window.open('https://www.halo.run/docs/plugin-migrate/migrate/markdown', '_blank')
}

defineExpose({
  reset
})
</script>

<template>
  <MigrateSourceUploadCard
    folder
    :file-options="{ multiple: true }"
    button-text="选择 Markdown 目录"
    :parse-error="parseError"
    :parsing="parsing"
    parsing-text="正在解析 Markdown 数据..."
    @file-change="handleFolderChange"
  >
    <template #description>
      <ol>
        <li>1. 准备包含 Markdown 文件的内容目录，并保留文章与资源文件的相对路径关系</li>
        <li>2. 如正文或封面引用了本地图片、附件，建议一并准备对应资源目录</li>
        <li>3. 点击下方的选择 Markdown 目录按钮，并选择刚刚准备好的内容目录</li>
        <li>4. 如果检测到本地图片或附件，根据后续提示选择资源目录并自动上传</li>
        <li>5. 最后，点击开始导入按钮开始迁移</li>
        <li>6. 迁移完成后，建议抽样检查 Front Matter 字段、封面和正文渲染结果</li>
      </ol>
    </template>
    <template #actions>
      <VButton ghost size="sm" type="default" @click="openDocument"> 查阅详细迁移文档 </VButton>
    </template>
  </MigrateSourceUploadCard>
</template>
