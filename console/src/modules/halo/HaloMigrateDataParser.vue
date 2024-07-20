<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import type { MigrateData } from '@/types'
import { useHaloDataParser } from './use-halo-data-parser'
defineProps<{
  data: MigrateData
}>()

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
}>()

const handleFileChange = (files: FileList) => {
  const file = files.item(0)
  if (!file) {
    return
  }
  useHaloDataParser(file)
    .parse()
    .then((data) => {
      emit('update:data', data)
    })
    .catch((error: any) => {
      console.error(error)
    })
}
</script>
<template>
  <div class="sm:w-1/2">
    <FileSelector
      :options="{ accept: '.json', multiple: false }"
      @fileChange="handleFileChange"
    ></FileSelector>
  </div>
</template>
