<script setup lang="ts">
import type { MigrateData, Provider } from "../types";
import MigratePreviewItem from "@/components/MigratePreviewItem.vue";
import { computed, ref } from "vue";

interface Item {
  name: string;
  dataList?: any[];
}

const props = defineProps<{
  data: MigrateData;
  provider?: Provider;
}>();

const items = computed<Item[]>(() => {
  return [
    {
      name: "标签",
      dataList: props.data.tags,
    },
    {
      name: "分类",
      dataList: props.data.categories,
    },
    {
      name: "文章",
      dataList: props.data.posts,
    },
    {
      name: "页面",
      dataList: props.data.pages,
    },
    {
      name: "附件",
      dataList: props.data.attachments,
    },
    {
      name: "评论及回复",
      dataList: props.data.comments,
    },
    {
      name: "菜单",
      dataList: props.data.menuItems,
    },
    {
      name: "日志",
      dataList: props.data.moments,
    },
    {
      name: "图库",
      dataList: props.data.photos,
    },
    {
      name: "友情链接",
      dataList: props.data.links,
    },
  ] as Item[];
});

// TODO: 可以在此处对要导入的数据进行过滤
const selectData = ref(props.data);

const emit = defineEmits<{
  (event: "import", value: MigrateData): void;
}>();

const handleImport = () => {
  // 触发导入事件
  emit("import", selectData.value);
};
</script>
<template>
  <div>
    <ul class="migrate-divide-y migrate-divide-gray-100">
      <MigratePreviewItem
        v-for="item in items"
        :key="item.name"
        :name="item.name"
        :dataList="item.dataList"
      ></MigratePreviewItem>
    </ul>
  </div>
</template>
