# Markdown 数据迁移指引

## 介绍

本指引提供了从 Markdown 静态博客内容迁移至 `Halo 2.x` 的方案，适用于各类基于 Markdown + Front Matter 的内容目录导入场景。

## 注意事项

1. 当前仅支持通过 **目录** 导入 Markdown 内容，目录中可以包含多篇文章、页面及其资源文件。
2. 支持 YAML、TOML、JSON Front Matter。
3. 目前主要解析 `title`、`slug`、`excerpt/description/summary`、`categories/category`、`tags/tag`、`date/publishDate/published/created/createdAt`、`draft` 等常见字段。
4. 支持 `cover`、`thumbnail`、`feature_image`、`featured_image`、`featureImage`、`featuredImage` 等封面字段，并会写入 Halo 的文章或页面封面。
5. 默认按文章导入，仅在 Front Matter 明确指定 `type/layout/kind=page` 时导入为单页。
6. 系统会扫描 Markdown 正文、嵌入式 HTML 和 Front Matter 封面中的本地资源引用，并在下一步统一上传后替换链接。
7. 当前仅提供 **本地上传** 附件策略，不提供保留原始路径的手动迁移模式。
8. Halo 2 默认没有内置 Markdown 编辑器。如果后续需要重新编辑导入后的 Markdown 文章，需要额外安装 Markdown 编辑器插件，例如 StackEdit 或 ByteMD。
9. 本插件使用独立的 Markdown 解析器，渲染效果可能和原站点以及 Halo 中安装的编辑器存在差异。

## 准备工作

1. 整理需要迁移的 Markdown 内容目录，确保文章、页面和资源文件仍保留原有相对路径关系。
   <!-- TODO: 补图（Markdown）- 示例内容目录结构，展示 markdown 文件与资源文件关系 -->
2. 如正文或封面引用了本地图片、附件，建议提前确认这些文件仍在目录内或位于可一起选择的资源目录中。
3. 如使用了较多自定义 Front Matter 字段，建议先抽样检查几篇文档，确认关键字段命名与当前支持范围一致。
   <!-- TODO: 补图（Markdown）- 示例 Front Matter，突出 title/tags/categories/cover 等字段 -->
4. 建议先在本地环境完成一轮完整导入测试，再考虑在生产环境执行。这样更方便快速重试和定位问题，也能避免线上因频繁请求后端、上传附件而出现导入变慢或部分失败；本地验证通过后，还可以结合 Halo 的备份恢复能力更快完成线上恢复或回滚。

## 执行迁移

1. 点击左侧菜单的迁移进入迁移页面。
2. 在选择渠道步骤中，选择 **Markdown**，点击下一步。
   <!-- TODO: 补图（Markdown）- 迁移首页选择 Markdown Provider -->
3. 选择包含 Markdown 文件的目录，系统会自动筛选其中的 `.md`、`.markdown` 等文档文件。
   <!-- TODO: 补图（Markdown）- 选择 Markdown 目录的界面 -->
4. 等待系统解析文章、页面、分类、标签、封面和本地资源引用。
5. 如果检测到本地图片或附件，在下一步选择资源所在目录，系统会自动上传并替换正文、封面中的本地链接。
   <!-- TODO: 补图（Markdown）- 附件目录选择或资源匹配步骤 -->
6. 确认数据概览无误后，进入下一步并开始迁移。
   <!-- TODO: 补图（Markdown）- 数据概览或任务确认页面 -->
7. 如果原始站点使用了特定的 Markdown 扩展语法或主题级短代码，迁移后建议抽样检查渲染结果。
