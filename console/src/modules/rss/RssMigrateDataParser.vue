<script setup lang="ts">
import type { MigrateData } from "@/types";
import FileSelector from "@/components/FileSelector.vue";
import { useRssDataParser } from "./use-rss-data-parser";
defineProps<{
  data: MigrateData;
}>();

const emit = defineEmits<{
  (event: "update:data", value: MigrateData): void;
}>();

const handleFileChange = (files: FileList) => {
  const file = files.item(0);
  if (!file) {
    return;
  }
  useRssDataParser(file)
    .parse()
    .then((data) => {
      emit("update:data", data);
    })
    .catch((error: any) => {
      console.error(error);
    });
};
</script>
<template>
  <div>
    <FileSelector
      :options="{ accept: '.xml' }"
      @fileChange="handleFileChange"
    ></FileSelector>
    <span class="migrate-my-6 migrate-block"> 或 </span>
    <div>
      <form>
        <label
          for="search"
          class="migrate-sr-only migrate-mb-2 migrate-text-sm migrate-font-medium"
          >请输入 RSS 订阅链接</label
        >
        <div class="migrate-relative">
          <input
            type="search"
            id="search"
            class="migrate-block migrate-w-full migrate-rounded-lg migrate-border migrate-border-gray-300 migrate-bg-gray-50 migrate-p-4 migrate-text-sm focus:migrate-border-blue-500 focus:migrate-ring-blue-500 dark:migrate-border-gray-600"
            placeholder="请输入 RSS 订阅链接"
            required
          />
          <button
            type="submit"
            class="migrate-absolute migrate-bottom-2.5 migrate-right-2.5 migrate-rounded-lg !migrate-bg-blue-700 migrate-px-4 migrate-py-2 migrate-text-sm migrate-font-medium migrate-text-white hover:!migrate-bg-blue-800 focus:migrate-outline-none focus:migrate-ring-4 focus:migrate-ring-blue-300 dark:!migrate-bg-blue-600 dark:hover:!migrate-bg-blue-700 dark:focus:!migrate-ring-blue-800"
          >
            解析
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
