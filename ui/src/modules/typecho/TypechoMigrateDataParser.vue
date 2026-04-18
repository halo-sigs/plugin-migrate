<script setup lang="ts">
import MigrateSourceUploadCard from '@/components/MigrateSourceUploadCard.vue'
import type { MigrateData } from '@/types'
import { ref } from 'vue'
import { useTypechoDataParser } from './use-typecho-data-parser'

defineProps<{
  data: MigrateData
}>()

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
}>()

const parseError = ref<string>()

const reset = () => {
  parseError.value = undefined
  emit('update:data', {} as MigrateData)
}

defineExpose({
  reset
})

const handleFileChange = (files: FileList) => {
  parseError.value = undefined
  const file = files.item(0)
  if (!file) {
    return
  }
  useTypechoDataParser(file)
    .parse()
    .then((data) => {
      parseError.value = undefined
      emit('update:data', data)
    })
    .catch((error: unknown) => {
      parseError.value = error instanceof Error ? error.message : String(error)
      console.error(error)
    })
}
</script>
<template>
  <MigrateSourceUploadCard
    :file-options="{ accept: '.dat,.txt', multiple: false }"
    :parse-error="parseError"
    @file-change="handleFileChange"
  >
    <template #description>
      请选择从 Typecho 后台【备份】功能中导出的数据文件（.dat / .txt）。
      <ul class=":uno: ml-2 mt-1 list-disc list-inside space-y-1">
        <li>目前仅支持根据 Typecho 后台导出的备份文件自动迁移数据。</li>
        <li>
          由于平台之间的差异性，目前仅支持迁移<b>文章</b>、<b>分类</b>、<b>标签</b>、<b>页面</b>、<b>评论</b>、<b>附件</b>数据，其它
          数据（包括主题模板、网站设置，用户等）无法迁移。
        </li>
        <li>附件会在下一步统一使用本地目录上传或手动迁移策略处理。</li>
        <li>迁移完成后，不建议立即删除 Typecho 的备份文件，可以先检查数据是否完整。</li>
      </ul>
    </template>
  </MigrateSourceUploadCard>
</template>
