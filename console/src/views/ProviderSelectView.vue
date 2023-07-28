<script setup lang="ts">
import { VPageHeader } from "@halo-dev/components";
import MdiCogTransferOutline from "~icons/mdi/cog-transfer-outline";
import type { MigrateData, Provider } from "@/types";
import { ref, computed, watch, onMounted } from "vue";
import { useFileDialog } from "@vueuse/core";
import MigratePreview from "@/components/MigratePreview.vue";
import {
  HaloMigrateDataParser,
  WordPressMigrateDataParser,
  HexoMigrateDataParser,
} from "@/modules/index";
import { apiClient } from "@/utils/api-client";
import type { User } from "@halo-dev/api-client/index";
import {
  useMigrateTask,
  type MigrateRequestTask,
} from "@/composables/use-migrate-task";
import * as fastq from "fastq";
import type { queueAsPromised } from "fastq";
import type { AxiosResponse } from "axios";

const { files, open, reset } = useFileDialog();

// 新增的迁移数据来源，需要在此处进行注册
const providerItems: Provider[] = [
  {
    name: "Halo",
    icon: "https://halo.run/logo",
    description: "Halo 1.5, 1.6 数据迁移",
    accept: ".json",
    parser: HaloMigrateDataParser,
  },
  {
    name: "WordPress",
    icon: "https://s.w.org/images/wmark.png",
    description: "WordPress WXR 数据迁移",
    accept: ".xml",
    parser: WordPressMigrateDataParser,
  },
  {
    name: "Hexo",
    icon: "https://hexo.io/icon/favicon-196x196.png",
    description: "Hexo 数据迁移",
    accept: ".xml",
    parser: HexoMigrateDataParser,
  },
];
const currentProvider = ref<Provider>();
/**
 * 根据不同的来源与文件类型，进行解析，最终获得符合规则的迁移数据
 * 需要注意的是，最好支持可扩展的解析器
 * 例如：扩展器默认将支持 json 与 xml，后续或许还会出现 zip 包、md 文件（多个）等。
 */
const currentMigrateData = ref<MigrateData>();

const openProviderView = computed(() => {
  return currentProvider.value && currentMigrateData.value;
});

const handleOpenFile = (provider: Provider) => {
  reset();
  open({
    accept: provider.accept,
    multiple: provider.multiple,
  });
  currentProvider.value = provider;
};

watch(
  () => files.value,
  () => {
    if (!files.value || !currentProvider.value) {
      return;
    }

    // 初始化解析器
    const parser = new currentProvider.value.parser(files.value);
    parser
      .parse()
      .then((data: MigrateData) => {
        currentMigrateData.value = data;
      })
      .catch((error: any) => {
        console.error(error);
      });
  }
);

const currentUser = ref<User>();
onMounted(async () => {
  const userDetailResponse = await apiClient.user.getCurrentUserDetail();
  currentUser.value = userDetailResponse.data.user;
});
const taskQueue: queueAsPromised<MigrateRequestTask<any>> = fastq.promise(
  asyncWorker,
  9
);

async function asyncWorker(
  arg: MigrateRequestTask<any>
): Promise<AxiosResponse<any, any>> {
  return arg.run();
}

const handleImport = (
  data: MigrateData,
  typeToPolicyMap: Map<string, string>
) => {
  const {
    createTagTasks,
    createCategoryTasks,
    createPostTasks,
    createSinglePageTasks,
    createCommentAndReplyTasks,
    createMenuTasks,
    createMomentTasks,
    createPhotoTasks,
    createLinkTasks,
    createAttachmentTasks,
  } = useMigrateTask(data, currentUser.value, typeToPolicyMap);
};
</script>
<template>
  <VPageHeader title="迁移">
    <template #icon>
      <MdiCogTransferOutline class="mr-2 self-center" />
    </template>
  </VPageHeader>

  <div class="migrate-m-6 migrate-flex migrate-flex-1 migrate-flex-col">
    <Steps :items="stepItems">
      <template #provider>
        <div>
          <h1 class="migrate-mx-auto migrate-text-center migrate-text-2xl">
            请选择迁移数据来源
          </h1>
          <ul
            class="grid migrate-m-4 migrate-mt-4 migrate-cursor-pointer migrate-grid-cols-3 migrate-gap-16"
          >
            <li
              v-for="provider in providerItems"
              :key="provider.name"
              @click="handleOpenFile(provider)"
              class=":hover:migrate-bg-gray-100 migrate-flex migrate-items-center migrate-justify-center migrate-rounded-lg migrate-border migrate-border-gray-200 migrate-border-opacity-50 migrate-bg-gray-300 migrate-p-2"
            >
              <img
                :src="provider.icon"
                :alt="provider.name"
                class="migrate-mr-6 migrate-h-10 migrate-w-10"
              />
              <div class="migrate-flex migrate-flex-col">
                <span>{{ provider.name }}</span>
                <span class="migrate-text-gray-500">
                  {{ provider.description }}
                </span>
              </div>
            </li>
          </ul>
        </div>
      </template>
      <template #migrate> 选择迁移文件页面 </template>
    </Steps>
    <!-- <Transition appear name="fade">
      <div>
        <MigratePreview
          :provider="currentProvider"
          :migrateData="currentMigrateData"
          @import="handleImport"
        ></MigratePreview>
      </div>
    </Transition> -->
  </div>
</template>
