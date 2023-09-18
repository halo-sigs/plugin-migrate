# 扩展迁移步骤

若目前迁移插件的步骤不符合目标 Provider，或者想对迁移增加一些新的功能，例如筛选、进度条等，可以对迁移步骤进行扩展。扩展迁移步骤前，需要注意如下问题：

1. `选择渠道` 步骤建议保持首位。
2. 若新增所有 Provider 都会具有的步骤，则需要测试当前所有已拥有的 Provider。

## 扩展方式

1. 在 `console/src/view/MigrateView.vue` 文件中，找到 **stepItems** 属性，为其新增 [Step](#step) 字段，以 设置附件存储策略 为例如下所示：

   ```ts
   {
     key: "attachmentPolicy", // step item slot
     name: "设置附件存储策略", // 步骤名称，将会展示在步骤条上
     next: { // 下一步按钮设置
       disabled: computed(() => { // 是否禁止下一步
         return policyMap.value.size === 0;
       }),
       disabledMessage: "未设置附件存储策略", // 无法进行下一步时，出现的提示
     },
     visible: computed(() => { // 在步骤条中展示当前步骤的条件
       return migrateData.value ? .attachments != undefined;
     }),
   }
   ```

2. 设置完上述步骤属性之后，还需要增加目标步骤的界面，在 **MigrateView.vue** 文件中，找到 `Steps` 组件，新建例如 attachmentPolicy 的 slot content，如下所示

   ```vue
   <template #attachmentPolicy>
     <div>...</div>
   </template>
   ```

在其中编写页面模板及代码逻辑即可。

## Step

```ts
interface Step {
  key: string;
  name: string;
  description?: string;
  next?: StepButtonItem;
  prev?: StepButtonItem;
  visible?: ComputedRef;
}
```
