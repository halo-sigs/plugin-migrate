<script setup lang="ts">
import { VButton } from "@halo-dev/components";
import { ref, type ComputedRef } from "vue";

export interface StepButtonItem {
  text?: string;
  loading?: ComputedRef;
  disabled?: ComputedRef;
  disabledMessage?: string;
  handler?: () => void | Promise<boolean>;
}

const props = defineProps<{
  data?: StepButtonItem;
}>();

const emit = defineEmits<{
  (event: "click"): void;
}>();

const handleClick = () => {
  if (props.data?.handler) {
    const handlePromise = props.data?.handler();
    if (handlePromise) {
      handlePromise.then((result) => {
        if (result) {
          emit("click");
        }
      });
      return;
    }
  } else {
    emit("click");
  }
};

const tooltipShown = ref<boolean>(false);
</script>
<template>
  <div @mouseenter="tooltipShown = true" @mouseleave="tooltipShown = false">
    <VButton
      :disabled="data?.disabled?.value"
      :loading="data?.loading?.value"
      v-tooltip.top="{
        content: data?.disabledMessage,
        disabled: !data?.disabled?.value && !!data?.disabledMessage,
        shown: tooltipShown,
        triggers: [],
      }"
      @click="handleClick"
    >
      <slot>
        {{ data?.text }}
      </slot>
    </VButton>
  </div>
</template>
