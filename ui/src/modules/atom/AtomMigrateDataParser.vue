<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import type { MigrateData } from '@/types'
import { Toast, VAlert, VButton } from '@halo-dev/components'
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
</script>
<template>
  <div class=":uno: sm:w-1/2">
    <div class=":uno: mb-2">
      <VAlert title="提示" type="info" :closable="false">
        <template #description>
          Atom Feed 文件中至少需要具有文章标题以及包含文章内容的 content
          字段，否则文章将无法正确导入。
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
    </div>
  </div>
</template>
