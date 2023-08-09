<script setup lang="ts">
const props = defineProps<{
  name: string;
  dataList?: any[];
}>();
</script>
<template>
  <li v-if="dataList" class="migrate-py-3 sm:migrate-py-4">
    <div
      class="migrate-flex migrate-items-center migrate-justify-between migrate-space-x-4"
    >
      <span class="migrate-font-semibold">{{ name }}</span>
      <div class="migrate-text-sm migrate-text-gray-600">
        共 {{ dataList.length }} 条
      </div>
    </div>
  </li>
</template>
