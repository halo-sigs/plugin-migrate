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
    class="grid migrate-m-4 migrate-mt-4 migrate-cursor-pointer migrate-grid-cols-3 migrate-gap-16"
  >
    <li
      v-for="provider in providers"
      :key="provider.name"
      @click="handleSelectProvider(provider)"
      class=":hover:migrate-bg-gray-100 migrate-flex migrate-items-center migrate-justify-center migrate-rounded-lg migrate-border migrate-border-gray-200 migrate-border-opacity-50 migrate-bg-gray-300 migrate-p-2"
      :class="{
        '!migrate-bg-blue-500': currentProvider?.name == provider.name,
      }"
    >
      <img
        :src="provider.icon"
        :alt="provider.name"
        class="migrate-mr-6 migrate-h-10 migrate-w-10"
      />
      <div class="migrate-flex migrate-flex-col">
        <span>{{ provider.name }}</span>
        <span class="migrate-text-gray-500">
          {{ provider.description }}
        </span>
      </div>
    </li>
  </ul>
</template>
