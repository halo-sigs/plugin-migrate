<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import type { MigrateData } from '@/types'
import { consoleApiClient, coreApiClient, type Policy } from '@halo-dev/api-client'
import { VAlert, VButton, VLoading, VTag } from '@halo-dev/components'
import { useQuery } from '@tanstack/vue-query'
import { groupBy } from 'es-toolkit'
import { computed, ref, watch } from 'vue'

interface Props {
  data: MigrateData
  activatedPluginNames: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
  (event: 'policyChange', value: Map<string, string>): void
}>()

const attachments = computed(() => props.data.attachments || [])
const typeGroups = computed(() => groupBy(attachments.value, (a) => a.type))
const attachmentTypes = computed(() => Object.keys(typeGroups.value))
const hasLocal = computed(() => attachmentTypes.value.includes('LOCAL'))
const hasRemote = computed(() => attachmentTypes.value.some((t) => t !== 'LOCAL'))
const remoteTypes = computed(() => attachmentTypes.value.filter((t) => t !== 'LOCAL'))
const typeGroupCounts = computed(() => {
  const counts: Record<string, number> = {}
  Object.entries(typeGroups.value).forEach(([type, items]) => {
    counts[type] = items.length
  })
  return counts
})

const localStrategy = ref<'upload' | 'manual' | null>(null)
const selectedFolderFiles = ref<FileList | null>(null)
const uploadProgress = ref({ current: 0, total: 0 })
const uploadErrors = ref<string[]>([])
const uploadedUrlMap = ref<Map<string, string>>(new Map())
const isUploading = ref(false)

const policyOptions = ref<{ label: string; value: string; templateName: string }[]>([])
const localPolicyOptions = ref<{ label: string; value: string; templateName: string }[]>([])

useQuery({
  queryKey: ['attachment-policy-halo'],
  queryFn: async () => {
    const { data } = await coreApiClient.storage.policy.listPolicy()
    return data.items
  },
  onSuccess(data: Policy[]) {
    policyOptions.value = data.map((policy) => ({
      label: policy.spec.displayName,
      value: policy.metadata.name,
      templateName: policy.spec.templateName
    }))
    localPolicyOptions.value = policyOptions.value.filter((item) => item.templateName === 'local')
  },
  enabled: computed(() => attachments.value.length > 0)
})

const typeToPolicyMap = ref<Map<string, string>>(new Map())
const remotePolicySelections = ref<Record<string, string>>({})

watch(
  () => remoteTypes.value,
  (types) => {
    types.forEach((type) => {
      if (!remotePolicySelections.value[type]) {
        remotePolicySelections.value[type] = policyOptions.value[0]?.value || ''
      }
    })
  },
  { immediate: true }
)

watch(
  () => remotePolicySelections.value,
  (selections) => {
    Object.entries(selections).forEach(([type, policyName]) => {
      typeToPolicyMap.value.set(type, policyName)
    })
    emit('policyChange', typeToPolicyMap.value)
  },
  { deep: true }
)

watch(
  () => localStrategy.value,
  (strategy) => {
    if (strategy === 'manual' && localPolicyOptions.value.length > 0) {
      typeToPolicyMap.value.set('LOCAL', localPolicyOptions.value[0]?.value)
    } else {
      typeToPolicyMap.value.delete('LOCAL')
    }
    emit('policyChange', typeToPolicyMap.value)
  }
)

watch(
  () => localPolicyOptions.value,
  (options) => {
    if (localStrategy.value === 'manual' && options.length > 0) {
      typeToPolicyMap.value.set('LOCAL', options[0]?.value)
      emit('policyChange', typeToPolicyMap.value)
    }
  }
)

function findMatchingFile(path: string, files: FileList): File | undefined {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const relativePath = file.webkitRelativePath || file.name
    if (relativePath === normalizedPath) return file
  }
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const relativePath = file.webkitRelativePath || file.name
    if (relativePath.endsWith('/' + normalizedPath)) return file
  }
  const pathBasename = normalizedPath.split('/').pop()
  if (pathBasename) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const basename = (file.webkitRelativePath || file.name).split('/').pop()
      if (basename === pathBasename) return file
    }
  }
  return undefined
}

