# 扩展一个新的迁移平台

本文档基于当前插件的真实实现，说明如何为 plugin-migrate 新增一个来源平台。目标读者是准备扩展 WordPress、Ghost、Typecho、Markdown 之外的新平台开发者。

## 先理解当前架构

当前迁移插件的核心原则很简单：**每个 Provider 只负责来源平台自己的读取、解析和转换；真正的导入流程全部走共享链路。**

在当前实现中，一次迁移大致会经过以下阶段：

1. 在 `ui/src/modules/index.ts` 注册 Provider，让它出现在平台选择页。
2. `MigrateView.vue` 根据当前 Provider 渲染对应的解析组件。
3. Provider 组件读取用户选择的文件、目录或链接，并产出统一的 `MigrateData`。
4. `useMigratePreparation.ts` 根据解析结果决定是否进入统一附件处理，并生成最终要执行的任务分组。
5. `useMigrateTaskRunner.ts` 负责用户归属预处理、本地附件上传预处理，以及按统一队列执行导入任务。

这意味着新增平台时，**不要在 Provider 内直接调用 Halo API，也不要在 Provider 内自己执行导入**。Provider 的职责应该停留在“把来源平台数据转换成当前插件认得的结构”这一层。

如果你发现自己正在考虑在 Provider 组件里直接创建文章、上传附件或运行任务，通常说明实现已经偏离当前架构了。

## 什么时候应该新增 Provider

如果你的来源平台有独立的数据格式、文件结构、导出方式或媒体路径规则，就应该新增一个单独的 Provider。

典型例子包括：

- 自定义导出文件格式，例如 XML、JSON、SQL dump、压缩包目录
- 特定的附件路径约定，例如 `/wp-content/uploads/`、`content/images/`、`usr/uploads/`
- 特定的用户、评论、分类或页面模型
- 需要自己的导入提示、文件选择方式或预解析逻辑

如果只是想增强所有平台都会复用的能力，例如统一附件处理、统一用户匹配、统一任务执行顺序，那么应该优先修改共享流程，而不是新增 Provider。

## 当前扩展点在哪里

新增一个平台时，通常会同时接触以下几处代码：

| 位置 | 作用 |
| --- | --- |
| `ui/src/modules/index.ts` | 注册 Provider、配置附件处理选项 |
| `ui/src/modules/<provider>/` | 存放该平台自己的组件和解析逻辑 |
| `ui/src/views/MigrateView.vue` | 承载共享迁移页面，一般不需要为单个平台加分支 |
| `ui/src/composables/use-migrate-preparation.ts` | 把解析结果转换成准备状态与任务分组 |
| `ui/src/composables/use-migrate-task.ts` | 把统一数据结构映射为真正的导入任务 |
| `ui/src/components/MigrateAttachmentHandler.vue` | 统一附件处理 UI |
| `ui/src/composables/use-migrate-task-runner.ts` | 执行用户预处理、附件预处理与任务队列 |

如果你的新平台只是“新增一种来源格式”，大部分改动应该集中在 `ui/src/modules/<provider>/` 和 `ui/src/modules/index.ts`，而不是扩散到整个迁移视图。

## 推荐的目录结构

建议每个新平台都使用独立目录，至少拆成“界面组件”和“解析逻辑”两层。例如新增 `demo` 平台时，可以这样组织：

```text
ui/src/modules/demo/
├── DemoMigrateDataParser.vue
└── use-demo-data-parser.ts
```

如果该平台还有额外的格式归一化、Front Matter 解析、附件路径处理等逻辑，可以继续在该目录下拆分多个辅助文件。原则是：**Provider 内部复杂度在自己的目录里消化，不要把平台特有逻辑塞回共享 composable。**

## 第一步：注册 Provider

所有平台入口都通过 `ui/src/modules/index.ts` 统一注册。新增 Provider 时，需要提供：

- `name`：显示在平台选择页和迁移页面顶部的名称
- `icon`：平台图标
- `description`：平台简介
- `importComponent`：解析组件
- `options`：附件目录前缀、本地附件策略、自定义附件提示文案

一个最小示例如下：

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

其中 `attachmentFolderPath` 很重要。共享任务生成逻辑会用它拼出本地附件记录里的相对路径标记，例如：

```text
migrate-from-demo/path/to/file.jpg
```

如果你的 Provider 支持“手动迁移本地附件”，这个目录前缀应该从一开始就设计清楚，并和文档里的手动迁移说明保持一致。

## 第二步：实现 Provider 组件

Provider 组件的职责是展示来源平台自己的上传或输入界面，并在解析成功后通过 `v-model:data` 把统一结果交给外层。

当前 `MigrateView.vue` 通过下面的方式和 Provider 组件交互：

- 传入 `v-model:data`
- 在切换平台时调用组件暴露的 `reset()`

因此，一个 Provider 组件至少要满足以下约定：

