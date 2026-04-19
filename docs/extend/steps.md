# 扩展迁移步骤

当前迁移页面已经不再使用早期的 `stepItems` 动态步骤配置，而是围绕固定的三段式共享流程组织：

1. **选择平台**
2. **导入数据**
3. **开始迁移**

其中第二阶段会根据解析结果动态插入统一的附件处理区域，第三阶段则展示统一生成的迁移任务列表。

## 什么时候应该扩展共享步骤

如果你的需求属于所有 Provider 都可能复用的共享能力，例如：

1. 导入前的统一预处理
2. 共享的附件确认逻辑
3. 所有平台共用的数据摘要或执行控制

那么应该扩展共享步骤；如果只是某个平台自己的解析、预览或特殊准备逻辑，则应优先放回该 Provider 自己的组件中。

## 当前实现位置

扩展共享步骤时，通常需要同时调整以下位置：

1. `ui/src/views/MigrateView.vue`
   - 控制当前三段式页面结构
   - 渲染 Provider 组件、共享附件处理区域和任务面板
2. `ui/src/composables/use-migrate-preparation.ts`
   - 管理解析结果、准备结果、附件策略和任务列表
3. `ui/src/composables/use-migrate-task-runner.ts`
   - 控制导入前预处理、附件上传预处理和任务执行
4. `ui/src/components/MigrateAttachmentHandler.vue`
   - 处理共享附件策略选择与目录选择

## 扩展建议

1. `选择平台` 建议保持为首个阶段，不要让共享步骤影响 Provider 选择。
2. 新增共享步骤时，优先沿用当前 `parsedData -> preparedData -> taskGroups` 的状态流转，而不是让 Provider 直接操作导入任务。
3. 如果某个步骤只对单个平台有意义，优先把它放在对应 Provider 组件内部，避免在 `MigrateView.vue` 中重新引入大量 Provider 分支。
4. 只要修改了共享步骤，就需要回归所有现有 Provider，因为它们最终都会经过同一条准备和执行链路。

## 共享流程状态

```ts
interface SharedMigrateFlowState {
  parsedData?: MigrateData
  preparedData?: MigrateData
  selectedFolderFiles?: FileList | null
  localStrategy?: LocalAttachmentStrategy | null
  taskGroups: MigrateTaskGroup[]
  showTasks: boolean
}
```
