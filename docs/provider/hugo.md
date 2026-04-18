# Markdown 数据迁移指引

本指引提供了从 Markdown 静态博客内容迁移至 `Halo 2.x` 的方案，适用于 [`Hugo`](https://gohugo.io/)、Hexo 以及其他基于 Markdown + Front Matter 的静态博客生成器。

## 注意事项

Markdown 静态博客的差异主要集中在目录组织和 Front Matter 字段上。本插件不尝试完整还原各个平台的构建逻辑，而是只解析 Markdown 正文、本地资源引用和常见元数据。注意：

1. 支持选择单个 Markdown 文件，或直接选择包含 Markdown 文件的目录。
2. 支持 YAML、TOML、JSON Front Matter。
3. 目前主要解析 `title`、`slug`、`excerpt/description/summary`、`categories/category`、`tags/tag`、`date/publishDate/published/created/createdAt`、`draft` 等常见字段。
4. 默认按文章导入，仅在 Front Matter 明确指定 `type/layout/kind=page` 时导入为单页。
5. 仅处理文档内容和本地资源引用，不解析平台配置文件或主题模板。
6. 如果正文中引用了本地图片或附件，可以在下一步选择附件目录自动上传并替换链接，或者选择手动迁移。
7. 本插件使用独立的 Markdown 解析器，渲染效果可能和原站点以及 Halo 中安装的编辑器存在差异。

## 迁移

1. 点击左侧菜单的迁移进入迁移页面。
2. 在选择渠道步骤中，选择 **Markdown**，点击下一步。
3. 选择单个 Markdown 文件，或选择包含 Markdown 文件的目录。
4. 等待系统解析文章、页面、分类、标签和本地资源引用。
5. 如果正文中包含本地图片或附件，可在下一步选择附件目录，系统会自动上传并替换链接；或者选择手动迁移，仅创建附件记录。
6. 确认数据概览无误后，进入下一步并开始迁移。
