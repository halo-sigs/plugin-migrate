<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import type { MigrateData } from '@/types'
import { Toast, VAlert, VButton } from '@halo-dev/components'
import { ref } from 'vue'
import { useRssDataParser } from './use-rss-data-parser'
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
        console.error(error)
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

defineExpose({
  reset
})
</script>
<template>
  <div >
    <div class=":uno: mb-2">
      <VAlert title="迁移提示" type="info" :closable="false">
        <template #description>
          请上传 RSS 订阅源文件（.xml）或输入订阅链接，系统会自动解析其中的文章数据。
          <br />
          RSS 文件中至少需要具有文章标题以及包含文章内容的 content:encoded 或者 description
          字段，否则导入的文章内容可能不正确。
        </template>
      </VAlert>
    </div>
    <div>
      <FileSelector
        :options="{ accept: '.xml', multiple: false }"
        @fileChange="handleFileChange"
      ></FileSelector>
      <span class=":uno: my-6 block"> 或 </span>
      <div>
        <FormKit v-model="rssUrl" type="url" placeholder="请输入 RSS 订阅链接" validation="url">
          <template #suffix>
            <VButton
              type="primary"
              size="sm"
              class=":uno: mx-1"
              :loading="loading"
              @click="handleUrlSubmit"
            >
              解析
            </VButton>
          </template>
        </FormKit>
      </div>
    </div>
  </div>
</template>
