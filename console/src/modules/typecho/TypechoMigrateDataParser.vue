<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import type { MigrateData } from '@/types'
import { VAlert, VButton } from '@halo-dev/components'
import { useTypechoDataParser, uploadAttachment } from './use-typecho-data-parser'
import { ref } from 'vue'

defineProps<{
  data: MigrateData
}>()

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
}>()

const migrateData = ref<MigrateData>()
const isMigrateAttachments = ref<boolean>(false)
const attachmentBaseURL = ref<string>('https://')

const handleFileChange = (files: FileList) => {
  const file = files.item(0)
  if (!file) {
    return
  }
  // uploadAttachment('193115244.png', 'https://blog.3gxk.net/usr/uploads/2017/08/193115244.png').then(
  //   (res) => {
  //     console.log('上传结果:', res)
  //   }
  // )
  useTypechoDataParser(file)
    .parse()
    .then((data) => {
      migrateData.value = data
      console.log('迁移数据:', data)
    })
    .catch((error: any) => {
      console.error(error)
    })
}

function handleMigrateAttachments() {
  migrateData.value?.posts?.forEach((post) => {
    console.log('处理文章raw:', post.postRequest.content?.raw)
    console.log('处理文章content:', post.postRequest.content?.content)
  })
}
</script>
<template>
  <div class=":uno: sm:w-1/2 space-y-4">
    <VAlert title="注意事项" type="info" :closable="false" class=":uno: sheet">
      <template #description>
        <ul class=":uno: ml-2 list-disc list-inside space-y-1">
          <li>目前仅支持根据 Typecho后台 导出的备份(.bat)文件自动迁移数据。</li>
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
    <FormKit
      v-if="migrateData?.attachments?.length"
      v-model="isMigrateAttachments"
      type="checkbox"
      label="迁移附件"
      name="isMigrateAttachments"
    />
    <div v-if="isMigrateAttachments && migrateData?.attachments?.length">
      <FormKit
        v-model="attachmentBaseURL"
        type="text"
        label="原博客地址"
        name="attachmentBaseURL"
        placeholder="请输入原博客地址（用于附件迁移）"
        :classes="{ outer: '!mb-0 flex-1' }"
      />
      <VButton @click="handleMigrateAttachments">开始迁移附件</VButton>
    </div>
    <div
      v-if="isMigrateAttachments && migrateData?.attachments?.length"
      class="border rounded p-4 space-y-2"
    >
      <span class="font-bold">附件列表</span>
      <ul class="list-disc list-inside max-h-64 overflow-y-auto">
        <li v-for="attachment in migrateData.attachments" :key="attachment.id">
          {{ attachmentBaseURL + attachment.path }}
        </li>
      </ul>
    </div>
    <VAlert
      v-if="isMigrateAttachments && migrateData?.attachments?.length"
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