```ts
defineProps<{
  data: MigrateData
}>()

const emit = defineEmits<{
  (event: 'update:data', value: MigrateData): void
}>()

function reset() {
  emit('update:data', {} as MigrateData)
}

defineExpose({
  reset
})
```

比较推荐的实现方式是：

1. 在组件内处理文件选择、目录选择或 URL 输入
2. 调用 `use-xxx-data-parser.ts` 之类的解析 composable
3. 解析前先清空旧数据
4. 成功后 `emit('update:data', data)`
5. 失败时显示错误，但不要伪造成功结果

像 Markdown、WordPress、Ghost 这些现有 Provider 都遵循了这个模式，可以直接作为参考。

## 第三步：输出统一的 `MigrateData`

不论来源平台原始格式多复杂，最终都必须收敛到 `MigrateData`：

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

这里有两个重要原则：

1. **只输出当前平台确实能稳定提供的数据。** 不要为了“看起来完整”而伪造字段。
2. **尽量在 Provider 内完成归一化。** 例如页面和文章的区分、评论层级的整理、附件路径的标准化，都应该在这里收敛。

共享流程不会替你理解来源平台的原始语义；共享流程只负责消费已经被归一化后的结果。

## 如何构造文章和页面

文章和页面最终都要包装成 Halo 已有的请求结构：

- 文章使用 `MigratePost`
- 页面使用 `MigrateSinglePage`

这两个结构内部直接持有 `PostRequest` 或 `SinglePageRequest`，因此最稳妥的做法是：**在 Provider 内就直接按 Halo 当前 API 所需结构去组装数据**。

同时，如果来源平台包含作者归属信息，应该额外填写：

```ts
ownerRef?: {
  sourceId: string
}
```

这里只需要保存来源平台用户 ID，不要在 Provider 内自行做 Halo 用户匹配。真正的匹配发生在导入执行前，由 `useUserPreprocessor()` 统一处理。

如果来源平台还带有访问量、点赞数、已审核评论数等统计数据，也可以通过 `counter` 附带到文章或页面上，后续共享任务生成器会自动追加对应的统计任务。

## 如何处理来源用户

如果平台有作者、评论者或其他可识别用户，建议尽量输出 `users` 列表，并为文章、页面、评论保留 `ownerRef`。

来源用户结构如下：

```ts
interface MigrateSourceUser {
  id: string
  provider: string
  displayName: string
  email?: string
  username?: string
  slug?: string
  avatar?: string
  bio?: string
  website?: string
  role?: string
}
```

其中最有价值的是：

- `id`：来源平台内的稳定主键
- `provider`：来源平台标识
- `displayName`
- `email`

如果你能拿到邮箱，导入时共享用户预处理会优先尝试匹配已有 Halo 用户；匹配不到时再创建 `guest` 用户。  
如果你拿不到邮箱，也仍然建议输出稳定的来源用户 ID，这样至少能保留来源归属链路。

## 如何处理评论和回复

评论导入最容易出错的地方是层级语义。当前插件使用的是：

- 顶级评论：`MigrateComment`
- 非顶级回复：`MigrateReply`

并且评论、回复还需要显式说明它们属于哪种内容：

```ts
refType: 'Post' | 'SinglePage' | 'Moment'
```

如果你的来源平台支持多级回复，需要在 Provider 内提前整理好：

- 根评论是谁
- 直接父回复是谁
- 是否需要映射为 Halo 的 `quoteReply`

不要把“如何从来源平台的父子关系推导 Halo 的 Comment / Reply 结构”留到共享流程里处理。  
WordPress、Typecho、Halo 1.x 这些 Provider 的评论逻辑都可以作为参考样例。

## 如何处理附件

附件是新增 Provider 时最需要提前设计好的部分，因为它直接影响后续“上传到 Halo”和“手动迁移”两种路径。

统一附件结构如下：

```ts
interface MigrateAttachment {
  id: number | string
  name: string
  path: string
  url?: string
  fileKey?: string
  mediaType?: string
  suffix?: string
  width?: number
  height?: number
  size?: number
  tags?: string[]
  type: AttachmentType
}
```

你需要先回答三个问题：

1. 这个平台的本地附件路径规则是什么？
2. 这个平台是否存在远程云存储附件？
3. 文章正文、封面、摘要或其他字段里引用附件的方式是什么？

### 本地附件

如果附件来自本地目录，请把它们标记为 `type: 'LOCAL'`，并让 `path` 尽量保持来源平台中的相对路径语义，例如：

- WordPress：`wp-content/uploads/...`
- Ghost：`content/images/...`
- Typecho：`usr/uploads/...`
- Halo 1.x：`upload/...`

这很重要，因为共享任务生成器会根据 `attachmentFolderPath` 和 `item.path` 组合出最终的本地路径标记。  
如果你的 `path` 设计错了，后续无论是自动上传还是手动迁移，都会变得很难解释。

### 远程附件

