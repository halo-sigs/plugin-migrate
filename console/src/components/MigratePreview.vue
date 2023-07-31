<script setup lang="ts">
import type { MigrateData, Provider } from "../types";
import { ref } from "vue";

const props = defineProps<{
  data: MigrateData;
  provider?: Provider;
}>();

// TODO: 可以在此处对要导入的数据进行过滤
const selectData = ref(props.data);

const emit = defineEmits<{
  (event: "import", value: MigrateData): void;
}>();

const handleImport = () => {
  // 触发导入事件
  emit("import", selectData.value);
};
</script>
<template>
  <div>
    <ul
      class="migrate-divide-y migrate-divide-gray-200 dark:migrate-divide-gray-700"
    >
      <li v-if="data.tags" class="migrate-py-3 sm:migrate-py-4">
        <div
          class="migrate-flex migrate-items-center migrate-justify-between migrate-space-x-4"
        >
          <span>标签</span>
          <div
            class="migrate-inline-flex migrate-items-center migrate-text-base migrate-font-semibold migrate-text-gray-900"
          >
            共 {{ data.tags.length }} 条
          </div>
        </div>
      </li>
      <li v-if="data.categories" class="migrate-py-3 sm:migrate-py-4">
        <div
          class="migrate-flex migrate-items-center migrate-justify-between migrate-space-x-4"
        >
          <span>分类</span>
          <div
            class="migrate-inline-flex migrate-items-center migrate-text-base migrate-font-semibold migrate-text-gray-900"
          >
            共 {{ data.categories.length }} 条
          </div>
        </div>
      </li>
      <li v-if="data.posts" class="migrate-py-3 sm:migrate-py-4">
        <div
          class="migrate-flex migrate-items-center migrate-justify-between migrate-space-x-4"
        >
          <span>文章</span>
          <div
            class="migrate-inline-flex migrate-items-center migrate-text-base migrate-font-semibold migrate-text-gray-900"
          >
            共 {{ data.posts.length }} 篇
          </div>
        </div>
      </li>
      <li v-if="data.pages" class="migrate-py-3 sm:migrate-py-4">
        <div
          class="migrate-flex migrate-items-center migrate-justify-between migrate-space-x-4"
        >
          <span>页面</span>
          <div
            class="migrate-inline-flex migrate-items-center migrate-text-base migrate-font-semibold migrate-text-gray-900"
          >
            共 {{ data.pages.length }} 个
          </div>
        </div>
      </li>
      <li v-if="data.comments" class="migrate-py-3 sm:migrate-py-4">
        <div
          class="migrate-flex migrate-items-center migrate-justify-between migrate-space-x-4"
        >
          <span>评论及回复</span>
          <div
            class="migrate-inline-flex migrate-items-center migrate-text-base migrate-font-semibold migrate-text-gray-900"
          >
            共 {{ data.comments.length }} 条
          </div>
        </div>
      </li>
      <li v-if="data.menuItems" class="migrate-py-3 sm:migrate-py-4">
        <div
          class="migrate-flex migrate-items-center migrate-justify-between migrate-space-x-4"
        >
          <span>菜单</span>
          <div
            class="migrate-inline-flex migrate-items-center migrate-text-base migrate-font-semibold migrate-text-gray-900"
          >
            共 {{ data.menuItems.length }} 个
          </div>
        </div>
      </li>
      <li v-if="data.moments" class="migrate-py-3 sm:migrate-py-4">
        <div
          class="migrate-flex migrate-items-center migrate-justify-between migrate-space-x-4"
        >
          <span>日志</span>
          <div
            class="migrate-inline-flex migrate-items-center migrate-text-base migrate-font-semibold migrate-text-gray-900"
          >
            共 {{ data.moments.length }} 条
          </div>
        </div>
      </li>
      <li v-if="data.photos" class="migrate-py-3 sm:migrate-py-4">
        <div
          class="migrate-flex migrate-items-center migrate-justify-between migrate-space-x-4"
        >
          <span>图库</span>
          <div
            class="migrate-inline-flex migrate-items-center migrate-text-base migrate-font-semibold migrate-text-gray-900"
          >
            共 {{ data.photos.length }} 张
          </div>
        </div>
      </li>
      <li v-if="data.links" class="migrate-py-3 sm:migrate-py-4">
        <div
          class="migrate-flex migrate-items-center migrate-justify-between migrate-space-x-4"
        >
          <span>友情链接</span>
          <div
            class="migrate-inline-flex migrate-items-center migrate-text-base migrate-font-semibold migrate-text-gray-900"
          >
            共 {{ data.links.length }} 个
          </div>
        </div>
      </li>
      <li v-if="data.attachments" class="migrate-py-3 sm:migrate-py-4">
        <div
          class="migrate-flex migrate-items-center migrate-justify-between migrate-space-x-4"
        >
          <span>附件</span>
          <div
            class="migrate-inline-flex migrate-items-center migrate-text-base migrate-font-semibold migrate-text-gray-900"
          >
            共 {{ data.attachments.length }} 个
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
