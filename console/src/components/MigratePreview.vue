<script setup lang="ts">
import {
  VButton,
  VSpace,
  VCard,
  VEntityField,
  VEntity,
  Toast,
  VModal,
  VAlert,
} from "@halo-dev/components";
import type { PluginList } from "@halo-dev/api-client";
import axios from "axios";
import type { MigrateData, Provider } from "../types";
import { onMounted, reactive, ref, watch } from "vue";
import groupBy from "lodash.groupby";
import { apiClient } from "../utils/api-client";

const props = defineProps<{
  data: MigrateData;
  provider?: Provider;
}>();

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

// TODO: 可以在此处对要导入的数据进行过滤
const selectData = ref(props.data);

const emit = defineEmits<{
  (
    event: "import",
    value: MigrateData,
    typeToPolicyMap: Map<string, string>
  ): void;
}>();

const handleImport = () => {
  // 触发导入事件
  emit("import", selectData.value, typeToPolicyMap);
};

const attachmentStorageVisible = ref(false);
const isSubmitReady = ref(true);
const attachmentTypes = ref<{ type: string; policyName: string }[]>([]);
const isSelectLocal = ref(false);
const policyOptions = ref<
  { label: string; value: string; templateName: string }[]
>([]);
const localPolicyOptions = ref<
  { label: string; value: string; templateName: string }[]
>([]);

const attachmentPolicy = async () => {
  isSubmitReady.value = false;
  const { data } =
    await apiClient.extension.storage.policy.liststorageHaloRunV1alpha1Policy();
  policyOptions.value = data.items.map((policy) => {
    return {
      label: policy.spec.displayName,
      value: policy.metadata.name,
      templateName: policy.spec.templateName,
    };
  });
  if (attachmentTypes.value.length === 0) {
    attachmentTypes.value = Object.keys(
      groupBy(props.data.attachments, "type")
    ).map((type) => {
      return {
        type: type,
        policyName:
          type == "LOCAL"
            ? localPolicyOptions.value[0]?.value
            : policyOptions.value[0]?.value,
      };
    });
  }
  localPolicyOptions.value = policyOptions.value.filter(
    (item) => item.templateName === "local"
  );
  if (!activatedPluginNames.value.includes("PluginS3ObjectStorage")) {
    policyOptions.value = localPolicyOptions.value;
  }
  attachmentStorageVisible.value = true;
};

const typeToPolicyMap = reactive(new Map<string, string>());
const submitAttachment = () => {
  attachmentTypes.value.forEach((item) => {
    typeToPolicyMap.set(item.type, item.policyName);
  });
  if (Array.from(typeToPolicyMap.values()).includes("")) {
    Toast.warning("请选择存储策略或前往附件新建本地策略。");
    return;
  }
  attachmentStorageVisible.value = false;
  isSubmitReady.value = true;
};

watch(
  () => props.data,
  (data) => {
    debugger;
    if (data.attachments) {
      attachmentPolicy();
    }
  },
  {
    deep: true,
    immediate: true,
  }
);
watch(
  () => attachmentTypes.value,
  () => {
    let isToast = false;
    for (let { type, policyName } of attachmentTypes.value) {
      if (type !== "LOCAL") {
        isToast =
          policyOptions.value.filter(
            (item) => item.value === policyName && item.templateName === "local"
          ).length > 0
            ? true
            : false;
      }
      if (isToast) {
        break;
      }
    }
    isSelectLocal.value = isToast;
  },
  {
    deep: true,
  }
);
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
        <VModal
          :visible="attachmentStorageVisible"
          :width="500"
          title="设置附件迁移存储策略"
          @close="attachmentStorageVisible = false"
        >
          <div class="migrate-mb-5">
            <VAlert
              v-if="!activatedPluginNames.includes('PluginS3ObjectStorage')"
              title="警告"
              type="warning"
            >
              <template #description>
                当前未安装/启用 S3
                插件，所有附件只能导入到本地，原云存储文件将无法远程管理
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
                :options="
                  type.type === 'LOCAL' ? localPolicyOptions : policyOptions
                "
              />
            </li>
          </ul>
          <template #footer>
            <VSpace>
              <VButton @click="submitAttachment"> 确定 </VButton>
              <VButton
                @click="
                  () =>
                    (attachmentStorageVisible = false) &&
                    (isSubmitReady = false)
                "
              >
                取消
              </VButton>
            </VSpace>
          </template>
        </VModal>
        <VCard
          :body-class="['h-full', '!p-0', 'overflow-y-auto']"
          class="h-full"
          :title="`附件（${data.attachments.length}）`"
        >
          <template #actions>
            <VButton
              class="migrate-mr-2"
              type="secondary"
              size="sm"
              @click="attachmentPolicy"
            >
              迁移存储策略
            </VButton>
          </template>
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
    <div class="migrate-mt-8 migrate-self-center">
      <VButton
        :disabled="!isSubmitReady"
        type="secondary"
        @click="handleImport"
      >
        执行导入
      </VButton>
    </div>
  </div>
</template>
