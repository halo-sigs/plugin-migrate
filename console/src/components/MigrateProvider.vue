<script setup lang="ts">
import type { Provider } from "@/types";
import { ref } from "vue";

defineProps<{
  providers: Provider[];
}>();

const emit = defineEmits<{
  (event: "selectProvider", provider: Provider): void;
}>();

const currentProvider = ref<Provider>();

const handleSelectProvider = (provider: Provider) => {
  currentProvider.value = provider;
  emit("selectProvider", provider);
};
</script>
<template>
  <ul
    class="grid migrate-grid-cols-1 migrate-gap-8 sm:migrate-grid-cols-2 md:migrate-grid-cols-3"
  >
    <li
      v-for="provider in providers"
      :key="provider.name"
      @click="handleSelectProvider(provider)"
      class="migrate-flex migrate-cursor-pointer migrate-items-center migrate-justify-center migrate-rounded-lg migrate-p-4 migrate-ring-1 migrate-ring-gray-200 hover:migrate-bg-gray-100"
      :class="{
        '!migrate-bg-gray-100 !migrate-ring-indigo-400':
          currentProvider?.name == provider.name,
      }"
    >
      <div class="migrate-mr-4 migrate-h-10 migrate-w-10">
        <img
          :src="provider.icon"
          :alt="provider.name"
          class="migrate-h-full migrate-w-full"
        />
      </div>
      <div class="migrate-flex migrate-flex-col" :title="provider.description">
        <span class="migrate-text migrate-line-clamp-1 migrate-font-semibold">
          {{ provider.name }}
        </span>
        <span
          class="migrate-line-clamp-2 migrate-py-1 migrate-text-sm migrate-text-gray-500"
        >
          {{ provider.description }}
        </span>
      </div>
    </li>
  </ul>
</template>
