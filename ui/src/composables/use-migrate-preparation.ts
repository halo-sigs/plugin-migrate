import { useMigrateTask } from '@/composables/use-migrate-task'
import type {
  AttachmentPolicyConfig,
  AttachmentPreparationResult,
  LocalAttachmentStrategy,
  MigrateData,
  MigrateTaskGroup,
  Provider
} from '@/types'
import type { User } from '@halo-dev/api-client'
import { computed, ref, watch, type Ref } from 'vue'

function isMigrateDataEmpty(data?: MigrateData) {
  if (!data) {
    return true
  }

  return Object.keys(data).length === 0
}

export function useMigratePreparation(
  activeProvider: Ref<Provider | undefined>,
  currentUser: Ref<User | undefined>
) {
  const parsedData = ref<MigrateData>()
  const preparedData = ref<MigrateData>()
  const attachmentPolicies = ref<AttachmentPolicyConfig>({})
  const selectedFolderFiles = ref<FileList | null>(null)
  const localStrategy = ref<LocalAttachmentStrategy | null>(null)
  const taskGroups = ref<MigrateTaskGroup[]>([])
  const showTasks = ref(false)

  const dataSummaryItems = computed(() => {
    if (!parsedData.value) {
      return []
    }

    return [
      { key: 'tags', label: '标签', count: parsedData.value.tags?.length || 0 },
      { key: 'categories', label: '分类', count: parsedData.value.categories?.length || 0 },
      { key: 'posts', label: '文章', count: parsedData.value.posts?.length || 0 },
      { key: 'pages', label: '页面', count: parsedData.value.pages?.length || 0 },
      { key: 'comments', label: '评论', count: parsedData.value.comments?.length || 0 },
      { key: 'moments', label: '日志', count: parsedData.value.moments?.length || 0 },
      { key: 'menuItems', label: '菜单', count: parsedData.value.menuItems?.length || 0 },
      { key: 'links', label: '链接', count: parsedData.value.links?.length || 0 },
      { key: 'photos', label: '图库', count: parsedData.value.photos?.length || 0 },
      { key: 'attachments', label: '附件', count: parsedData.value.attachments?.length || 0 }
    ].filter((item) => item.count > 0)
  })

  watch(
    () => ({
      preparedData: preparedData.value,
      attachmentPolicies: attachmentPolicies.value,
      attachmentFolderPath: activeProvider.value?.options?.attachmentFolderPath,
      currentUser: currentUser.value
    }),
    () => {
      if (!preparedData.value) {
        taskGroups.value = []
        return
      }

      taskGroups.value = useMigrateTask(preparedData.value, {
        relativePathFolder: activeProvider.value?.options?.attachmentFolderPath,
        user: currentUser.value,
        attachmentPolicies: attachmentPolicies.value
      })
    },
    { deep: true }
  )

  function resetPreparationState() {
    preparedData.value = undefined
    attachmentPolicies.value = {}
    selectedFolderFiles.value = null
    localStrategy.value = null
    taskGroups.value = []
    showTasks.value = false
  }

  function setParsedData(data?: MigrateData) {
    parsedData.value = isMigrateDataEmpty(data) ? undefined : data
    resetPreparationState()
  }

  function confirmPreparation(result?: AttachmentPreparationResult) {
    if (!parsedData.value) {
      return
    }

    preparedData.value = result?.data || parsedData.value
    attachmentPolicies.value = result?.attachmentPolicies || {}
    selectedFolderFiles.value = result?.selectedFolderFiles || null
    localStrategy.value = result?.localStrategy || null
    showTasks.value = true
  }

  function resetAll() {
    parsedData.value = undefined
    resetPreparationState()
  }

  return {
    parsedData,
    preparedData,
    attachmentPolicies,
    selectedFolderFiles,
    localStrategy,
    taskGroups,
    showTasks,
    dataSummaryItems,
    setParsedData,
    confirmPreparation,
    resetAll
  }
}
