<script setup lang="ts">
import { type UseFileDialogOptions, useFileDialog } from "@vueuse/core";
import { ref, watch } from "vue";
const { files, open, reset } = useFileDialog();
const props = defineProps<{
  options?: UseFileDialogOptions;
}>();

const emit = defineEmits<{
  (event: "fileChange", files: FileList): void;
}>();

const selectedFileName = ref<string>();

const handleOpenFile = () => {
  reset();
  open(props.options);
};

watch(
  () => files.value,
  () => {
    if (!files.value) {
      return;
    }
    for (let i = 0; i < files.value.length; i++) {
      selectedFileName.value = files.value[i].name + " ";
    }
    emit("fileChange", files.value);
  },
);
</script>
<template>
  <div class="w-full" @click="handleOpenFile">
    <label
      class="text-blue border-blue flex cursor-pointer flex-col items-center rounded-lg border bg-white px-4 py-6 tracking-wide hover:bg-blue-400 hover:text-white"
    >
      <svg
        class="h-8 w-8"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
      >
        <path
          d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z"
        />
      </svg>
      <span class="mt-2 text-base leading-normal">
        选择文件
      </span>
      <p
        v-if="selectedFileName"
        class="text-xs text-gray-500 dark:text-gray-400"
      >
        已选择文件: {{ selectedFileName }}
      </p>
    </label>
  </div>
</template>
