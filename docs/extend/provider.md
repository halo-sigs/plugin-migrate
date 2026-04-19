# 扩展可迁移平台

如果现有 Provider 不包含你的来源平台，可以通过扩展 `ui/src/modules/<provider>/` 的方式新增一个迁移入口。

当前迁移插件的约定是：

1. **每个 Provider 自己负责输入 UI、数据读取和来源平台特有的转换逻辑。**
2. **Provider 最终只需要输出统一的 `MigrateData`。**
3. **后续的用户归属预处理、附件策略、任务生成、任务执行由共享流程负责。**

这意味着 Provider 可以专注于“如何把源数据转换为统一结构”，而不需要关心真正的导入执行细节。

## 扩展方式

以新增一个 `demo` Provider 为例：

1. 在 `ui/src/modules` 中创建 `demo/` 目录。
2. 创建一个用于读取源数据并输出 `MigrateData` 的组件，例如 `DemoMigrateDataParser.vue`。
3. 组件需要接收 `data`，在解析完成后通过 `update:data` 抛出结果，并暴露 `reset()` 供 `MigrateView.vue` 在切换 Provider 时重置状态。

   ```ts
   defineProps<{
     data: MigrateData
   }>()

   const emit = defineEmits<{
     (event: 'update:data', value: MigrateData): void
   }>()

   function handleDataChange(data: MigrateData) {
     emit('update:data', data)
   }

   function reset() {
     emit('update:data', {} as MigrateData)
   }

   defineExpose({
     reset
   })
   ```

4. 在 `ui/src/modules/index.ts` 中注册 Provider：

   ```ts
   {
     name: 'Demo',
     icon: demoIcon,
     description: 'Demo 平台数据迁移',
     importComponent: defineAsyncComponent(() => import('./demo/DemoMigrateDataParser.vue')),
     options: {
       attachmentFolderPath: 'migrate-from-demo',
       localAttachmentStrategies: ['upload', 'manual']
     }
   }
   ```

## 共享流程

Provider 输出 `MigrateData` 后，后续会进入共享流程：

1. 如果 `attachments` 不为空，会进入统一的附件处理步骤。
2. 如果 `users` 中存在带邮箱的来源用户，会在导入前尝试匹配或创建 Halo `guest` 用户，并回填内容归属。
3. 所有内容最终都会被转换为统一的导入任务，并按既定顺序执行。

## MigrateData

```ts
interface MigrateData {
  sourceProvider?: string

  tags?: MigrateTag[]

  categories?: MigrateCategory[]

  users?: MigrateSourceUser[]

  posts?: MigratePost[]

  pages?: MigrateSinglePage[]

  comments?: (MigrateComment | MigrateReply)[]

  menuItems?: MigrateMenu[]

  moments?: MigrateMoment[]

  photos?: MigratePhoto[]

  links?: MigrateLink[]

  attachments?: MigrateAttachment[]
}
```

## Provider

```ts
interface MigrationOption {
  attachmentFolderPath?: string
  attachmentHandlerDescriptions?: AttachmentHandlerDescriptions
  localAttachmentStrategies?: LocalAttachmentStrategy[]
}

interface Provider {
  name: string
  icon: string
  description: string
  importComponent?: string | Component
  options?: MigrationOption
}
```
