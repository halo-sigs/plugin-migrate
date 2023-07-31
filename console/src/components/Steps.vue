<script setup lang="ts">
import { VButton, VSpace } from "@halo-dev/components";
import { ref, type ComputedRef } from "vue";

export interface Step {
  key: string;
  name: string;
  description?: string;
  nextHandler?: () => void;
  nextDisabled?: ComputedRef;
}

const props = withDefaults(
  defineProps<{
    items: Step[];
    submitText?: string;
  }>(),
  {
    submitText: "完成",
  }
);

const activeIndex = ref<number>(0);

const itemClass = (index: number) => {
  if (index === activeIndex.value) {
    return ["migrate-text-blue-700", "dark:migrate-text-blue-400"];
  } else if (index < activeIndex.value) {
    return ["migrate-text-green-700", "dark:migrate-text-green-400"];
  } else {
    return ["migrate-text-gray-900", "dark:migrate-text-gray-400"];
  }
};

const activeClass = (index: number) => {
  if (index === activeIndex.value) {
    return ["migrate-border-blue-600", "dark:migrate-border-blue-500"];
  }
};

const handleNext = (item: Step) => {
  if (item.nextHandler) {
    item.nextHandler();
  } else if (activeIndex.value != props.items.length - 1) {
    activeIndex.value++;
  }
};
</script>
<template>
  <div
    class="migrate-relative migrate-rounded-lg migrate-border migrate-border-gray-200 migrate-bg-white"
  >
    <header>
      <ol
        class="migrate-flex migrate-w-full migrate-items-center migrate-space-x-2 migrate-p-3 migrate-text-center migrate-text-sm migrate-font-medium migrate-text-gray-500 migrate-shadow-sm dark:migrate-text-gray-400 sm:migrate-space-x-4 sm:migrate-p-4 sm:migrate-text-base"
      >
        <li
          v-for="(item, index) in items"
          :key="index"
          class="migrate-flex migrate-items-center"
          :class="itemClass(index)"
        >
          <span
            class="migrate-mr-2 migrate-flex migrate-h-5 migrate-w-5 migrate-shrink-0 migrate-items-center migrate-justify-center migrate-rounded-full migrate-border migrate-text-xs"
            :class="activeClass(index)"
          >
            {{ index + 1 }}
          </span>

          <span class="sm:migrate-ml-2 sm:migrate-inline-flex">
            {{ item.name }}
          </span>
          <svg
            v-if="index != items.length - 1"
            class="migrate-ml-2 migrate-h-3 migrate-w-3 sm:migrate-ml-4"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 12 10"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m7 9 4-4-4-4M1 9l4-4-4-4"
            />
          </svg>
        </li>
      </ol>
    </header>

    <main class="migrate-flex migrate-min-h-[50vh] migrate-items-stretch">
      <div
        class="migrate-flex-1"
        v-for="(item, index) in items"
        :key="index"
        v-show="index === activeIndex"
      >
        <slot :name="item.key" :key="item.key"></slot>
      </div>
    </main>

    <footer class="migrate-mb-2 migrate-ml-2">
      <VSpace>
        <VButton @click="activeIndex--" v-show="activeIndex != 0">
          上一步
        </VButton>
        <VButton
          :disabled="items[activeIndex].nextDisabled?.value"
          @click="handleNext(items[activeIndex])"
          v-show="activeIndex != items.length - 1"
        >
          下一步
        </VButton>
        <VButton
          v-show="activeIndex == items.length - 1"
          @click="handleNext(items[activeIndex])"
        >
          {{ submitText }}
        </VButton>
      </VSpace>
    </footer>
  </div>
</template>
