<script setup lang="ts">
import MigrateSourceUploadCard from '@/components/MigrateSourceUploadCard.vue'
import type { MigrateData } from '@/types'
import { VButton } from '@halo-dev/components'
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

function openDocument() {
  window.open('https://www.halo.run/docs/plugin-migrate/migrate/typecho', '_blank')
}
</script>
<template>
  <MigrateSourceUploadCard
    :file-options="{ accept: '.dat,.txt', multiple: false }"
    :parse-error="parseError"
    buttonText="选择 DAT / TXT 文件"
    @file-change="handleFileChange"
  >
    <template #description>
      <ol>
        <li>1. 在 Typecho 后台的控制台 -> 备份中导出网站数据，格式为 DAT / TXT</li>
        <li>2. 下载 Typecho 站点中的 usr/uploads 目录（可选），用于后续附件迁移</li>
        <li>3. 点击下方的选择 DAT / TXT 文件按钮，并选择刚刚导出的备份文件</li>
        <li>4. 如果检测到本地附件，根据后续提示选择上传到 Halo 或手动迁移</li>
        <li>5. 最后，点击开始导入按钮开始迁移</li>
        <li>6. 迁移完成后，建议抽样检查页面、评论层级和附件引用是否正确</li>
      </ol>
    </template>
    <template #actions>
      <VButton ghost size="sm" type="default" @click="openDocument"> 查阅详细迁移文档 </VButton>
    </template>
  </MigrateSourceUploadCard>
</template>