async function handleUploadAttachments() {
  if (!selectedFolderFiles.value) return
  isUploading.value = true
  uploadErrors.value = []
  uploadedUrlMap.value = new Map()
  const localAttachments = typeGroups.value['LOCAL'] || []
  uploadProgress.value = { current: 0, total: localAttachments.length }
  const policyName = localPolicyOptions.value[0]?.value || 'default-policy'

  for (const attachment of localAttachments) {
    const file = findMatchingFile(attachment.path, selectedFolderFiles.value)
    if (!file) {
      uploadErrors.value.push(`未找到文件: ${attachment.path}`)
      uploadProgress.value.current++
      continue
    }
    try {
      const res = await consoleApiClient.storage.attachment.uploadAttachment({
        file,
        policyName,
        groupName: attachment.groupName || ''
      })
      const uri = res.data.metadata?.annotations?.['storage.halo.run/uri']
      if (uri) {
        uploadedUrlMap.value.set(`/${attachment.path}`, uri)
        uploadedUrlMap.value.set(attachment.path, uri)
      }
    } catch (error: any) {
      uploadErrors.value.push(`${attachment.name} 上传失败: ${error?.message || String(error)}`)
    }
    uploadProgress.value.current++
  }
  isUploading.value = false
}

function replaceAttachmentUrls(data: MigrateData, urlMap: Map<string, string>) {
  const replaceInText = (text: string) => {
    if (!text) return text
    let result = text
    urlMap.forEach((newUrl, oldUrl) => {
      result = result.replaceAll(oldUrl, newUrl)
    })
    return result
  }
  data.posts?.forEach((post) => {
    if (post.postRequest.content) {
      post.postRequest.content.raw = replaceInText(post.postRequest.content.raw || '')
      post.postRequest.content.content = replaceInText(post.postRequest.content.content || '')
    }
  })
  data.pages?.forEach((page) => {
    if (page.singlePageRequest.content) {
      page.singlePageRequest.content.raw = replaceInText(page.singlePageRequest.content.raw || '')
      page.singlePageRequest.content.content = replaceInText(
        page.singlePageRequest.content.content || ''
      )
    }
  })
  data.moments?.forEach((moment) => {
    moment.spec.content.raw = replaceInText(moment.spec.content.raw || '')
    moment.spec.content.html = replaceInText(moment.spec.content.html || '')
  })
}

function getProcessedData(): MigrateData {
  const result: MigrateData = JSON.parse(JSON.stringify(props.data))
  if (hasLocal.value && localStrategy.value === 'upload') {
    replaceAttachmentUrls(result, uploadedUrlMap.value)
    result.attachments = (result.attachments || []).filter((a) => a.type !== 'LOCAL')
  }
  return result
}

function canConfirm() {
  if (!hasLocal.value && !hasRemote.value) return true
  if (hasLocal.value && !localStrategy.value) return false
  if (hasLocal.value && localStrategy.value === 'upload' && uploadedUrlMap.value.size === 0) {
    return false
  }
  if (hasRemote.value) {
    for (const type of remoteTypes.value) {
      if (!remotePolicySelections.value[type]) return false
    }
  }
  return true
}

const handleConfirm = () => {
  emit('update:data', getProcessedData())
}

const handleFolderChange = (files: FileList) => {
  selectedFolderFiles.value = files
  uploadedUrlMap.value = new Map()
  uploadErrors.value = []
}

defineExpose({
  getProcessedData,
  canConfirm
})
</script>

