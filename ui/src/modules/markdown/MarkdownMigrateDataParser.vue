<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import MigrateSourceUploadCard from '@/components/MigrateSourceUploadCard.vue'
import type { MigrateData } from '@/types'
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

function handleFileChange(files: FileList) {
  const file = files.item(0)
  if (!file) {
    return
  }

  void parseSelectedFiles([file])
}

function handleFolderChange(files: FileList) {
  void parseSelectedFiles(Array.from(files))
}

const reset = () => {
  parseError.value = undefined
  parsing.value = false
  emit('update:data', {} as MigrateData)
}

defineExpose({
  reset
})
</script>

<template>
  <MigrateSourceUploadCard
    :file-options="{ accept: '.md,.markdown', multiple: false }"
    button-text="选择 Markdown 文件"
    :parse-error="parseError"
    :parsing="parsing"
    parsing-text="正在解析 Markdown 数据..."
    @file-change="handleFileChange"
  >
    <template #description>
      请选择单个 Markdown 文件，或在下方选择包含 Markdown 文件的目录。
      <ul class=":uno: ml-2 mt-1 list-disc list-inside space-y-1">
        <li>适用于 Hugo、Hexo 以及其他基于 Markdown + Front Matter 的静态博客内容。</li>
        <li>
          支持解析 YAML、TOML、JSON Front Matter 中的标题、摘要、分类、标签、发布时间等元数据。
        </li>
        <li>
          默认按文章导入，仅在 Front Matter 明确标记
          <code>type/layout/kind=page</code> 时导入为单页。
        </li>
        <li>如果正文中引用了本地图片或附件，可在下一步额外选择附件目录进行上传和地址替换。</li>
      </ul>
    </template>
    <template #extra-selectors>
      <FileSelector
        folder
        :options="{ multiple: true }"
        button-text="选择 Markdown 目录"
        @file-change="handleFolderChange"
      />
    </template>
  </MigrateSourceUploadCard>
</template>
