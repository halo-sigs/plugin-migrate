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
  VLoading,
} from "@halo-dev/components";
import { useFileDialog } from "@vueuse/core";
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
import { ref, watch } from "vue";
import { useMigrateFromHalo } from "@/composables/use-migrate-from-halo";
import { onBeforeRouteLeave } from "vue-router";
import axios from "axios";

const { files, open, reset } = useFileDialog({
  multiple: false,
  accept: "application/json",
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
const fetching = ref(false);

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

const handleOpenFileDialog = () => {
  reset();
  open();
};

watch(
  () => files.value,
  () => {
    if (files.value?.length) {
      const file = files.value[0];

      fetching.value = true;

      const formData = new FormData();
      formData.append("file", file);

      axios
        .post(
          "/apis/api.plugin.halo.run/v1alpha1/plugins/PluginMigrate/migrations/import",
          formData
        )
        .then((response) => {
          const data = response.data;

          const { version } = data;

          if (!(version.startsWith("1.5") || version.startsWith("1.6"))) {
            Toast.warning("?????????????????????????????????????????? Halo 1.5 / 1.6 ??????");
            reset();
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

          fetching.value = false;
        })
        .catch((e) => {
          console.error("Failed to fetch data", e);
          fetching.value = false;
        });
    }
  }
);

const handleImport = async () => {
  window.onbeforeunload = function (e) {
    const message = "?????????????????????????????????????????????????????????";
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
    title: "????????????",
  });

  window.onbeforeunload = null;
};

onBeforeRouteLeave((to, from, next) => {
  if (loading.value) {
    Dialog.warning({
      title: "??????",
      description: "?????????????????????????????????????????????????????????",
    });
    next(false);
  }
  next();
});
</script>
<template>
  <VPageHeader title="??????">
    <template #icon>
      <MdiCogTransferOutline class="mr-2 self-center" />
    </template>

    <template #actions>
      <VSpace>
        <VButton @click="handleOpenFileDialog()" type="secondary">
          <template #icon>
            <MdiFileCodeOutline class="h-full w-full" />
          </template>
          ????????????
        </VButton>
      </VSpace>
    </template>
  </VPageHeader>
  <VLoading v-if="fetching" />
  <div v-else class="p-4">
    <VEmpty
      v-if="!files?.length"
      message="????????? Halo 1.5 / 1.6 ???????????? JSON ????????????"
      title="??????????????????????????????"
    >
      <template #actions>
        <VSpace>
          <VButton @click="handleOpenFileDialog()">????????????</VButton>
        </VSpace>
      </template>
    </VEmpty>
    <Transition v-else appear name="fade">
      <div class="migrate-flex migrate-flex-1 migrate-flex-col">
        <div
          class="migrate-grid migrate-grid-cols-1 migrate-gap-3 sm:migrate-grid-cols-4"
        >
          <div class="migrate-h-96">
            <VCard
              :body-class="['h-full', '!p-0', 'overflow-y-auto']"
              class="h-full"
              :title="`?????????${tags.length}???`"
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
              :title="`?????????${categories.length}???`"
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
              :title="`?????????${posts.length}???`"
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
              :title="`??????????????????${sheets.length}???`"
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
              :title="`???????????????${postComments.length}???`"
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
              :title="`????????????????????????${sheetComments.length}???`"
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
              :title="`?????????${menus.length}???`"
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
            ????????????
          </VButton>
        </div>
      </div>
    </Transition>
  </div>
</template>
