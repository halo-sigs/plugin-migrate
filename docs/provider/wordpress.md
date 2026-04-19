# WordPress 数据迁移指引

## 介绍

本指引提供了从 `WordPress` 迁移至 `Halo 2.x` 的方案。

## 注意事项

1. 通过 WordPress 后台导出的 WXR 文件（XML）进行迁移。
2. 当前开发与回归测试主要基于仓库中的 WordPress `6.9.4` 导出样例，WXR 版本为 `1.2`。
3. 当前主要支持迁移 **文章**、**页面**、**分类**、**标签**、**评论**、**附件**。部分插件或主题生成的自定义内容类型可能不会导入。
4. 如果 WXR 中包含作者邮箱，导入时会优先按邮箱匹配现有 Halo 用户；未匹配到时会自动创建 `guest` 用户，以尽量保留内容归属。

## 准备工作

1. 在 WordPress 管理后台的 **工具 -> 导出** 菜单中，选择导出 **所有内容**，下载 WXR XML 文件。详细说明可参考 [WordPress 支持页面](https://wordpress.com/zh-cn/support/export/)。
   <!-- TODO: 补图（WordPress）- 后台工具 -> 导出页面，展示导出所有内容 -->
2. 建议同时从服务器备份 `wp-content/uploads` 目录，作为附件迁移备用。
   <!-- TODO: 补图（WordPress）- 服务器中的 wp-content/uploads 目录或打包示意 -->
3. 如果计划手动保留 WordPress 原始附件路径，可提前在 Halo 侧准备目标目录与资源映射：

   ```shell
   mkdir -p {halo-work-dir}/attachments/migrate-from-wp
   ```

   ```yaml
   halo:
     attachment:
       resource-mappings:
         - pathPattern: /wp-content/uploads/**
           locations:
             - migrate-from-wp
   ```

4. 如果希望旧的 WordPress 绝对链接继续可用，还需要将 Halo 的 `HALO_EXTERNAL_URL` 配置为原 WordPress 域名。
5. 建议先在本地环境完成一轮完整导入测试，再考虑在生产环境执行。这样更方便快速重试和定位问题，也能避免线上因频繁请求后端、上传附件而出现导入变慢或部分失败；本地验证通过后，还可以结合 Halo 的备份恢复能力更快完成线上恢复或回滚。

## 执行迁移

1. 点击左侧菜单的迁移进入迁移页面。
2. 在选择渠道步骤中，选择 **WordPress**，点击下一步。
   <!-- TODO: 补图（WordPress）- 迁移首页选择 WordPress Provider -->
3. 选择从 WordPress 后台导出的 WXR 文件（XML 格式）。
   <!-- TODO: 补图（WordPress）- 上传 WXR XML 文件的界面 -->
4. 等待系统解析文章、页面、分类、标签、评论、作者归属及附件引用。
5. 如果检测到本地附件：
   - 选择 **上传到 Halo** 时，可选择 WordPress 站点根目录、`wp-content` 目录、`uploads` 目录，或包含这些目录的任意上级目录。
   - 选择 **手动迁移** 时，需要先将备份的 `uploads` 内容放到 `{halo-work-dir}/attachments/migrate-from-wp`，并确认资源映射已生效。
   <!-- TODO: 补图（WordPress）- 附件处理步骤，展示上传到 Halo / 手动迁移 -->
6. 确认数据概览无误后，进入下一步并开始迁移。
   <!-- TODO: 补图（WordPress）- 数据概览或任务确认页面 -->
7. 迁移完成后，建议优先抽样检查文章中的图片、封面图和评论归属是否符合预期。
