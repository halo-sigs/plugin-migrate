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
  <ul class=":uno: grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    <li
      v-for="provider in providers"
      :key="provider.name"
      class=":uno: group relative flex cursor-pointer items-center gap-4 border border-gray-200 rounded-xl bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-md"
      :class="{
        ':uno: border-indigo-500 ring-1 ring-indigo-500': currentProvider?.name == provider.name
      }"
      @click="handleSelectProvider(provider)"
    >
      <div
        class=":uno: h-14 w-14 flex shrink-0 items-center justify-center rounded-lg bg-gray-50 transition-colors group-hover:bg-indigo-50"
        :class="{
          ':uno: bg-indigo-50': currentProvider?.name == provider.name
        }"
      >
        <img :src="provider.icon" :alt="provider.name" class=":uno: h-8 w-8 object-contain" />
      </div>
      <div class=":uno: min-w-0 flex-1">
        <div class=":uno: flex items-center gap-2">
          <span class=":uno: text-gray-900 font-semibold">{{ provider.name }}</span>
          <span
            v-if="currentProvider?.name == provider.name"
            class=":uno: h-5 w-5 inline-flex items-center justify-center rounded-full bg-indigo-500 text-white"
          >
            <svg class=":uno: h-3 w-3" viewBox="0 0 14 10" fill="none">
              <path
                d="M1 5L4.5 8.5L13 1"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </div>
        <p class=":uno: line-clamp-2 mt-0.5 text-sm text-gray-500">{{ provider.description }}</p>
      </div>
    </li>
  </ul>
</template>
