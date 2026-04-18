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
  window.open('https://halo-plugin-migrate.pages.dev/provider/ghost.html', '_blank')
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
    @file-change="handleFileChange"
  >
    <template #description>
      请选择从 Ghost 后台【Settings &rarr; Labs】中导出的 JSON 文件。
      <ul class=":uno: ml-2 mt-1 list-disc list-inside space-y-1">
        <li>在开始迁移前，建议先阅读关于 Ghost 迁移的文档。</li>
        <li>
          Ghost 导出的 JSON
          不包含独立附件清单，系统会从文章、页面、标签封面中的媒体链接自动识别本地附件。
        </li>
        <li>
          解析完成后，如果检测到 Ghost
          本地媒体链接，可以在下一步选择附件目录自动上传，或者手动迁移。
        </li>
        <li>
          由于平台之间的差异性，目前仅支持迁移<b>文章</b>、<b>标签</b>、<b>页面</b>数据，其他和
          Ghost 平台相关的数据（包括主题模板、网站设置，用户等）无法迁移。
        </li>
        <li>迁移完成后，不建议立即删除 Ghost 的数据文件，可以先检查数据是否完整。</li>
      </ul>
    </template>
    <template #actions>
      <VButton size="sm" type="secondary" @click="openDocument"> 查阅文档 </VButton>
    </template>
  </MigrateSourceUploadCard>
</template>
