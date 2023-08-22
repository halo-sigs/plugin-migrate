<script setup lang="ts">
import { VAlert } from "@halo-dev/components";
import type { MigrateAttachment } from "@/types";
import { apiClient } from "@/utils/api-client";
import groupBy from "lodash.groupby";
import { computed, reactive, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import type { Policy } from "@halo-dev/api-client";

const props = defineProps<{
  activatedPluginNames: string[];
  attachments?: MigrateAttachment[];
}>();

const emit = defineEmits<{
  (event: "policyChange", value: Map<string, string>): void;
}>();

const attachmentTypes = ref<{ type: string; policyName: string }[]>([]);
const isSelectLocal = ref(false);
const policyOptions = ref<
  { label: string; value: string; templateName: string }[]
>([]);
const localPolicyOptions = ref<
  { label: string; value: string; templateName: string }[]
>([]);

useQuery({
  queryKey: ["attachment-policy"],
  queryFn: async () => {
    if (!props.attachments) {
      return;
    }

    const { data } =
      await apiClient.extension.storage.policy.liststorageHaloRunV1alpha1Policy();
    return data.items;
  },
  onSuccess(data: Policy[]) {
    policyOptions.value = data.map((policy) => {
      return {
        label: policy.spec.displayName,
        value: policy.metadata.name,
        templateName: policy.spec.templateName,
      };
    });
    attachmentTypes.value = Object.keys(groupBy(props.attachments, "type")).map(
      (type) => {
        return {
          type: type,
          policyName:
            type == "LOCAL"
              ? localPolicyOptions.value[0]?.value
              : policyOptions.value[0]?.value,
        };
      }
    );
    localPolicyOptions.value = policyOptions.value.filter(
      (item) => item.templateName === "local"
    );
    if (!props.activatedPluginNames.includes("PluginS3ObjectStorage")) {
      policyOptions.value = localPolicyOptions.value;
    }
  },
  enabled: computed(() => !!props.attachments),
});

const typeToPolicyMap = reactive(new Map<string, string>());

watch(
  () => attachmentTypes.value,
  (newAttachmentTypes) => {
    let isToast = false;
    for (let { type, policyName } of newAttachmentTypes) {
      if (type !== "LOCAL") {
        isToast =
          policyOptions.value.filter(
            (item) => item.value === policyName && item.templateName === "local"
          ).length > 0;
      }
      if (isToast) {
        break;
      }
    }
    isSelectLocal.value = isToast;
    newAttachmentTypes.forEach((item) => {
      typeToPolicyMap.set(item.type, item.policyName);
    });
    emit("policyChange", typeToPolicyMap);
  },
  {
    deep: true,
  }
);
</script>
<template>
  <div>
    <div class="migrate-mb-5">
      <VAlert
        v-if="!activatedPluginNames.includes('PluginS3ObjectStorage')"
        title="警告"
        type="warning"
        :closable="false"
      >
        <template #description>
          当前未安装/启用 S3
          插件，所有附件只能导入到本地，原云存储文件将无法远程管理。可前往
          <a href="https://halo.run/store/apps/app-Qxhpp" target="_blank">
            https://halo.run/store/apps/app-Qxhpp
          </a>
          进行安装。
        </template>
      </VAlert>
      <VAlert v-else-if="isSelectLocal" title="警告" type="warning">
        <template #description>
          部分云存储附件选择了本地存储策略，原云存储文件将不能进行远程管理
        </template>
      </VAlert>
    </div>

    <ul>
      <li
        v-for="(type, index) in attachmentTypes"
        :key="index"
        class="migrate-mb-4"
      >
        <FormKit
          v-model="type.policyName"
          type="select"
          :label="'将 ' + type.type + ' 迁移至哪个存储策略下？'"
          :options="type.type === 'LOCAL' ? localPolicyOptions : policyOptions"
        />
      </li>
    </ul>
  </div>
</template>
