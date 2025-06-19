<script setup lang="ts">
const props = defineProps<{
  name: string
  dataList?: any[]
}>()
</script>
<template>
  <li v-if="dataList" class=":uno: py-3 sm:py-4">
    <div class=":uno: flex items-center justify-between space-x-4">
      <span class=":uno: font-semibold">{{ name }}</span>
      <div class=":uno: text-sm text-gray-600">共 {{ dataList.length }} 条</div>
    </div>
  </li>
</template>
