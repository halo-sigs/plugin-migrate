<script setup lang="ts">
import MigrateSourceUploadCard from '@/components/MigrateSourceUploadCard.vue'
import type { MigrateData } from '@/types'
import { Toast, VButton } from '@halo-dev/components'
import { ref } from 'vue'
import { useRssDataParser } from './use-atom-data-parser'
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
  useRssDataParser(file)
    .parse()
    .then((data) => {
      emit('update:data', data)
    })
    .catch((error: any) => {
      Toast.error(error)
      console.error(error)
    })
}

const rssUrl = ref('')
const loading = ref(false)
const handleUrlSubmit = () => {
  if (rssUrl.value) {
    loading.value = true
    useRssDataParser(rssUrl.value)
      .parse()
      .then((data) => {
        Toast.success('解析成功, 共获取到 ' + data.posts?.length + ' 篇文章')
        if (!data.posts?.length) {
          return
        }
        emit('update:data', data)
      })
      .catch((error: any) => {
        Toast.error(error)
      })
      .finally(() => {
        loading.value = false
      })
  }
}

const reset = () => {
  rssUrl.value = ''
  emit('update:data', {} as MigrateData)
}

function openDocument() {
  window.open('https://www.halo.run/docs/plugin-migrate/migrate/rss', '_blank')
}

defineExpose({
  reset
})
</script>
<template>
  <MigrateSourceUploadCard
    :file-options="{ accept: '.xml', multiple: false }"
    button-text="选择 XML 文件"
    @file-change="handleFileChange"
  >
    <template #description>
      <ol>
        <li>1. 准备 Atom Feed 文件（XML）或可直接访问的 Atom 订阅链接</li>
        <li>2. 确认 Atom 中包含文章标题以及完整正文内容字段</li>
        <li>3. 点击下方的选择 XML 文件按钮，或在下方输入 Atom 订阅链接并解析</li>
        <li>4. 审查解析到的文章标题、发布时间和正文内容</li>
        <li>5. 最后，点击开始导入按钮开始迁移</li>
        <li>6. 迁移完成后，建议抽样检查正文内容和远程资源链接</li>
      </ol>
    </template>
    <template #actions>
      <VButton ghost size="sm" type="default" @click="openDocument"> 查阅详细迁移文档 </VButton>
    </template>
    <template #extra-selectors>
      <span class=":uno: my-2 block text-sm text-gray-500">或输入 Atom 订阅链接</span>
      <div>
        <FormKit v-model="rssUrl" type="url" placeholder="请输入 Atom 订阅链接" validation="url">
          <template #suffix>
            <VButton
              type="primary"
              size="sm"
              class=":uno: mr-1"
              :loading="loading"
              @click="handleUrlSubmit"
            >
              解析
            </VButton>
          </template>
        </FormKit>
      </div>
    </template>
  </MigrateSourceUploadCard>
</template>
