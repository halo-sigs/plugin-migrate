<script setup lang="ts">
import type { Provider, MigrateData } from "@/types";
import { useFileDialog } from "@vueuse/core";
import { ref, watch } from "vue";

const { files, open, reset } = useFileDialog();

defineProps<{
  providers: Provider[];
}>();

const emit = defineEmits<{
  (event: "fileChange", value: MigrateData, provider: Provider): void;
}>();

const currentProvider = ref<Provider>();

const handleOpenFile = (provider: Provider) => {
  reset();
  open({
    accept: provider.accept,
    multiple: provider.multiple,
  });
  currentProvider.value = provider;
};

watch(
  () => files.value,
  () => {
    if (!files.value || !currentProvider.value) {
      return;
    }

    // 初始化解析器
    const parser = new currentProvider.value.parser(files.value);
    parser
      .parse()
      .then((data: MigrateData) => {
        emit("fileChange", data, currentProvider.value as Provider);
      })
      .catch((error: any) => {
        console.error(error);
      });
  }
);
</script>
<template>
  <ul
    class="grid migrate-m-4 migrate-mt-4 migrate-cursor-pointer migrate-grid-cols-3 migrate-gap-16"
  >
    <li
      v-for="provider in providers"
      :key="provider.name"
      @click="handleOpenFile(provider)"
      class=":hover:migrate-bg-gray-100 migrate-flex migrate-items-center migrate-justify-center migrate-rounded-lg migrate-border migrate-border-gray-200 migrate-border-opacity-50 migrate-bg-gray-300 migrate-p-2"
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
