<script setup lang="ts">
import { VButton } from '@halo-dev/components'
import { type UseFileDialogOptions, useFileDialog } from '@vueuse/core'
import { ref, watch } from 'vue'
const { files, open, reset } = useFileDialog()
const props = defineProps<{
  options?: UseFileDialogOptions
  folder?: boolean
  buttonText?: string
}>()

const emit = defineEmits<{
  (event: 'fileChange', files: FileList): void
}>()

const selectedFileName = ref<string>()

const handleOpenFile = () => {
  reset()
  const opts: UseFileDialogOptions = { ...props.options }
  if (props.folder) {
    opts.directory = true
  }
  open(opts)
}

watch(
  () => files.value,
  () => {
    if (!files.value) {
      return
    }
    for (let i = 0; i < files.value.length; i++) {
      selectedFileName.value = files.value[i].name + ' '
    }
    emit('fileChange', files.value)
  }
)
</script>

<template>
  <div class=":uno: flex items-center gap-3">
    <VButton type="secondary" @click="handleOpenFile">{{ buttonText || '选择文件' }}</VButton>
    <span v-if="selectedFileName" class=":uno: text-sm text-gray-600">
      已选择: {{ selectedFileName }}
    </span>
    <span v-else class=":uno: text-sm text-gray-400"> 未选择文件 </span>
  </div>
</template>
