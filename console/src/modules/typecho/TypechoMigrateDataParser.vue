<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import type { MigrateAttachment, MigrateData } from '@/types'
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
const migrationStatus = ref<'idle' | 'migrating' | 'completed'>('idle')
const attachments = ref<MigrateAttachment[]>([])

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

  for (let i = attachments.value.length - 1; i >= 0; i--) {
    const attachment = attachments.value[i]
    const oldUrl = attachmentBaseURL.value + attachment.path
    try {
      console.log(`正在上传附件: ${attachment.name} 从 ${oldUrl}`)
      const res = await uploadAttachment(attachment.name, oldUrl)
      const newUrl = res.data.metadata.annotations?.['storage.halo.run/uri'] ?? ''
      console.log(`附件 ${attachment.name} 上传成功，新地址: ${newUrl}`)

      // 替换文章中的附件地址
      migrateData.value.posts?.forEach((post) => {
        if (post.postRequest.content?.raw?.includes(oldUrl)) {
          post.postRequest.content.raw = post.postRequest.content.raw.replaceAll(oldUrl, newUrl)
          console.log(`文章 [${post.postRequest.post.spec.title}] raw 内容中的附件地址已替换`)
        }
        if (post.postRequest.content?.content?.includes(oldUrl)) {
          post.postRequest.content.content = post.postRequest.content.content.replaceAll(
            oldUrl,
            newUrl
          )
          console.log(`文章 [${post.postRequest.post.spec.title}] content 内容中的附件地址已替换`)
        }
      })

      // 替换页面中的附件地址
      migrateData.value.pages?.forEach((page) => {
        if (page.singlePageRequest.content?.raw?.includes(oldUrl)) {
          page.singlePageRequest.content.raw = page.singlePageRequest.content.raw.replaceAll(
            oldUrl,
            newUrl
          )
          console.log(`页面 [${page.singlePageRequest.page.spec.title}] raw 内容中的附件地址已替换`)
        }
        if (page.singlePageRequest.content?.content?.includes(oldUrl)) {
          page.singlePageRequest.content.content =
            page.singlePageRequest.content.content.replaceAll(oldUrl, newUrl)
          console.log(
            `页面 [${page.singlePageRequest.page.spec.title}] content 内容中的附件地址已替换`
          )
        }
      })
      attachments.value.splice(i, 1)
    } catch (error) {
      console.error(`附件 ${attachment.name} 上传失败:`, error)
    }
  }
  console.log('所有附件处理完成')
  emit('update:data', migrateData.value)
  migrationStatus.value = 'completed'
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
        有 {{ attachments.length }} 个附件迁移失败。请检查下方“待附件列表”中的链接是否可以正常访问，并确认原博客地址填写正确。
      </template>
    </VAlert>
    <div
      v-if="isMigrateAttachments && attachments.length"
      class="border rounded p-4 space-y-2"
    >
      <span class="font-bold">待附件列表</span>
      <ul class="list-disc list-inside max-h-64 overflow-y-auto">
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
