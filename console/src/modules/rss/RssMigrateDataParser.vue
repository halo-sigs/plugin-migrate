<script setup lang="ts">
import type { MigrateData } from "@/types";
import FileSelector from "@/components/FileSelector.vue";
import { useRssDataParser } from "./use-rss-data-parser";
import { ref } from "vue";
import { Toast, VAlert } from "@halo-dev/components";
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

const rssUrl = ref("");
const handleUrlSubmit = () => {
  if (rssUrl.value) {
    useRssDataParser(rssUrl.value)
      .parse()
      .then((data) => {
        Toast.success("解析成功, 共获取到 " + data.posts?.length + " 篇文章");
        if (!data.posts?.length) {
          return;
        }
        emit("update:data", data);
      })
      .catch((error: any) => {
        Toast.error("解析失败");
        console.error(error);
      });
  }
};
</script>
<template>
  <div class="migrate-w-1/2">
    <div class="migrate-absolute migrate-top-3">
      <VAlert title="提示" type="info" :closable="false">
        <template #description>
          RSS
          文件中至少需要具有文章标题以及文章内容(content:encoded)，否则将视为无效文章。
        </template>
      </VAlert>
    </div>
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
              type="url"
              id="search"
              v-model="rssUrl"
              class="migrate-block migrate-w-full migrate-rounded-lg migrate-border migrate-border-gray-300 migrate-bg-gray-50 migrate-p-4 migrate-text-sm focus:migrate-border-blue-500 focus:migrate-ring-blue-500 dark:migrate-border-gray-600"
              placeholder="请输入 RSS 订阅链接"
              required
            />
            <button
              type="submit"
              @click.prevent="handleUrlSubmit"
              class="migrate-absolute migrate-bottom-2.5 migrate-right-2.5 migrate-rounded-lg !migrate-bg-blue-700 migrate-px-4 migrate-py-2 migrate-text-sm migrate-font-medium migrate-text-white hover:!migrate-bg-blue-800 focus:migrate-outline-none focus:migrate-ring-4 focus:migrate-ring-blue-300 dark:!migrate-bg-blue-600 dark:hover:!migrate-bg-blue-700 dark:focus:!migrate-ring-blue-800"
            >
              解析
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
