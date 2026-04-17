<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import type { MigrateData } from '@/types'
import { VAlert, VButton } from '@halo-dev/components'
import { computed, ref } from 'vue'
import { useHaloDataParser } from './use-halo-data-parser'

const props = defineProps<{
  data: MigrateData
  activatedPluginNames: string[]
}>()

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
  (event: 'policyChange', value: Map<string, string>): void
}>()

const parsedData = ref<MigrateData>()
const parsing = ref(false)

interface RequiredPlugin {
  key: string
  name: string
  storeUrl: string
}

const REQUIRED_PLUGINS: Record<string, RequiredPlugin> = {
  moments: {
    key: 'PluginMoments',
    name: '瞬间',
    storeUrl: 'https://www.halo.run/store/apps/app-SnwWD'
  },
  photos: {
    key: 'PluginPhotos',
    name: '图库',
    storeUrl: 'https://www.halo.run/store/apps/app-BmQJW'
  },
  links: {
    key: 'PluginLinks',
    name: '链接',
    storeUrl: 'https://www.halo.run/store/apps/app-hfbQg'
  }
}

const requiredPlugins = computed(() => {
  if (!parsedData.value) return []
  const list: RequiredPlugin[] = []
  if (parsedData.value.moments && parsedData.value.moments.length > 0) {
    list.push(REQUIRED_PLUGINS.moments)
  }
  if (parsedData.value.photos && parsedData.value.photos.length > 0) {
    list.push(REQUIRED_PLUGINS.photos)
  }
  if (parsedData.value.links && parsedData.value.links.length > 0) {
    list.push(REQUIRED_PLUGINS.links)
  }
  return list
})

const missingPlugins = computed(() => {
  return requiredPlugins.value.filter((p) => !props.activatedPluginNames.includes(p.key))
})

const handleFileChange = (files: FileList) => {
  const file = files.item(0)
  if (!file) {
    return
  }
  parsing.value = true
  useHaloDataParser(file)
    .parse()
    .then((data) => {
      parsedData.value = data
      emit('update:data', data)
    })
    .catch((error: any) => {
      console.error(error)
      alert(error?.message || String(error))
    })
    .finally(() => {
      parsing.value = false
    })
}

const handlePolicyChange = (map: Map<string, string>) => {
  emit('policyChange', map)
}

const reset = () => {
  parsedData.value = undefined
  emit('update:data', {} as MigrateData)
}

defineExpose({
  reset
})
</script>

<template>
  <div>
    <div v-if="!parsedData">
      <VAlert title="迁移提示" type="info" :closable="false" class=":uno: mb-3">
        <template #description>
          请选择从 Halo 1.x 后台导出的 JSON 数据文件（如
          halo-data-export-2026-04-17-12-10-54-887748033.json）。
        </template>
      </VAlert>
      <FileSelector
        :options="{ accept: '.json', multiple: false }"
        @fileChange="handleFileChange"
        buttonText="选择 JSON 文件"
      />
      <div v-if="parsing" class=":uno: mt-3 text-sm text-gray-600">正在解析数据...</div>
    </div>

    <div v-else class=":uno: space-y-5">
      <VAlert
        v-if="missingPlugins.length > 0"
        type="warning"
        title="缺少必要插件"
        :closable="false"
      >
        <template #description>
          <div class=":uno: space-y-1 text-sm">
            <p>检测到以下数据，但对应插件尚未安装或启用，请先安装后再继续迁移：</p>
            <ul class=":uno: list-inside list-disc space-y-1">
              <li v-for="plugin in missingPlugins" :key="plugin.key">
                {{ plugin.name }}
                <a
                  :href="plugin.storeUrl"
                  target="_blank"
                  class=":uno: text-indigo-600 hover:underline"
                >
                  前往安装
                </a>
              </li>
            </ul>
          </div>
        </template>
      </VAlert>
    </div>
  </div>
</template>