<template>
  <div class=":uno: border border-gray-100 rounded-xl bg-gray-50/60 p-5 space-y-5">
    <!-- 本地附件 -->
    <div v-if="hasLocal">
      <div class=":uno: mb-3 flex items-center gap-2">
        <span
          class=":uno: h-6 w-6 flex items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-600 font-semibold"
          >1</span
        >
        <h4 class=":uno: text-gray-900 font-semibold">本地附件</h4>
        <VTag>{{ typeGroupCounts['LOCAL'] }} 个</VTag>
      </div>

      <div class=":uno: space-y-3">
        <!-- 方案选择 -->
        <div class=":uno: flex gap-3">
          <button
            type="button"
            class=":uno: flex flex-1 items-center gap-3 border rounded-lg bg-white px-4 py-3 text-left transition-all hover:border-indigo-300"
            :class="
              localStrategy === 'upload'
                ? ':uno: border-indigo-500 ring-1 ring-indigo-500'
                : ':uno: border-gray-200'
            "
            @click="localStrategy = 'upload'"
          >
            <span
              class=":uno: h-5 w-5 flex items-center justify-center border rounded-full"
              :class="
                localStrategy === 'upload'
                  ? ':uno: border-indigo-500 bg-indigo-500'
                  : ':uno: border-gray-300'
              "
            >
              <span v-if="localStrategy === 'upload'" class=":uno: h-2 w-2 rounded-full bg-white" />
            </span>
            <div>
              <div class=":uno: text-gray-900 font-medium">上传到新 Halo</div>
              <div class=":uno: text-xs text-gray-500">自动替换文章中的附件链接</div>
            </div>
          </button>

          <button
            type="button"
            class=":uno: flex flex-1 items-center gap-3 border rounded-lg bg-white px-4 py-3 text-left transition-all hover:border-indigo-300"
            :class="
              localStrategy === 'manual'
                ? ':uno: border-indigo-500 ring-1 ring-indigo-500'
                : ':uno: border-gray-200'
            "
            @click="localStrategy = 'manual'"
          >
            <span
              class=":uno: h-5 w-5 flex items-center justify-center border rounded-full"
              :class="
                localStrategy === 'manual'
                  ? ':uno: border-indigo-500 bg-indigo-500'
                  : ':uno: border-gray-300'
              "
            >
              <span v-if="localStrategy === 'manual'" class=":uno: h-2 w-2 rounded-full bg-white" />
            </span>
            <div>
              <div class=":uno: text-gray-900 font-medium">手动迁移</div>
              <div class=":uno: text-xs text-gray-500">复制 upload 目录并创建代理</div>
            </div>
          </button>
        </div>

        <!-- 上传方案详情 -->
        <div
          v-if="localStrategy === 'upload'"
          class=":uno: border border-indigo-100 rounded-lg bg-white p-4"
        >
          <VAlert type="info" title="选择附件文件夹" :closable="false" class=":uno: mb-3">
            <template #description>
              请选择包含 Halo 1.x <code>upload</code> 目录的文件夹，系统会自动匹配路径并上传。
            </template>
          </VAlert>

          <div class=":uno: flex items-center gap-3">
            <FileSelector folder button-text="选择附件文件夹" @fileChange="handleFolderChange" />
            <span v-if="selectedFolderFiles" class=":uno: text-sm text-gray-600">
              已选择 {{ selectedFolderFiles.length }} 个文件
            </span>
          </div>

          <VButton
            v-if="selectedFolderFiles && !isUploading && uploadedUrlMap.size === 0"
            type="primary"
            class=":uno: mt-3"
            @click="handleUploadAttachments"
          >
            开始上传
          </VButton>

          <div v-if="isUploading" class=":uno: mt-3 space-y-2">
            <div class=":uno: flex items-center justify-between text-sm">
              <span class=":uno: flex items-center gap-2 text-gray-600">
                <VLoading />
                正在上传附件
              </span>
              <span class=":uno: text-gray-900 font-medium">
                {{ uploadProgress.current }} / {{ uploadProgress.total }}
              </span>
            </div>
            <div class=":uno: h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                class=":uno: h-full bg-indigo-500 transition-all"
                :style="{
                  width: uploadProgress.total
                    ? `${(uploadProgress.current / uploadProgress.total) * 100}%`
                    : '0%'
                }"
              />
            </div>
          </div>

          <VAlert
            v-if="uploadedUrlMap.size > 0"
            type="success"
            :closable="false"
            class=":uno: mt-3"
          >
            <template #description>
              成功上传 {{ uploadedUrlMap.size }} 个附件，文章/页面/日志中的链接已自动替换。
            </template>
          </VAlert>

          <VAlert
            v-if="uploadErrors.length > 0"
            type="warning"
            :closable="false"
            class=":uno: mt-3"
          >
            <template #description>
              <div class=":uno: max-h-32 overflow-y-auto text-xs">
                <div v-for="(err, idx) in uploadErrors" :key="idx" class=":uno: py-0.5">
                  {{ err }}
                </div>
              </div>
            </template>
          </VAlert>
        </div>

        <!-- 手动迁移详情 -->
        <div
          v-if="localStrategy === 'manual'"
          class=":uno: border border-gray-200 rounded-lg bg-white p-4"
        >
          <VAlert type="info" title="手动迁移说明" :closable="false" class=":uno: mb-3">
            <template #description>
              将 Halo 1.x 的 <code>upload</code> 目录复制到新 Halo
              的附件目录，然后选择本地存储策略。
            </template>
          </VAlert>
          <FormKit
            v-if="localPolicyOptions.length"
            :model-value="typeToPolicyMap.get('LOCAL')"
            type="select"
            label="本地存储策略"
            :options="localPolicyOptions"
            @update:model-value="(v: string) => typeToPolicyMap.set('LOCAL', v)"
          />
          <VAlert v-else type="warning" title="警告" :closable="false">
            <template #description> 当前没有可用的本地存储策略，请先创建一个。 </template>
          </VAlert>
        </div>
      </div>
    </div>

    <!-- 云存储附件 -->
    <div v-if="hasRemote">
      <div class=":uno: mb-3 flex items-center gap-2">
        <span
          class=":uno: h-6 w-6 flex items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-600 font-semibold"
        >
          {{ hasLocal ? '2' : '1' }}
        </span>
        <h4 class=":uno: text-gray-900 font-semibold">云存储附件</h4>
      </div>

      <div class=":uno: border border-gray-200 rounded-lg bg-white p-4">
        <VAlert
          v-if="!activatedPluginNames.includes('PluginS3ObjectStorage')"
          type="warning"
          title="警告"
          :closable="false"
          class=":uno: mb-3"
        >
          <template #description>
            当前未安装/启用 S3 插件，云存储附件将无法迁移。
            <a
              href="https://halo.run/store/apps/app-Qxhpp"
              target="_blank"
              class=":uno: text-indigo-600 hover:underline"
              >前往安装</a
            >。
          </template>
        </VAlert>

        <VAlert v-else type="info" :closable="false" class=":uno: mb-3">
          <template #description>
            为每种云存储类型选择对应的存储策略，系统会创建 attachments 数据记录，不移动远程文件。
          </template>
        </VAlert>

        <div class=":uno: grid grid-cols-1 gap-4 md:grid-cols-2">
          <div
            v-for="type in remoteTypes"
            :key="type"
            class=":uno: border border-gray-100 rounded-lg bg-gray-50/50 p-3"
          >
            <div class=":uno: mb-2 flex items-center justify-between">
              <span class=":uno: text-gray-900 font-medium">{{ type }}</span>
              <VTag size="sm">{{ typeGroupCounts[type] }} 个</VTag>
            </div>
            <FormKit
              v-model="remotePolicySelections[type]"
              type="select"
              :label="`存储策略`"
              :options="policyOptions"
              :disabled="!activatedPluginNames.includes('PluginS3ObjectStorage')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 无附件 -->
    <VAlert v-if="!hasLocal && !hasRemote" type="info" title="提示" :closable="false">
      <template #description> 当前数据中不包含附件，可以直接开始迁移。 </template>
    </VAlert>

  </div>
</template>
