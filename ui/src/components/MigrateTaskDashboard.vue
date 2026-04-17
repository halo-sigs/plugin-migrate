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

const filterType = ref<string>('all')
const filterStatus = ref<MigrateTaskState | 'all'>('all')

const allTasks = computed(() => props.taskGroups.flatMap((g) => g.tasks))

const typeOptions = computed(() => {
  const options: { label: string; value: string }[] = [{ label: '全部类型', value: 'all' }]
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
    const matchType =
      filterType.value === 'all' ||
      task.type === filterType.value ||
      getGroupKey(task.type) === filterType.value
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

const globalStats = computed(() => {
  const total = allTasks.value.length
  const success = allTasks.value.filter((t) => t.status === 'success').length
  const failed = allTasks.value.filter((t) => t.status === 'failed').length
  const pending = allTasks.value.filter((t) => t.status === 'pending').length
  const running = allTasks.value.filter((t) => t.status === 'running').length
  return { total, success, failed, pending, running }
})

const typeLabelMap: Record<string, string> = {
  tag: '标签',
  category: '分类',
  post: '文章',
  page: '页面',
  moment: '日志',
  journal: '日志',
  comment: '评论',
  reply: '回复',
  attachment: '附件',
  link: '链接',
  linkGroup: '链接分组',
  photo: '图库',
  photoGroup: '图库分组',
  menu: '菜单',
  menuItem: '菜单项',
  counter: '统计'
}

const statusMeta: Record<MigrateTaskState, { label: string; dot: string; badge: string }> = {
  pending: {
    label: '等待中',
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-700'
  },
  running: {
    label: '执行中',
    dot: 'bg-blue-500 animate-pulse',
    badge: 'bg-blue-100 text-blue-700'
  },
  success: {
    label: '成功',
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-700'
  },
  failed: {
    label: '失败',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700'
  }
}

const handleRetry = (task: MigrateTaskItem) => {
  emit('retry', task)
}

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
    <!-- 统计卡片 -->
    <div v-if="globalStats.total > 0" class=":uno: grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class=":uno: rounded-lg bg-gray-50 p-3 text-center">
        <div class=":uno: text-2xl text-gray-900 font-bold">{{ globalStats.total }}</div>
        <div class=":uno: text-xs text-gray-500">总任务</div>
      </div>
      <div class=":uno: rounded-lg bg-green-50 p-3 text-center">
        <div class=":uno: text-2xl text-green-700 font-bold">{{ globalStats.success }}</div>
        <div class=":uno: text-xs text-green-600">成功</div>
      </div>
      <div class=":uno: rounded-lg bg-red-50 p-3 text-center">
        <div class=":uno: text-2xl text-red-700 font-bold">{{ globalStats.failed }}</div>
        <div class=":uno: text-xs text-red-600">失败</div>
      </div>
      <div class=":uno: rounded-lg bg-blue-50 p-3 text-center">
        <div class=":uno: text-2xl text-blue-700 font-bold">
          {{ globalStats.running + globalStats.pending }}
        </div>
        <div class=":uno: text-xs text-blue-600">待执行</div>
      </div>
    </div>

    <!-- 筛选器 -->
    <div
      class=":uno: flex flex-wrap items-end gap-3 border border-gray-100 rounded-lg bg-gray-50/60 p-3"
    >
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
      <div class=":uno: ml-auto text-sm text-gray-500">显示 {{ filteredTasks.length }} 个</div>
    </div>

    <!-- 虚拟列表 -->
    <div ref="containerRef" class=":uno: h-80 overflow-auto border border-gray-200 rounded-lg">
      <!-- 表头 -->
      <div
        class=":uno: sticky top-0 z-10 flex items-center border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 font-semibold"
      >
        <div class=":uno: flex-1">任务名称</div>
        <div class=":uno: w-24 text-center">状态</div>
        <div class=":uno: w-24 text-center">类型</div>
        <div class=":uno: w-20 text-right">操作</div>
      </div>

      <div :style="{ height: `${totalSize}px`, width: '100%', position: 'relative' }">
        <div
          v-for="virtualRow in virtualItems"
          :key="String(virtualRow.key)"
          class=":uno: absolute left-0 w-full border-b border-gray-100 px-4"
          :class="{
            ':uno: bg-red-50/40': filteredTasks[virtualRow.index]?.status === 'failed',
            ':uno: hover:bg-gray-50': filteredTasks[virtualRow.index]?.status !== 'failed'
          }"
          :style="{
            height: `${rowHeight}px`,
            transform: `translateY(${virtualRow.start}px)`
          }"
        >
          <div
            v-if="filteredTasks[virtualRow.index]"
            class=":uno: h-full flex items-center gap-3"
          >
            <div
              class=":uno: h-8 w-1.5 flex-shrink-0 rounded-full"
              :class="{
                ':uno: bg-red-500': filteredTasks[virtualRow.index].status === 'failed',
                ':uno: bg-green-500': filteredTasks[virtualRow.index].status === 'success',
                ':uno: bg-blue-500': filteredTasks[virtualRow.index].status === 'running',
                ':uno: bg-gray-200': filteredTasks[virtualRow.index].status === 'pending'
              }"
            />
            <div class=":uno: min-w-0 flex-1">
              <div class=":uno: truncate text-sm text-gray-900 font-medium">
                {{ filteredTasks[virtualRow.index].label }}
              </div>
              <p
                v-if="
                  filteredTasks[virtualRow.index].status === 'failed' &&
                  filteredTasks[virtualRow.index].error
                "
                class=":uno: mt-0.5 truncate text-xs text-red-600"
              >
                {{ filteredTasks[virtualRow.index].error }}
              </p>
            </div>

            <div class=":uno: w-24 px-2 text-center">
              <span
                class=":uno: inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="statusMeta[filteredTasks[virtualRow.index].status].badge"
              >
                <span
                  class=":uno: h-1.5 w-1.5 rounded-full"
                  :class="statusMeta[filteredTasks[virtualRow.index].status].dot"
                />
                {{ statusMeta[filteredTasks[virtualRow.index].status].label }}
              </span>
            </div>

            <div class=":uno: w-24 px-2 text-center">
              <VTag size="sm" class=":uno: !px-2 !py-0.5">{{
                typeLabelMap[filteredTasks[virtualRow.index].type] ||
                filteredTasks[virtualRow.index].type
              }}</VTag>
            </div>

            <div class=":uno: w-20 px-2 text-right">
              <VButton
                v-if="filteredTasks[virtualRow.index].status === 'failed'"
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
