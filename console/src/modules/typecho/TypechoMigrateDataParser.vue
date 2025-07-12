<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import type { MigrateData } from '@/types'
import { VAlert } from '@halo-dev/components'
import { useTypechoDataParser } from './use-typecho-data-parser'
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
  useTypechoDataParser(file)
    .parse()
    .then((data) => {
      emit('update:data', data)
    })
    .catch((error: any) => {
      console.error(error)
    })
}
</script>
<template>
  <div class=":uno: sm:w-1/2 space-y-4">
    <VAlert title="注意事项1" type="info" :closable="false" class=":uno: sheet">
      <template #description>
        <ul class=":uno: ml-2 list-disc list-inside space-y-1">
          <li>
            目前仅支持根据 Typecho后台 导出的备份(.bat)文件自动迁移数据。
          </li>
          <li>
            由于平台之间的差异性，目前仅支持迁移<b>文章</b>、<b>分类</b>、<b>标签</b>、<b>页面</b>、<b>评论</b>、<b>附件</b>数据，其它
            数据（包括主题模板、网站设置，用户等）无法迁移。
          </li>
          <li>迁移完成后, 不建议立即删除Typecho 的备份文件，可以先检查数据是否完整。</li>
        </ul>
      </template>
    </VAlert>
    <FileSelector
      :options="{ accept: '.dat', multiple: false }"
      @fileChange="handleFileChange"
    ></FileSelector>
  </div>
</template>
