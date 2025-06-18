<script setup lang="ts">
import type { Provider } from '@/types'
import { ref } from 'vue'

defineProps<{
  providers: Provider[]
}>()

const emit = defineEmits<{
  (event: 'selectProvider', provider: Provider): void
}>()

const currentProvider = ref<Provider>()

const handleSelectProvider = (provider: Provider) => {
  currentProvider.value = provider
  emit('selectProvider', provider)
}
</script>
<template>
  <ul class=":uno: grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
    <li
      v-for="provider in providers"
      :key="provider.name"
      @click="handleSelectProvider(provider)"
      class=":uno: flex cursor-pointer items-center rounded-lg p-4 ring-1 ring-gray-200 hover:bg-gray-100"
      :class="{
        ':uno: !bg-gray-100 !ring-indigo-400': currentProvider?.name == provider.name
      }"
    >
      <div class=":uno: mr-4 size-12">
        <img :src="provider.icon" :alt="provider.name" class=":uno: size-full" />
      </div>
      <div class=":uno: flex flex-col" :title="provider.description">
        <span class=":uno: text line-clamp-1 font-semibold">
          {{ provider.name }}
        </span>
        <span class=":uno: line-clamp-2 py-1 text-sm text-gray-500">
          {{ provider.description }}
        </span>
      </div>
    </li>
  </ul>
</template>
