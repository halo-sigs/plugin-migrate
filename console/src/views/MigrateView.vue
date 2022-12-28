<script lang="ts" setup>
import {
  VButton,
  VPageHeader,
  VSpace,
  VEmpty,
  VCard,
  VEntityField,
  VEntity,
  Toast,
  Dialog,
} from "@halo-dev/components";
import { useFileSystemAccess } from "@vueuse/core";
import MdiCogTransferOutline from "~icons/mdi/cog-transfer-outline";
import MdiFileCodeOutline from "~icons/mdi/file-code-outline";
import type {
  Post,
  Tag,
  Category,
  Content,
  PostTag,
  PostCategory,
  Comment,
  Sheet,
  Menu,
  Meta,
} from "../types/models";
import { ref } from "vue";
import { useMigrateFromHalo } from "@/composables/use-migrate-from-halo";
import { onBeforeRouteLeave } from "vue-router";

const res = useFileSystemAccess({
  dataType: "Text",
  types: [
    {
      description: "json",
      accept: {
        "text/yaml": [".json"],
      },
    },
  ],
  excludeAcceptAllOption: true,
});

const tags = ref<Tag[]>([] as Tag[]);
const categories = ref<Category[]>([] as Category[]);
const posts = ref<Post[]>([] as Post[]);
const contents = ref<Content[]>([] as Content[]);
const postTags = ref<PostTag[]>([] as PostTag[]);
const postCategories = ref<PostCategory[]>([] as PostCategory[]);
const postComments = ref<Comment[]>([] as Comment[]);
const postMetas = ref<Meta[]>([] as Meta[]);
const sheets = ref<Sheet[]>([] as Sheet[]);
const sheetComments = ref<Comment[]>([] as Comment[]);
const sheetMetas = ref<Meta[]>([] as Meta[]);
const menus = ref<Menu[]>([] as Menu[]);
const loading = ref(false);

const {
  createTagRequests,
  createCategoryRequests,
  createPostRequests,
  createSinglePageRequests,
  createPostCommentRequests,
  createSinglePageCommentRequests,
  createMenuRequests,
} = useMigrateFromHalo(
  tags,
  categories,
  posts,
  contents,
  postTags,
  postCategories,
  postComments,
  postMetas,
  sheets,
  sheetComments,
  sheetMetas,
  menus
);

async function handleOpenFile() {
  if (!res.isSupported) {
    Toast.warning("当前浏览器不支持选择文件，推荐使用 Google Chrome");
    return;
  }

  const { protocol, hostname } = location;

  // https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
  if (!["localhost", "127.0.0.1"].includes(hostname) && protocol === "http:") {
    Toast.warning("当前无法选择文件，站点必须使用 HTTPS 协议");
    return;
  }

  await res.open();

  if (!res.data.value) {
    Toast.warning("所选文件不符合要求");
    return;
  }

  const data = JSON.parse(res.data.value);

  const { version } = data;

  if (!(version.startsWith("1.5") || version.startsWith("1.6"))) {
    Toast.warning("暂不支持该版本的迁移，仅支持 Halo 1.5 / 1.6 版本");
  }

  tags.value = data.tags;
  categories.value = data.categories;
  posts.value = data.posts;
  contents.value = data.contents;
  postTags.value = data.post_tags;
  postCategories.value = data.post_categories;
  postComments.value = data.post_comments;
  postMetas.value = data.post_metas;
  sheets.value = data.sheets;
  sheetComments.value = data.sheet_comments;
  sheetMetas.value = data.sheet_metas;
  menus.value = data.menus;
}

const handleImport = async () => {
  window.onbeforeunload = function (e) {
    const message = "数据正在导入中，请勿关闭或刷新此页面。";
    e = e || window.event;
    if (e) {
      e.returnValue = message;
    }
    return message;
  };

  loading.value = true;

  const tagCreateRequests = createTagRequests();

  try {
    await Promise.all(tagCreateRequests);
  } catch (error) {
    console.error("Failed to create tags", error);
  }

  const categoryCreateRequests = createCategoryRequests();

  try {
    await Promise.all(categoryCreateRequests);
  } catch (error) {
    console.error("Failed to create categories", error);
  }

  const postCreateRequests = createPostRequests();

  try {
    await Promise.all(postCreateRequests);
  } catch (error) {
    console.error("Failed to create posts", error);
  }

  const singlePageCreateRequests = createSinglePageRequests();

  try {
    await Promise.all(singlePageCreateRequests);
  } catch (error) {
    console.error("Failed to create single pages", error);
  }

  const postCommentCreateRequests = createPostCommentRequests();

  try {
    await Promise.all(postCommentCreateRequests);
  } catch (error) {
    console.error("Failed to create post comments", error);
  }

  const singlePageCommentCreateRequests = createSinglePageCommentRequests();

  try {
    await Promise.all(singlePageCommentCreateRequests);
  } catch (error) {
    console.error("Failed to create single page comments", error);
  }

  const menuCreateRequests = createMenuRequests();

  try {
    await Promise.all(menuCreateRequests);
  } catch (error) {
    console.error("Failed to create menus", error);
  }

  loading.value = false;

  Dialog.success({
    title: "导入完成",
  });

  window.onbeforeunload = null;
};

