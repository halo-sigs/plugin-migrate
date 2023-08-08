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
    class="grid migrate-mx-8 migrate-my-4 migrate-mt-4 migrate-grid-cols-3 migrate-gap-8"
  >
    <li
      v-for="provider in providers"
      :key="provider.name"
      @click="handleSelectProvider(provider)"
      class="migrate-flex migrate-cursor-pointer migrate-items-center migrate-justify-center migrate-rounded-lg migrate-border migrate-border-gray-200 migrate-p-4 hover:migrate-bg-blue-300"
      :class="{
        '!migrate-bg-blue-300': currentProvider?.name == provider.name,
      }"
    >
      <img
        :src="provider.icon"
        :alt="provider.name"
        class="migrate-mr-4 migrate-h-12 migrate-w-12"
      />
      <div class="migrate-flex migrate-flex-col" :title="provider.description">
        <span class="migrate-line-clamp-1 migrate-text-lg">{{
          provider.name
        }}</span>
        <span
          class="migrate-line-clamp-2 migrate-py-1 migrate-text-sm migrate-text-gray-500"
        >
          {{ provider.description }}
        </span>
      </div>
    </li>
  </ul>
</template>
