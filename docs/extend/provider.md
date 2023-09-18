# 扩展可迁移平台

若您使用的平台不在当前支持的平台内，则可通过扩展迁移平台的方式来支持。

迁移插件并不强行置顶目标平台的导入方式，由扩展点决定如何进行导入及处理数据，迁移插件只关心最终数据。

## 扩展方式

每个平台都应当有至少一种导入数据的方式，例如从文件中导入、远程导入等，因此需要对导入数据进行自定义扩展。

以 Halo 1.x 平台迁移为例。

1. 前往 `console/src/modules` 中新建一个名为 **halo** 的文件夹。
2. 在新建的文件夹中，创建一个 `vue` 文件，用于展示导入数据的界面以及处理、转换导入的数据，如 `HaloMigrateDataParser.vue` 文件。
3. 编写 `HaloMigrateDataParser.vue` 文件，此 vue 模板接收一个 [MigrateData](#migratedata) 类型的数据，用户最终解析完成导入数据后，需要更新此数据以进行下一步操作。后续操作将基于 **MigrateData** 进行。例如

   ```ts
   defineProps<{
     data: MigrateData;
   }>();

   const emit = defineEmits<{
     (event: "update:data", value: MigrateData): void;
   }>();

   /**
    * 必要操作：处理数据处理完成之后，触发 update:data 事件来更新 data。
    */
   const handleDataChange = (data: MigrateData) => {
     emit("update:data", data);
   };
   ```

4. 在 **console/src/modules** 目录下的 **index.ts** 文件中，为 `providerItems` 新增一个 [Provider](#provider) 对象，例如

   ```json
   {
     name: "Halo",
     icon: "https://halo.run/logo",
     description: "Halo 1.5 / 1.6 数据迁移",
     importComponent: defineAsyncComponent(
       () => import("./halo/HaloMigrateDataParser.vue") // 扩展文件
     ),
     options: {
       attachmentFolderPath: "migrate-from-1.x", // 附件迁移文件夹
     }
   }
   ```

## MigrateData

```ts
interface MigrateData {
  tags?: MigrateTag[];

  categories?: MigrateCategory[];

  posts?: MigratePost[];

  pages?: MigrateSinglePage[];

  comments?: (MigrateComment | MigrateReply)[];

  menuItems?: MigrateMenu[];

  moments?: MigrateMoment[];

  photos?: MigratePhoto[];

  links?: MigrateLink[];

  attachments?: MigrateAttachment[];
}
```

## Provider

```ts
interface Provider {
  name: string;
  icon: string;
  description: string;
  importComponent?: string | Component;
  options?: MigrationOption;
}
```
