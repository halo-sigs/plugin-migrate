<script setup lang="ts">
import { Dialog, VPageHeader } from "@halo-dev/components";
import Steps, { type Step } from "@/components/Steps.vue";
import type { MigrateData, Provider } from "@/types";
import MigrateProvider from "@/components/MigrateProvider.vue";
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import MigratePreview from "@/components/MigratePreview.vue";
import type { PluginList, User } from "@halo-dev/api-client/index";
import axios, { type AxiosResponse } from "axios";
import AttachmentPolicy from "@/components/AttachmentPolicy.vue";
import {
  useMigrateTask,
  type MigrateRequestTask,
} from "@/composables/use-migrate-task";
import * as fastq from "fastq";
import { apiClient } from "@/utils/api-client";

// 新增的迁移数据来源，需要在此处进行注册
const providerItems: Provider[] = [
  {
    name: "Halo",
    icon: "https://halo.run/logo",
    description: "Halo 1.5, 1.6 数据迁移",
    importComponent: defineAsyncComponent(
      () => import("@/modules/halo/HaloMigrateDataParser.vue")
    ),
    options: {
      attachmentFolderPath: "migrate-from-1.x",
    },
  },
  {
    name: "WordPress",
    icon: "https://s.w.org/images/wmark.png",
    description: "WordPress WXR 数据迁移",
    importComponent: defineAsyncComponent(
      () => import("@/modules/wordpress/WordPressMigrateDataParser.vue")
    ),
    options: {
      attachmentFolderPath: "migrate-from-wp",
    },
  },
  {
    name: "RSS",
    icon: "https://raw.githubusercontent.com/github/explore/44746728c4b7718fb01d3b32ed2ce9c4e0fdd887/topics/rss/rss.png",
    description: "基于 RSS 订阅文件的数据迁移",
    importComponent: defineAsyncComponent(
      () => import("@/modules/rss/RssMigrateDataParser.vue")
    ),
  },
];

const activatedPluginNames = ref<string[]>([]);
const currentUser = ref<User>();
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

  const userDetailResponse = await apiClient.user.getCurrentUserDetail();
  currentUser.value = userDetailResponse.data.user;
});

const migrateData = ref<MigrateData>();
const activeProvider = ref<Provider>();
const handleSelectProvider = (provider: Provider) => {
  activeProvider.value = provider;
};
const disabledProviderView = computed(() => {
  return !activeProvider.value;
});
const disabledImportDataView = computed(() => {
  return !migrateData.value || !activeProvider.value;
});
const policyMap = ref<Map<string, string>>(new Map());
const handlePolicyChange = (typeToPolicyMap: Map<string, string>) => {
  policyMap.value = typeToPolicyMap;
};

const taskQueue: fastq.queueAsPromised<MigrateRequestTask<any>> = fastq.promise(
  asyncWorker,
  9
);

async function asyncWorker(
  arg: MigrateRequestTask<any>
): Promise<AxiosResponse<any, any>> {
  return arg.run();
}

const handleImport = () => {
  window.onbeforeunload = function (e) {
    const message = "数据正在导入中，请勿关闭或刷新此页面。";
    e = e || window.event;
    if (e) {
      e.returnValue = message;
    }
    return message;
  };
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
  } = useMigrateTask(migrateData.value as MigrateData);
  // 调用 tasks
  const tasks = [
    ...createTagTasks(),
    ...createCategoryTasks(),
    ...createPostTasks(),
    ...createSinglePageTasks(),
    ...createCommentAndReplyTasks(),
    ...createMenuTasks(),
    ...createMomentTasks(),
    ...createPhotoTasks(),
    ...createLinkTasks(),
    ...createAttachmentTasks(
      activeProvider.value?.options?.attachmentFolderPath as string,
      currentUser.value as User,
      policyMap.value
    ),
  ];
  tasks.forEach((task) => {
    taskQueue.push(task);
  });
  taskQueue.drained().then(() => {
    Dialog.success({
      title: "导入完成",
    });
    window.onbeforeunload = null;
  });
};

const defaultStepItems: Step[] = [
  {
    key: "provider",
    name: "选择渠道",
    nextDisabled: disabledProviderView,
  },
  {
    key: "importData",
    name: "导入数据",
    nextDisabled: disabledImportDataView,
  },
  {
    key: "migrate",
    name: "待迁移数据",
    nextHandler: handleImport,
  },
];

const attachmentPolicyStepItem: Step = {
  key: "attachmentPolicy",
  name: "设置附件存储策略",
  nextDisabled: computed(() => {
    return policyMap.value.size === 0;
  }),
};

const stepItems = computed(() => {
  const items = [...defaultStepItems];
  if (migrateData.value == undefined) {
    return items;
  }
  if (migrateData.value.attachments != undefined) {
    items.splice(2, 0, attachmentPolicyStepItem);
  }
  return items;
});
</script>
<template>
  <VPageHeader title="迁移">
    <template #icon>
      <MdiCogTransferOutline class="mr-2 self-center" />
    </template>
  </VPageHeader>
  <div class="migrate-m-6 migrate-flex migrate-flex-1 migrate-flex-col">
    <Steps :items="stepItems" submitText="执行导入">
      <template #provider>
        <div>
          <MigrateProvider
            :providers="providerItems"
            @selectProvider="handleSelectProvider"
          ></MigrateProvider>
        </div>
      </template>
      <template #importData>
        <div
          class="migrate-mx-20 migrate-flex migrate-h-full migrate-flex-col migrate-justify-center"
        >
          <component
            :is="activeProvider?.importComponent"
            v-model:data="migrateData"
          />
        </div>
      </template>
      <template #attachmentPolicy>
        <div class="migrate-mx-auto migrate-mt-4 migrate-w-1/2">
          <AttachmentPolicy
            v-if="migrateData"
            :activatedPluginNames="activatedPluginNames"
            :attachments="migrateData.attachments"
            @policyChange="handlePolicyChange"
          >
          </AttachmentPolicy>
        </div>
      </template>
      <template #migrate>
        <div
          class="migrate-mx-auto migrate-flex migrate-h-full migrate-w-1/2 migrate-flex-col migrate-justify-center"
        >
          <MigratePreview
            v-if="migrateData"
            :provider="activeProvider"
            :data="migrateData"
          ></MigratePreview>
        </div>
      </template>
    </Steps>
  </div>
</template>
