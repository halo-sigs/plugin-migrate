<script setup lang="ts">
import Steps, { type Step } from "@/components/Steps.vue";
import type { MigrateData, Provider } from "@/types";
import MigrateProvider from "@/components/MigrateProvider.vue";
import { computed, onMounted, ref } from "vue";
import MigratePreview from "@/components/MigratePreview.vue";
import type { PluginList } from "@halo-dev/api-client/index";
import axios from "axios";
import AttachmentPolicy from "@/components/AttachmentPolicy.vue";
import HaloMigrateDataParser from "@/modules/halo/HaloMigrateDataParser.vue";
import WordPressMigrateDataParser from "@/modules/wordpress/WordPressMigrateDataParser.vue";

// 新增的迁移数据来源，需要在此处进行注册
const providerItems: Provider[] = [
  {
    name: "Halo",
    icon: "https://halo.run/logo",
    description: "Halo 1.5, 1.6 数据迁移",
    importComponent: HaloMigrateDataParser,
  },
  {
    name: "WordPress",
    icon: "https://s.w.org/images/wmark.png",
    description: "WordPress WXR 数据迁移",
    importComponent: WordPressMigrateDataParser,
  },
];

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

const handleImport = () => {
  console.log("import");
};

const policyMap = ref<Map<string, string>>(new Map());
const handlePolicyChange = (typeToPolicyMap: Map<string, string>) => {
  policyMap.value = typeToPolicyMap;
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
    name: "待迁移文件",
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
  <div class="migrate-m-6 migrate-flex migrate-flex-1 migrate-flex-col">
    <Steps :items="stepItems">
      <template #provider>
        <div>
          <h1 class="migrate-mx-auto migrate-text-center migrate-text-2xl">
            请选择迁移数据来源
          </h1>
          <MigrateProvider
            :providers="providerItems"
            @selectProvider="handleSelectProvider"
          ></MigrateProvider>
        </div>
      </template>
      <template #importData>
        <div>
          <component
            :is="activeProvider?.importComponent"
            v-model:data="migrateData"
          />
        </div>
      </template>
      <template #migrate>
        <MigratePreview
          v-if="migrateData"
          :provider="activeProvider"
          :data="migrateData"
          @import="handleImport"
        ></MigratePreview>
      </template>
      <template #attachmentPolicy>
        <AttachmentPolicy
          v-if="migrateData"
          :activatedPluginNames="activatedPluginNames"
          :attachments="migrateData.attachments"
          @policyChange="handlePolicyChange"
        >
        </AttachmentPolicy>
      </template>
    </Steps>
  </div>
</template>
