<script setup lang="ts">
import { VCard, VEntityField, VEntity } from "@halo-dev/components";
import type { MigrateData, Provider } from "../types";
import { ref } from "vue";

const props = defineProps<{
  data: MigrateData;
  provider?: Provider;
}>();

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
  <div class="migrate-flex migrate-flex-1 migrate-flex-col">
    <div
      class="migrate-grid migrate-grid-cols-1 migrate-gap-3 sm:migrate-grid-cols-4"
    >
      <div v-if="data.tags" class="migrate-h-96">
        <VCard
          :body-class="['h-full', '!p-0', 'overflow-y-auto']"
          class="h-full"
          :title="`标签（${data.tags.length}）`"
        >
          <ul
            class="box-border h-full w-full divide-y divide-gray-100"
            role="list"
          >
            <li v-for="(tag, index) in data.tags" :key="index">
              <VEntity>
                <template #start>
                  <VEntityField :title="tag.spec.displayName"></VEntityField>
                </template>
              </VEntity>
            </li>
          </ul>
        </VCard>
      </div>
      <div v-if="data.categories" class="migrate-h-96">
        <VCard
          :body-class="['h-full', '!p-0', 'overflow-y-auto']"
          class="h-full"
          :title="`分类（${data.categories.length}）`"
        >
          <ul
            class="box-border h-full w-full divide-y divide-gray-100"
            role="list"
          >
            <li v-for="(category, index) in data.categories" :key="index">
              <VEntity>
                <template #start>
                  <VEntityField
                    :title="category.spec.displayName"
                    :description="category.spec.description"
                  ></VEntityField>
                </template>
              </VEntity>
            </li>
          </ul>
        </VCard>
      </div>
      <div v-if="data.posts" class="migrate-h-96">
        <VCard
          :body-class="['h-full', '!p-0', 'overflow-y-auto']"
          class="h-full"
          :title="`文章（${data.posts.length}）`"
        >
          <ul
            class="box-border h-full w-full divide-y divide-gray-100"
            role="list"
          >
            <li v-for="(post, index) in data.posts" :key="index">
              <VEntity>
                <template #start>
                  <VEntityField
                    :title="post.postRequest.post.spec.title"
                    :description="post.postRequest.post.spec.excerpt.raw"
                  ></VEntityField>
                </template>
              </VEntity>
            </li>
          </ul>
        </VCard>
      </div>
      <div v-if="data.pages" class="migrate-h-96">
        <VCard
          :body-class="['h-full', '!p-0', 'overflow-y-auto']"
          class="h-full"
          :title="`自定义页面（${data.pages.length}）`"
        >
          <ul
            class="box-border h-full w-full divide-y divide-gray-100"
            role="list"
          >
            <li v-for="(page, index) in data.pages" :key="index">
              <VEntity>
                <template #start>
                  <VEntityField
                    :title="page.singlePageRequest.page.spec.title"
                    :description="page.singlePageRequest.page.spec.excerpt.raw"
                  ></VEntityField>
                </template>
              </VEntity>
            </li>
          </ul>
        </VCard>
      </div>
      <div v-if="data.comments" class="migrate-h-96">
        <VCard
          :body-class="['h-full', '!p-0', 'overflow-y-auto']"
          class="h-full"
          :title="`评论（${data.comments.length}）`"
        >
          <ul
            class="box-border h-full w-full divide-y divide-gray-100"
            role="list"
          >
            <li v-for="(comment, index) in data.comments" :key="index">
              <VEntity>
                <template #start>
                  <VEntityField :title="comment.spec.content"></VEntityField>
                </template>
              </VEntity>
            </li>
          </ul>
        </VCard>
      </div>
      <div v-if="data.menuItems" class="migrate-h-96">
        <VCard
          :body-class="['h-full', '!p-0', 'overflow-y-auto']"
          class="h-full"
          :title="`菜单（${data.menuItems.length}）`"
        >
          <ul
            class="box-border h-full w-full divide-y divide-gray-100"
            role="list"
          >
            <li v-for="(menu, index) in data.menuItems" :key="index">
              <VEntity>
                <template #start>
                  <VEntityField
                    :title="menu.menu.spec.displayName"
                    :description="menu.menu.spec.href"
                  ></VEntityField>
                </template>
              </VEntity>
            </li>
          </ul>
        </VCard>
      </div>
      <div v-if="data.moments" class="migrate-h-96">
        <!-- TODO: 没有插件时进行提示-->
        <VCard
          :body-class="['h-full', '!p-0', 'overflow-y-auto']"
          class="h-full"
          :title="`日志（${data.moments.length}）`"
        >
          <ul
            class="box-border h-full w-full divide-y divide-gray-100"
            role="list"
          >
            <li v-for="(moment, index) in data.moments" :key="index">
              <VEntity>
                <template #start>
                  <VEntityField
                    :title="moment.spec.content.html"
                  ></VEntityField>
                </template>
              </VEntity>
            </li>
          </ul>
        </VCard>
      </div>
      <div v-if="data.photos" class="migrate-h-96">
        <VCard
          :body-class="['h-full', '!p-0', 'overflow-y-auto']"
          class="h-full"
          :title="`图库（${data.photos.length}）`"
        >
          <ul
            class="box-border h-full w-full divide-y divide-gray-100"
            role="list"
          >
            <li v-for="(photo, index) in data.photos" :key="index">
              <VEntity>
                <template #start>
                  <VEntityField :title="photo.spec.displayName"></VEntityField>
                </template>
              </VEntity>
            </li>
          </ul>
        </VCard>
      </div>
      <div v-if="data.links" class="migrate-h-96">
        <VCard
          :body-class="['h-full', '!p-0', 'overflow-y-auto']"
          class="h-full"
          :title="`友情链接（${data.links.length}）`"
        >
          <ul
            class="box-border h-full w-full divide-y divide-gray-100"
            role="list"
          >
            <li v-for="(link, index) in data.links" :key="index">
              <VEntity>
                <template #start>
                  <VEntityField :title="link.spec.displayName"></VEntityField>
                </template>
              </VEntity>
            </li>
          </ul>
        </VCard>
      </div>
      <div v-if="data.attachments" class="migrate-h-96">
        <VCard
          :body-class="['h-full', '!p-0', 'overflow-y-auto']"
          class="h-full"
          :title="`附件（${data.attachments.length}）`"
        >
          <ul
            class="box-border h-full w-full divide-y divide-gray-100"
            role="list"
          >
            <li v-for="(attachment, index) in data.attachments" :key="index">
              <VEntity>
                <template #start>
                  <VEntityField
                    :title="attachment.name"
                    :description="attachment.path"
                  ></VEntityField>
                </template>
              </VEntity>
            </li>
          </ul>
        </VCard>
      </div>
    </div>
  </div>
</template>
