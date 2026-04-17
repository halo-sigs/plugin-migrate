<script setup lang="ts">
import MigrateProvider from '@/components/MigrateProvider.vue'
import { providerItems } from '@/modules/index'
import type { Provider } from '@/types'
import { VCard, VPageHeader } from '@halo-dev/components'
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
    <VCard title="选择迁移平台">
      <MigrateProvider :providers="providerItems" @selectProvider="handleSelectProvider" />
    </VCard>
  </div>
</template>
