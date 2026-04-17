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

// 分析附件类型
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

// 本地附件策略
const localStrategy = ref<'upload' | 'manual' | null>(null)
const selectedFolderFiles = ref<FileList | null>(null)
const uploadProgress = ref({ current: 0, total: 0 })
const uploadErrors = ref<string[]>([])
const uploadedUrlMap = ref<Map<string, string>>(new Map())
const isUploading = ref(false)

// 存储策略
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

// 策略配置
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

  // 1. 完整路径匹配
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const relativePath = file.webkitRelativePath || file.name
    if (relativePath === normalizedPath) return file
  }

  // 2. 后缀路径匹配（处理用户选择了父目录的情况）
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const relativePath = file.webkitRelativePath || file.name
    if (relativePath.endsWith('/' + normalizedPath)) return file
  }

  // 3. 按文件名兜底匹配
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
    // 替换 URL
    replaceAttachmentUrls(result, uploadedUrlMap.value)
    // 移除本地附件，不迁移 attachments 表
    result.attachments = (result.attachments || []).filter((a) => a.type !== 'LOCAL')
  }

  // 非本地附件保留，按策略迁移
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
</script>

<template>
  <div class=":uno: space-y-4">
    <!-- 本地附件处理 -->
    <div v-if="hasLocal" class=":uno: rounded-lg bg-gray-50 p-4">
      <h4 class=":uno: mb-3 font-semibold">本地附件</h4>

      <div class=":uno: mb-3 flex gap-4">
        <label class=":uno: flex cursor-pointer items-center gap-2">
          <input v-model="localStrategy" type="radio" value="upload" />
          <span>上传附件到 Halo</span>
        </label>
        <label class=":uno: flex cursor-pointer items-center gap-2">
          <input v-model="localStrategy" type="radio" value="manual" />
          <span>手动移动并创建代理</span>
        </label>
      </div>

      <!-- 上传方案 -->
      <div v-if="localStrategy === 'upload'" class=":uno: space-y-3">
        <VAlert type="info" title="提示" :closable="false">
          <template #description>
            请选择包含 Halo 1.x 附件的文件夹。通常这个文件夹名为<code>upload</code>，或者包含
            <code>upload</code>文件夹的父目录。 系统会自动匹配附件路径并上传。
          </template>
        </VAlert>

        <FileSelector folder button-text="选择附件文件夹" @fileChange="handleFolderChange" />

        <div v-if="selectedFolderFiles" class=":uno: text-sm text-gray-600">
          已选择文件夹，包含 {{ selectedFolderFiles.length }} 个文件
        </div>

        <VButton
          v-if="selectedFolderFiles && !isUploading && uploadedUrlMap.size === 0"
          type="primary"
          @click="handleUploadAttachments"
        >
          开始上传附件
        </VButton>

        <div v-if="isUploading" class=":uno: flex items-center gap-3">
          <VLoading />
          <span class=":uno: text-sm"
            >正在上传 {{ uploadProgress.current }} / {{ uploadProgress.total }}</span
          >
        </div>

        <VAlert
          v-if="uploadedUrlMap.size > 0"
          type="success"
          title="上传完成"
          :closable="false"
          class=":uno: mt-2"
        >
          <template #description>
            成功上传 {{ uploadedUrlMap.size }} 个附件，文章/页面/日志中的链接将自动替换。
          </template>
        </VAlert>

        <VAlert
          v-if="uploadErrors.length > 0"
          type="warning"
          title="部分上传失败"
          :closable="false"
          class=":uno: mt-2"
        >
          <template #description>
            <ul class=":uno: list-disc list-inside">
              <li v-for="(err, idx) in uploadErrors" :key="idx">{{ err }}</li>
            </ul>
          </template>
        </VAlert>
      </div>

      <!-- 手动迁移方案 -->
      <div v-if="localStrategy === 'manual'" class=":uno: space-y-3">
        <VAlert type="info" title="提示" :closable="false">
          <template #description>
            请手动将 Halo 1.x 的<code>upload</code>目录复制到新版本 Halo
            的附件目录中，并选择对应的本地存储策略。系统将在导入时创建 attachments 数据。
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

    <!-- 非本地附件处理 -->
    <div v-if="hasRemote" class=":uno: rounded-lg bg-gray-50 p-4">
      <h4 class=":uno: mb-3 font-semibold">云存储附件</h4>

      <VAlert
        v-if="!activatedPluginNames.includes('PluginS3ObjectStorage')"
        type="warning"
        title="警告"
        :closable="false"
        class=":uno: mb-3"
      >
        <template #description>
          当前未安装/启用 S3 插件，云存储附件将无法迁移。可前往
          <a href="https://halo.run/store/apps/app-Qxhpp" target="_blank">
            https://halo.run/store/apps/app-Qxhpp
          </a>
          进行安装。
        </template>
      </VAlert>

      <VAlert v-else type="info" title="提示" :closable="false" class=":uno: mb-3">
        <template #description>
          检测到以下云存储附件类型，请为每种类型选择对应的存储策略。迁移时只会创建 attachments
          数据记录，不会实际移动远程文件。
        </template>
      </VAlert>

      <div class=":uno: space-y-3">
        <div v-for="type in remoteTypes" :key="type">
          <div class=":uno: mb-1 flex items-center gap-2">
            <span class=":uno: font-medium">{{ type }}</span>
            <VTag>{{ typeGroupCounts[type] }} 个</VTag>
          </div>
          <FormKit
            v-model="remotePolicySelections[type]"
            type="select"
            :label="`为 ${type} 选择存储策略`"
            :options="policyOptions"
            :disabled="!activatedPluginNames.includes('PluginS3ObjectStorage')"
          />
        </div>
      </div>
    </div>

    <!-- 无附件提示 -->
    <VAlert v-if="!hasLocal && !hasRemote" type="info" title="提示" :closable="false">
      <template #description> 当前数据中不包含附件，可以直接开始迁移。 </template>
    </VAlert>

    <div class=":uno: flex justify-end pt-2">
      <VButton type="primary" :disabled="!canConfirm()" @click="handleConfirm">确认并继续</VButton>
    </div>
  </div>
</template>
