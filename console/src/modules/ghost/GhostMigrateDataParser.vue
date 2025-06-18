<script lang="ts" setup>
import FileSelector from '@/components/FileSelector.vue'
import type { MigrateData } from '@/types'
import { VAlert, VButton } from '@halo-dev/components'
import { useGhostDataParser } from './use-ghost-data-parser'

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
  useGhostDataParser(file)
    .parse()
    .then((data) => {
      emit('update:data', data)
    })
    .catch((error) => {
      console.error(error)
    })
}

function openDocument() {
  window.open('https://halo-plugin-migrate.pages.dev/provider/ghost.html', '_blank')
}
</script>

<template>
  <div class=":uno: sm:w-1/2 space-y-4">
    <VAlert title="注意事项" type="info" :closable="false" class=":uno: sheet">
      <template #description>
        <ul class=":uno: ml-2 list-disc list-inside space-y-1">
          <li>在开始迁移前，建议先阅读关于 Ghost 迁移的文档。</li>
          <li>
            目前仅支持根据 Ghost 导出的 JSON
            文件自动迁移数据，图片相关的数据迁移请参阅文档手动迁移。
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
    </VAlert>
    <FileSelector
      :options="{ accept: '.json', multiple: false }"
      @file-change="handleFileChange"
    ></FileSelector>
  </div>
</template>
