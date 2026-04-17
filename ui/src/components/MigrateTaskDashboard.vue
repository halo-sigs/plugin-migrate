<script setup lang="ts">
import type { MigrateTaskGroup, MigrateTaskItem, MigrateTaskState } from '@/types'
import { VButton, VTag } from '@halo-dev/components'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  taskGroups: MigrateTaskGroup[]
  loading: boolean
}>()

const emit = defineEmits<{
  (event: 'retry', task: MigrateTaskItem): void
}>()

// 筛选状态
const filterType = ref<string>('all')
const filterStatus = ref<MigrateTaskState | 'all'>('all')

const allTasks = computed(() => props.taskGroups.flatMap((g) => g.tasks))

const typeOptions = computed(() => {
  const options: { label: string; value: string }[] = [
    { label: '全部类型', value: 'all' }
  ]
  const seen = new Set<string>(['all'])
  props.taskGroups.forEach((g) => {
    if (!seen.has(g.key)) {
      seen.add(g.key)
      options.push({ label: g.label, value: g.key })
    }
  })
  return options
})

const filteredTasks = computed(() => {
  return allTasks.value.filter((task) => {
    const matchType = filterType.value === 'all' || task.type === filterType.value || getGroupKey(task.type) === filterType.value
    const matchStatus = filterStatus.value === 'all' || task.status === filterStatus.value
    return matchType && matchStatus
  })
})

function getGroupKey(taskType: string): string {
  for (const g of props.taskGroups) {
    if (g.tasks.some((t) => t.type === taskType)) {
      return g.key
    }
  }
  return taskType
}

const statusBadge = (status: MigrateTaskState) => {
  switch (status) {
    case 'pending':
      return { text: '等待中', class: 'bg-gray-100 text-gray-600' }
    case 'running':
      return { text: '执行中', class: 'bg-blue-100 text-blue-600' }
    case 'success':
      return { text: '成功', class: 'bg-green-100 text-green-600' }
    case 'failed':
      return { text: '失败', class: 'bg-red-100 text-red-600' }
    default:
      return { text: '未知', class: 'bg-gray-100 text-gray-600' }
  }
}

const globalStats = computed(() => {
  const total = allTasks.value.length
  const success = allTasks.value.filter((t) => t.status === 'success').length
  const failed = allTasks.value.filter((t) => t.status === 'failed').length
  const pending = allTasks.value.filter((t) => t.status === 'pending').length
  const running = allTasks.value.filter((t) => t.status === 'running').length
  return { total, success, failed, pending, running }
})

const handleRetry = (task: MigrateTaskItem) => {
  emit('retry', task)
}

// 虚拟列表
const containerRef = ref<HTMLDivElement | null>(null)
const rowHeight = 56

const virtualizer = useVirtualizer(
  computed(() => ({
    count: filteredTasks.value.length,
    getScrollElement: () => containerRef.value,
    estimateSize: () => rowHeight,
    overscan: 5
  }))
)

const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

watch(
  () => filteredTasks.value.length,
  () => {
    virtualizer.value.measure()
  }
)
</script>

<template>
  <div class=":uno: space-y-4">
    <!-- 全局统计 -->
    <div
      v-if="globalStats.total > 0"
      class=":uno: flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 p-3"
    >
      <div class=":uno: flex flex-wrap gap-4 text-sm">
        <span class=":uno: font-medium"
          >共 <strong class=":uno: text-gray-900">{{ globalStats.total }}</strong> 个任务</span
        >
        <span class=":uno: text-gray-600"
          >成功 <strong class=":uno: text-green-600">{{ globalStats.success }}</strong></span
        >
        <span class=":uno: text-gray-600"
          >失败 <strong class=":uno: text-red-600">{{ globalStats.failed }}</strong></span
        >
        <span v-if="globalStats.running > 0" class=":uno: text-gray-600"
          >执行中 <strong class=":uno: text-blue-600">{{ globalStats.running }}</strong></span
        >
        <span v-if="globalStats.pending > 0" class=":uno: text-gray-600"
          >等待中 <strong class=":uno: text-gray-800">{{ globalStats.pending }}</strong></span
        >
      </div>
      <div class=":uno: text-sm text-gray-500"
        >显示 {{ filteredTasks.length }} 个</div
      >
    </div>

    <!-- 筛选器 -->
    <div class=":uno: flex flex-wrap gap-3">
      <FormKit v-model="filterType" type="select" label="数据类型" :options="typeOptions" />
      <FormKit
        v-model="filterStatus"
        type="select"
        label="任务状态"
        :options="[
          { label: '全部状态', value: 'all' },
          { label: '等待中', value: 'pending' },
          { label: '执行中', value: 'running' },
          { label: '成功', value: 'success' },
          { label: '失败', value: 'failed' }
        ]"
      />
    </div>

    <!-- 虚拟列表 -->
    <div
      ref="containerRef"
      class=":uno: h-96 overflow-auto rounded-lg border border-gray-100"
    >
      <div :style="{ height: `${totalSize}px`, width: '100%', position: 'relative' }">
        <div
          v-for="virtualRow in virtualItems"
          :key="String(virtualRow.key)"
          class=":uno: absolute left-0 w-full border-b border-gray-100 px-4 py-3 hover:bg-gray-50"
          :style="{
            height: `${rowHeight}px`,
            transform: `translateY(${virtualRow.start}px)`
          }"
        >
          <div
            v-if="filteredTasks[virtualRow.index]"
            class=":uno: flex items-start justify-between gap-3"
          >
            <div class=":uno: min-w-0 flex-1">
              <div class=":uno: flex items-center gap-2">
                <span class=":uno: truncate text-sm font-medium">{{
                  filteredTasks[virtualRow.index].label
                }}</span>
                <span
                  class=":uno: inline-flex rounded px-2 py-0.5 text-xs font-medium"
                  :class="statusBadge(filteredTasks[virtualRow.index].status).class"
                >
                  {{ statusBadge(filteredTasks[virtualRow.index].status).text }}
                </span>
                <VTag size="sm" class=":uno: !px-1.5 !py-0"
                  >{{ filteredTasks[virtualRow.index].type }}</VTag
                >
              </div>
              <p
                v-if="
                  filteredTasks[virtualRow.index].status === 'failed' &&
                  filteredTasks[virtualRow.index].error
                "
                class=":uno: mt-1 break-all text-xs text-red-600"
              >
                {{ filteredTasks[virtualRow.index].error }}
              </p>
            </div>
            <div v-if="filteredTasks[virtualRow.index].status === 'failed'" class=":uno: shrink-0">
              <VButton
                size="sm"
                :disabled="loading"
                @click.stop="handleRetry(filteredTasks[virtualRow.index])"
              >
                重试
              </VButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
