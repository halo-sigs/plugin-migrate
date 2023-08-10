<script setup lang="ts">
import { VCard, VSpace } from "@halo-dev/components";
import { ref, type ComputedRef, computed } from "vue";
import type { StepButtonItem } from "./StepButton.vue";
import StepButton from "./StepButton.vue";

export interface Step {
  key: string;
  name: string;
  description?: string;
  next?: StepButtonItem;
  prev?: StepButtonItem;
  visible?: ComputedRef;
}

const props = defineProps<{
  items: Step[];
}>();

const activeIndex = ref<number>(0);
const visibleItems = computed(() => {
  return (
    props.items?.filter((item) => {
      if (item.visible) {
        return item.visible.value;
      }
      return true;
    }) || []
  );
});

const visibleItemsLength = computed(() => {
  return visibleItems.value?.length || 0;
});

const itemClass = (index: number) => {
  if (index > activeIndex.value) {
    return ["migrate-text-gray-400"];
  } else {
    return ["migrate-text-black"];
  }
};

const borderClass = (index: number) => {
  if (index === activeIndex.value) {
    return ["migrate-bg-blue-500", "migrate-text-white"];
  } else if (index < activeIndex.value) {
    return ["migrate-bg-[#e6f4ff]", "migrate-text-blue-600"];
  } else {
    return ["migrate-bg-black/10", "migrate-text-black/80"];
  }
};

const handlePrev = () => {
  if (activeIndex.value != 0) {
    activeIndex.value--;
  }
};

const handleNext = () => {
  if (activeIndex.value != visibleItemsLength.value - 1) {
    activeIndex.value++;
  }
};
</script>
<template>
  <VCard v-if="visibleItemsLength > 0">
    <template #header>
      <ol
        class="migrate-flex migrate-w-full migrate-items-center migrate-space-x-2 migrate-p-3 migrate-text-center migrate-text-sm migrate-font-medium sm:migrate-space-x-4 sm:migrate-p-4"
      >
        <li
          v-for="(item, index) in visibleItems"
          :key="index"
          class="migrate-flex migrate-items-center"
          :class="itemClass(index)"
        >
          <span
            class="migrate-mr-2 migrate-flex migrate-h-7 migrate-w-7 migrate-shrink-0 migrate-items-center migrate-justify-center migrate-rounded-full migrate-text-xs"
            :class="borderClass(index)"
          >
            <template v-if="index < activeIndex">
              <svg
                viewBox="64 64 896 896"
                focusable="false"
                data-icon="check"
                width="1em"
                height="1em"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M912 190h-69.9c-9.8 0-19.1 4.5-25.1 12.2L404.7 724.5 207 474a32 32 0 00-25.1-12.2H112c-6.7 0-10.4 7.7-6.3 12.9l273.9 347c12.8 16.2 37.4 16.2 50.3 0l488.4-618.9c4.1-5.1.4-12.8-6.3-12.8z"
                ></path>
              </svg>
            </template>
            <template v-else>{{ index + 1 }}</template>
          </span>

          <span class="sm:migrate-ml-2 sm:migrate-inline-flex">
            {{ item.name }}
          </span>
          <svg
            v-if="index != visibleItemsLength - 1"
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
    </template>
    <main class="migrate-flex migrate-min-h-[50vh] migrate-items-stretch">
      <div
        class="migrate-relative migrate-flex-1"
        v-for="(item, index) in visibleItems"
        :key="index"
        v-show="index === activeIndex"
      >
        <slot :name="item.key" :key="item.key"></slot>
      </div>
    </main>
    <template #footer>
      <VSpace>
        <StepButton
          :data="visibleItems[activeIndex].prev"
          @click="handlePrev"
          v-show="activeIndex != 0"
        >
          {{ visibleItems[activeIndex].prev?.text || "上一步" }}
        </StepButton>
        <StepButton :data="visibleItems[activeIndex].next" @click="handleNext">
          {{ visibleItems[activeIndex].next?.text || "下一步" }}
        </StepButton>
      </VSpace>
    </template>
  </VCard>
</template>
