<script setup lang="ts">
import MigrateProvider from '@/components/MigrateProvider.vue'
import { providerItems } from '@/modules/index'
import type { Provider } from '@/types'
import { VPageHeader } from '@halo-dev/components'
import { useRouter } from 'vue-router'
import SolarTransferHorizontalBoldDuotone from '~icons/solar/transfer-horizontal-bold-duotone'

const router = useRouter()

const handleSelectProvider = (provider: Provider) => {
  router.push({
    name: 'MigrateExecute',
    query: { provider: provider.name }
  })
}
</script>

<template>
  <VPageHeader title="迁移">
    <template #icon>
      <SolarTransferHorizontalBoldDuotone class=":uno: mr-2 self-center" />
    </template>
  </VPageHeader>

  <div class=":uno: m-4">
    <div class=":uno: mx-auto max-w-5xl space-y-6">
      <div class=":uno: text-center">
        <h1 class=":uno: text-2xl text-gray-900 font-bold">选择迁移平台</h1>
        <p class=":uno: mx-auto mt-2 max-w-lg text-gray-500">
          选择你要从哪个平台迁移数据到 Halo。支持 Halo 1.x、WordPress、Typecho 等主流博客平台。
        </p>
      </div>

      <div class=":uno: rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <MigrateProvider :providers="providerItems" @selectProvider="handleSelectProvider" />
      </div>

      <div class=":uno: flex justify-center gap-8 text-sm text-gray-500">
        <div class=":uno: flex items-center gap-2">
          <span
            class=":uno: h-6 w-6 flex items-center justify-center rounded-full bg-indigo-50 text-xs text-indigo-600 font-medium"
            >1</span
          >
          <span>选择平台</span>
        </div>
        <div class=":uno: w-8 self-center border-t border-gray-300 border-dashed" />
        <div class=":uno: flex items-center gap-2">
          <span
            class=":uno: h-6 w-6 flex items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 font-medium"
            >2</span
          >
          <span>上传数据</span>
        </div>
        <div class=":uno: w-8 self-center border-t border-gray-300 border-dashed" />
        <div class=":uno: flex items-center gap-2">
          <span
            class=":uno: h-6 w-6 flex items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 font-medium"
            >3</span
          >
          <span>开始迁移</span>
        </div>
      </div>
    </div>
  </div>
</template>