onBeforeRouteLeave((to, from, next) => {
  if (loading.value) {
    Dialog.warning({
      title: "提示",
      description: "数据正在导入中，请勿关闭或刷新此页面。",
    });
    next(false);
  }
  next();
});
</script>
<template>
  <VPageHeader title="迁移">
    <template #icon>
      <MdiCogTransferOutline class="mr-2 self-center" />
    </template>

    <template #actions>
      <VSpace>
        <VButton @click="handleOpenFile" type="secondary">
          <template #icon>
            <MdiFileCodeOutline class="h-full w-full" />
          </template>
          选择文件
        </VButton>
      </VSpace>
    </template>
  </VPageHeader>
  <div class="p-4">
    <VEmpty
      v-if="!res.data.value"
      message="请选择 Halo 1.5 / 1.6 中导出的 JSON 数据文件"
      title="当前没有选择数据文件"
    >
      <template #actions>
        <VSpace>
          <VButton @click="handleOpenFile">选择文件</VButton>
        </VSpace>
      </template>
    </VEmpty>
    <div class="migrate-flex migrate-flex-1 migrate-flex-col" v-else>
      <div
        class="migrate-grid migrate-grid-cols-1 migrate-gap-3 sm:migrate-grid-cols-4"
      >
        <div class="migrate-h-96">
          <VCard
            :body-class="['h-full', '!p-0', 'overflow-y-auto']"
            class="h-full"
            :title="`标签（${tags.length}）`"
          >
            <ul
              class="box-border h-full w-full divide-y divide-gray-100"
              role="list"
            >
              <li v-for="(tag, index) in tags" :key="index">
                <VEntity>
                  <template #start>
                    <VEntityField
                      :title="tag.name"
                      :description="tag.slug"
                    ></VEntityField>
                  </template>
                </VEntity>
              </li>
            </ul>
          </VCard>
        </div>
        <div class="migrate-h-96">
          <VCard
            :body-class="['h-full', '!p-0', 'overflow-y-auto']"
            class="h-full"
            :title="`分类（${categories.length}）`"
          >
            <ul
              class="box-border h-full w-full divide-y divide-gray-100"
              role="list"
            >
              <li v-for="(category, index) in categories" :key="index">
                <VEntity>
                  <template #start>
                    <VEntityField
                      :title="category.name"
                      :description="category.slug"
                    ></VEntityField>
                  </template>
                </VEntity>
              </li>
            </ul>
          </VCard>
        </div>
        <div class="migrate-h-96">
          <VCard
            :body-class="['h-full', '!p-0', 'overflow-y-auto']"
            class="h-full"
            :title="`文章（${posts.length}）`"
          >
            <ul
              class="box-border h-full w-full divide-y divide-gray-100"
              role="list"
            >
              <li v-for="(post, index) in posts" :key="index">
                <VEntity>
                  <template #start>
                    <VEntityField
                      :title="post.title"
                      :description="post.slug"
                    ></VEntityField>
                  </template>
                </VEntity>
              </li>
            </ul>
          </VCard>
        </div>
        <div class="migrate-h-96">
          <VCard
            :body-class="['h-full', '!p-0', 'overflow-y-auto']"
            class="h-full"
            :title="`自定义页面（${sheets.length}）`"
          >
            <ul
              class="box-border h-full w-full divide-y divide-gray-100"
              role="list"
            >
              <li v-for="(sheet, index) in sheets" :key="index">
                <VEntity>
                  <template #start>
                    <VEntityField
                      :title="sheet.title"
                      :description="sheet.slug"
                    ></VEntityField>
                  </template>
                </VEntity>
              </li>
            </ul>
          </VCard>
        </div>

        <div class="migrate-h-96">
          <VCard
            :body-class="['h-full', '!p-0', 'overflow-y-auto']"
            class="h-full"
            :title="`文章评论（${postComments.length}）`"
          >
            <ul
              class="box-border h-full w-full divide-y divide-gray-100"
              role="list"
            >
              <li v-for="(postComment, index) in postComments" :key="index">
                <VEntity>
                  <template #start>
                    <VEntityField :title="postComment.author"></VEntityField>
                  </template>
                </VEntity>
              </li>
            </ul>
          </VCard>
        </div>

        <div class="migrate-h-96">
          <VCard
            :body-class="['h-full', '!p-0', 'overflow-y-auto']"
            class="h-full"
            :title="`自定义页面评论（${sheetComments.length}）`"
          >
            <ul
              class="box-border h-full w-full divide-y divide-gray-100"
              role="list"
            >
              <li v-for="(sheetComment, index) in sheetComments" :key="index">
                <VEntity>
                  <template #start>
                    <VEntityField :title="sheetComment.author"></VEntityField>
                  </template>
                </VEntity>
              </li>
            </ul>
          </VCard>
        </div>

        <div class="migrate-h-96">
          <VCard
            :body-class="['h-full', '!p-0', 'overflow-y-auto']"
            class="h-full"
            :title="`菜单（${menus.length}）`"
          >
            <ul
              class="box-border h-full w-full divide-y divide-gray-100"
              role="list"
            >
              <li v-for="(menu, index) in menus" :key="index">
                <VEntity>
                  <template #start>
                    <VEntityField
                      :title="menu.name"
                      :description="menu.team"
                    ></VEntityField>
                  </template>
                </VEntity>
              </li>
            </ul>
          </VCard>
        </div>
      </div>
      <div class="migrate-mt-8 migrate-self-center">
        <VButton :loading="loading" type="secondary" @click="handleImport">
          执行导入
        </VButton>
      </div>
    </div>
  </div>
</template>
