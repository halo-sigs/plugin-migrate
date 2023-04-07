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
  Journal,
  Photo,
} from "../types/models";
import type { PluginList } from "@halo-dev/api-client";
import { onBeforeMount, onMounted, ref, watch } from "vue";
import { useMigrateFromHalo } from "@/composables/use-migrate-from-halo";
import type { MigrateRequestTask } from "@/composables/use-migrate-from-halo";
import { onBeforeRouteLeave } from "vue-router";
import axios, { type AxiosResponse } from "axios";
import * as fastq from "fastq";
import type { queueAsPromised } from "fastq";

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
const journals = ref<Journal[]>([] as Journal[]);
const journalComments = ref<Comment[]>([] as Comment[]);
const photos = ref<Photo[]>([] as Photo[]);
const loading = ref(false);
const fetching = ref(false);

const {
  createTagTasks,
  createCategoryTasks,
  createPostTasks,
  createSinglePageTasks,
  createPostCommentTasks,
  createSinglePageCommentTasks,
  createMenuTasks,
  createMomentTasks,
  createMomentCommentTasks,
  createPhotoTasks,
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
  menus,
  journals,
  journalComments,
  photos
);

const handleOpenFileDialog = () => {
  reset();
  open();
};

const activatedPluginNames = ref<string[]>([]);

onMounted(async () => {
  const { data }: { data: PluginList } = await axios.get(
    "/apis/api.console.halo.run/v1alpha1/plugins",
    {
      params: {
        enabled: true,
        size: 0,
        page: 0,
      },
    }
  );
  activatedPluginNames.value =
    data.items
      .filter((plugin) => plugin.status?.phase === "STARTED")
      .map((plugin) => {
        return plugin.metadata.name;
      }) || [];
});

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
            Toast.warning("暂不支持该版本的迁移，仅支持 Halo 1.5 / 1.6 版本");
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
          journals.value = data.journals;
          journalComments.value = data.journal_comments;
          photos.value = data.photos;

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
    const message = "数据正在导入中，请勿关闭或刷新此页面。";
    e = e || window.event;
    if (e) {
      e.returnValue = message;
    }
    return message;
  };

  loading.value = true;

  const taskQueue: queueAsPromised<MigrateRequestTask<any>> = fastq.promise(
    asyncWorker,
    9
  );

  createTagTasks().forEach((item) => {
    taskQueue.push(item);
  });

  createCategoryTasks().forEach((item) => {
    taskQueue.push(item);
  });

  createPostTasks().forEach((item) => {
    taskQueue.push(item);
  });

  createSinglePageTasks().forEach((item) => {
    taskQueue.push(item);
  });

  createPostCommentTasks().forEach((item) => {
    taskQueue.push(item);
  });

  createSinglePageCommentTasks().forEach((item) => {
    taskQueue.push(item);
  });

  createMenuTasks().forEach((item) => {
    taskQueue.push(item);
  });

  if (activatedPluginNames.value.includes("PluginMoments")) {
    createMomentTasks().forEach((item) => {
      taskQueue.push(item);
    });

    createMomentCommentTasks().forEach((item) => {
      taskQueue.push(item);
    });
  }

  if (activatedPluginNames.value.includes("PluginPhotos")) {
    createPhotoTasks().forEach((item) => {
      taskQueue.push(item);
    });
  }

  async function asyncWorker(
    arg: MigrateRequestTask<any>
  ): Promise<AxiosResponse<any, any>> {
    return arg.run();
  }

  taskQueue.drained().then(() => {
    loading.value = false;

    Dialog.success({
      title: "导入完成",
    });

    window.onbeforeunload = null;
  });
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
        <VButton @click="handleOpenFileDialog()" type="secondary">
          <template #icon>
            <MdiFileCodeOutline class="h-full w-full" />
          </template>
          选择文件
        </VButton>
      </VSpace>
    </template>
  </VPageHeader>
  <VLoading v-if="fetching" />
  <div v-else class="p-4">
    <VEmpty
      v-if="!files?.length"
      message="请选择 Halo 1.5 / 1.6 中导出的 JSON 数据文件"
      title="当前没有选择数据文件"
    >
      <template #actions>
        <VSpace>
          <VButton @click="handleOpenFileDialog()">选择文件</VButton>
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

          <template v-if="activatedPluginNames.includes('PluginMoments')">
            <div class="migrate-h-96">
              <VCard
                :body-class="['h-full', '!p-0', 'overflow-y-auto']"
                class="h-full"
                :title="`日志（${journals.length}）`"
              >
                <ul
                  class="box-border h-full w-full divide-y divide-gray-100"
                  role="list"
                >
                  <li v-for="(journal, index) in journals" :key="index">
                    <VEntity>
                      <template #start>
                        <VEntityField
                          :title="journal.sourceContent"
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
                :title="`日志评论（${journalComments.length}）`"
              >
                <ul
                  class="box-border h-full w-full divide-y divide-gray-100"
                  role="list"
                >
                  <li
                    v-for="(journalComment, index) in journalComments"
                    :key="index"
                  >
                    <VEntity>
                      <template #start>
                        <VEntityField
                          :title="journalComment.author"
                        ></VEntityField>
                      </template>
                    </VEntity>
                  </li>
                </ul>
              </VCard>
            </div>
          </template>

          <template v-if="activatedPluginNames.includes('PluginPhotos')">
            <div class="migrate-h-96">
              <VCard
                :body-class="['h-full', '!p-0', 'overflow-y-auto']"
                class="h-full"
                :title="`图库（${photos.length}）`"
              >
                <ul
                  class="box-border h-full w-full divide-y divide-gray-100"
                  role="list"
                >
                  <li v-for="(photo, index) in photos" :key="index">
                    <VEntity>
                      <template #start>
                        <VEntityField :title="photo.name"></VEntityField>
                      </template>
                    </VEntity>
                  </li>
                </ul>
              </VCard>
            </div>
          </template>
        </div>
        <div class="migrate-mt-8 migrate-self-center">
          <VButton :loading="loading" type="secondary" @click="handleImport">
            执行导入
          </VButton>
        </div>
      </div>
    </Transition>
  </div>
</template>
