<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import { VAlert } from '@halo-dev/components'
import type { UseFileDialogOptions } from '@vueuse/core'

defineProps<{
  fileOptions: UseFileDialogOptions
  buttonText?: string
  parseError?: string
  parsing?: boolean
  parsingText?: string
}>()

const emit = defineEmits<{
  (event: 'fileChange', files: FileList): void
}>()
</script>

<template>
  <div class=":uno: space-y-4">
    <VAlert title="迁移提示" type="info" :closable="false" class=":uno: sheet">
      <template #description>
        <slot name="description" />
      </template>
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </VAlert>

    <FileSelector
      :options="fileOptions"
      :button-text="buttonText"
      @file-change="(files) => emit('fileChange', files)"
    />

    <div v-if="parsing" class=":uno: text-sm text-gray-600">
      {{ parsingText || '正在解析数据...' }}
    </div>

    <VAlert v-if="parseError" title="解析失败" type="error" :closable="false" class=":uno: sheet">
      <template #description>
        {{ parseError }}
      </template>
    </VAlert>
  </div>
</template>