如果来源平台能区分云存储类型，也可以直接输出对应的 `type`，例如 `MINIO`、`ALIOSS`、`TENCENTCOS` 等。共享附件处理器会为这些远程类型要求用户选择存储策略。

### 本地附件策略配置

是否允许 `upload` 或 `manual`，由 Provider 注册时的 `localAttachmentStrategies` 决定：

```ts
options: {
  localAttachmentStrategies: ['upload', 'manual']
}
```

如果某个平台只适合自动上传，不适合保留原始路径，例如 Markdown，就应该明确限制为：

```ts
options: {
  localAttachmentStrategies: ['upload']
}
```

### 自定义附件处理提示

如果默认的共享附件说明不够准确，可以通过 `attachmentHandlerDescriptions` 自定义提示文案。Ghost、Typecho、Halo 1.x 都已经这样做了。

如果你的平台对目录选择有强约束，例如“必须保留 `content/images` 这一层级”，就应该把这个要求明确写进这里，而不是只写在外部文档里。

## 共享流程会帮你做什么

当 Provider 成功输出 `MigrateData` 后，共享链路会自动接手后续流程：

### 1. 数据准备

`useMigratePreparation.ts` 会维护以下状态流转：

```text
parsedData
  -> attachment handler result
  -> preparedData
  -> taskGroups
```

其中：

- `parsedData`：Provider 刚解析出来的原始统一结果
- `preparedData`：应用附件策略后的结果
- `taskGroups`：最终要执行的导入任务列表

如果 `attachments` 为空，通常会直接跳过附件处理步骤。

### 2. 用户预处理

在真正执行导入前，`useMigrateTaskRunner.ts` 会调用 `useUserPreprocessor()`，统一处理来源用户与 Halo 用户的匹配关系。

### 3. 本地附件上传预处理

如果用户为本地附件选择了 **上传到 Halo**，任务执行前还会先调用 `useAttachmentPreprocessor()`，根据用户选择的目录上传文件并回写引用。

### 4. 任务执行

`useMigrateTask.ts` 会把 `MigrateData` 映射成任务分组，例如：

- 标签
- 分类
- 文章
- 页面
- 评论 / 回复
- 附件
- 菜单
- 瞬间
- 图库
- 链接

`useMigrateTaskRunner.ts` 再用 `fastq` 按固定并发执行这些任务。  
所以新增 Provider 时，只要你的输出结构符合当前约定，通常不需要自己关心“导入顺序怎么排”。

## 不建议的扩展方式

下面这些做法在当前架构下都不推荐：

- 在 Provider 组件里直接请求 Halo API
- 在 Provider 组件里自己实现导入按钮和执行逻辑
- 把某个平台专属的解析分支塞进 `MigrateView.vue`
- 把来源平台原始结构一路传到共享 composable 再解释
- 为了兼容单个平台，在共享流程里引入大量 `if provider === 'xxx'`

当前代码的维护重点是“平台特有逻辑留在平台目录，共享链路只消费统一结果”。  
只要能守住这个边界，后续再扩展平台时成本会低很多。

## 推荐开发步骤

如果你要新增一个全新的 Provider，建议按下面的顺序推进：

1. 先读懂来源平台的导出格式、内容模型、附件路径和用户模型。
2. 先设计 `MigrateData` 映射，再写 UI，不要一开始就堆组件。
3. 实现 `use-xxx-data-parser.ts`，先保证能稳定输出统一结构。
4. 再实现 `XXXMigrateDataParser.vue`，负责选择文件、调用 parser、展示错误。
5. 注册到 `ui/src/modules/index.ts`。
6. 如果有本地附件，再补齐 `attachmentFolderPath`、附件策略和说明文案。
7. 最后补测试与文档。

## 测试建议

新增 Provider 后，至少应该补三类验证：

1. **解析测试**：给定来源样例，断言输出的 `MigrateData` 结构正确。
2. **边界测试**：空文件、坏数据、缺字段、异常评论层级、异常附件路径等。
3. **类型与基础质量检查**：确保不会破坏现有前端构建链路。

当前前端常用命令：

```bash
cd ui
pnpm test:unit
pnpm type-check
pnpm lint
```

如果只是改文档，则使用：

```bash
cd docs
pnpm docs:build
```

## 一个最小可用的新增 Provider 清单

在提交前，可以用下面这份清单快速自查：

- 已在 `ui/src/modules/index.ts` 注册 Provider
- 已创建 `ui/src/modules/<provider>/` 目录
- 解析组件支持 `v-model:data`
- 解析组件暴露了 `reset()`
- 解析逻辑最终输出 `MigrateData`
- 文章 / 页面 / 评论 / 附件路径都已完成归一化
- 如有用户归属，已输出 `users` 与 `ownerRef`
- 如有本地附件，已配置 `attachmentFolderPath`
- 如有特殊附件说明，已配置 `attachmentHandlerDescriptions`
- 已补对应测试
- 已补该平台的迁移文档

如果以上几点都满足，这个平台通常就已经接入到了当前插件的正确扩展链路中。
