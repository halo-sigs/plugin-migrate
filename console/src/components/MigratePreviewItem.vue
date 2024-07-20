<script setup lang="ts">
const props = defineProps<{
  name: string;
  dataList?: any[];
}>();
</script>
<template>
  <li v-if="dataList" class="py-3 sm:py-4">
    <div
      class="flex items-center justify-between space-x-4"
    >
      <span class="font-semibold">{{ name }}</span>
      <div class="text-sm text-gray-600">
        共 {{ dataList.length }} 条
      </div>
    </div>
  </li>
</template>
