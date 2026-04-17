<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import type { MigrateAttachment, MigrateData } from '@/types'
import { VAlert, VButton } from '@halo-dev/components'
import { ref } from 'vue'
import { migrateTypechoAttachments } from './use-typecho-attachment-migrator'
import { useTypechoDataParser } from './use-typecho-data-parser'

defineProps<{
  data: MigrateData
}>()

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
}>()

const migrateData = ref<MigrateData>()
const isMigrateAttachments = ref<boolean>(false)
const attachmentBaseURL = ref<string>('https://')
const migrationStatus = ref<'idle' | 'migrating' | 'completed'>('idle')
const attachments = ref<MigrateAttachment[]>([])

const reset = () => {
  migrateData.value = undefined
  attachments.value = []
  migrationStatus.value = 'idle'
  attachmentBaseURL.value = 'https://'
  isMigrateAttachments.value = false
  emit('update:data', {} as MigrateData)
}

defineExpose({
  reset
})

const handleFileChange = (files: FileList) => {
  migrationStatus.value = 'idle'
  const file = files.item(0)
  if (!file) {
    return
  }
  useTypechoDataParser(file)
    .parse()
    .then((data) => {
      migrateData.value = data
      attachments.value = data.attachments ?? []
      migrateData.value.attachments = []
      emit('update:data', migrateData.value)
    })
    .catch((error: any) => {
      console.error(error)
    })
}

async function handleMigrateAttachments() {
  if (!attachments?.value.length || !migrateData.value) {
    return
  }

  migrationStatus.value = 'migrating'

  const result = await migrateTypechoAttachments(
    migrateData.value,
    attachments.value,
    attachmentBaseURL.value
  )

  migrateData.value = result.data
  attachments.value = result.failedAttachments
  emit('update:data', result.data)
  migrationStatus.value = 'completed'
}
</script>
<template>
  <div class=":uno: space-y-4">
    <VAlert title="迁移提示" type="info" :closable="false" class=":uno: sheet">
      <template #description>
        请选择从 Typecho 后台【备份】功能中导出的数据文件（.dat / .txt）。
        <ul class=":uno: ml-2 mt-1 list-disc list-inside space-y-1">
          <li>目前仅支持根据 Typecho 后台导出的备份文件自动迁移数据。</li>
          <li>
            由于平台之间的差异性，目前仅支持迁移<b>文章</b>、<b>分类</b>、<b>标签</b>、<b>页面</b>、<b>评论</b>、<b>附件</b>数据，其它
            数据（包括主题模板、网站设置，用户等）无法迁移。
          </li>
          <li>迁移完成后，不建议立即删除 Typecho 的备份文件，可以先检查数据是否完整。</li>
        </ul>
      </template>
    </VAlert>
    <FileSelector
      :options="{ accept: '.dat', multiple: false }"
      @fileChange="handleFileChange"
    ></FileSelector>
    <FormKit
      v-if="attachments.length"
      v-model="isMigrateAttachments"
      type="checkbox"
      label="迁移附件"
      name="isMigrateAttachments"
    />
    <div v-if="isMigrateAttachments && attachments.length">
      <FormKit
        v-model="attachmentBaseURL"
        type="text"
        label="原博客地址"
        name="attachmentBaseURL"
        placeholder="请输入原博客地址（用于附件迁移）"
        :classes="{ outer: '!mb-0 flex-1' }"
      />
      <VButton
        :loading="migrationStatus === 'migrating'"
        :disabled="migrationStatus === 'migrating'"
        @click="handleMigrateAttachments"
        >开始迁移附件</VButton
      >
    </div>
    <VAlert
      v-if="migrationStatus === 'migrating'"
      title="正在迁移附件"
      type="info"
      :closable="false"
      class=":uno: sheet"
    >
      <template #description> 正在迁移附件，请不要刷新页面。 </template>
    </VAlert>
    <VAlert
      v-if="migrationStatus === 'completed' && !attachments.length"
      title="迁移完成"
      type="success"
      :closable="true"
      class=":uno: sheet"
    >
      <template #description> 所有附件迁移完成。 </template>
    </VAlert>
    <VAlert
      v-if="migrationStatus === 'completed' && attachments.length"
      title="部分附件迁移失败"
      type="warning"
      :closable="true"
      class=":uno: sheet"
    >
      <template #description>
        有
        {{ attachments.length }}
        个附件迁移失败。请检查下方“待附件列表”中的链接是否可以正常访问，并确认原博客地址填写正确。
      </template>
    </VAlert>
    <div
      v-if="isMigrateAttachments && attachments.length"
      class=":uno: border rounded p-4 space-y-2"
    >
      <span class=":uno: font-bold">待附件列表</span>
      <ul class=":uno: max-h-64 list-disc list-inside overflow-y-auto">
        <li v-for="attachment in attachments" :key="attachment.id">
          {{ attachmentBaseURL + attachment.path }}
        </li>
      </ul>
    </div>
    <VAlert
      v-if="isMigrateAttachments && attachments.length"
      title="附件迁移说明"
      type="info"
      :closable="false"
      class=":uno: sheet"
    >
      <template #description>
        <ol class=":uno: ml-2 list-disc list-inside space-y-1">
          <li>附件迁移需要保证原博客地址能够访问。</li>
          <li>填写原博客地址, 访问附件列表中的地址, 如果能够成功访问则填写正确。</li>
          <li>
            迁移附件的同时会对文章/页面的内容进行扫描, 如果发现有引用附件的情况会自动进行替换。
          </li>
        </ol>
      </template>
    </VAlert>
  </div>
</template>
