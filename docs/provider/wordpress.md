# WordPress 数据迁移指引

本指引提供了从 `Wordpress` 迁移至 `Halo 2.x` 的方案。

## 导出 WordPress WXR 文件

在 WordPress 管理后台的 **工具-导出** 菜单中，选择导出 **所有内容** 来导出你的 WordPress 数据，下载导出的文件后会得到一个 XML 文件。（有关详细信息可以查看 [WordPress 支持页面](https://wordpress.com/zh-cn/support/export/) ）

## 附件迁移

在 WordPress 部署服务器后台，找到附件存储目录，例如 **/wordpress_path/blog.halo.run/wp-content**，打包该目录下的 **upload** 目录。

```cmd
tar -czvf upload.tgz uploads/
```

通过上述命令可以将 **uploads** 目录打包为 upload.tgz 文件。将得到的 upload.tgz 文件拷贝到新的 Halo 服务器上，并在 Halo 工作目录下的 attachments 目录中创建与上一步配置的路由规则对应的 migrate-from-wp 子目录。

```
mkdir -p {halo-work-dir}/attachments/migrate-from-wp
```

将 upload.tgz 中的文件解压到上述目录中。

```
cd {halo-work-dir}/attachments/migrate-from-wp
tar --strip-components 1 -zxvf /path/to/upload.tgz
```

将会得到如下所示的目录

```
{halo-work-dir}/attachments
├── migrate-from-wp
│   ├── 2011
│   ├── 2015
│   ├── 2016
│   ├── 2017
│   ├── 2018
│   ├── 2019
│   ├── 2020
│   ├── 2021
│   ├── 2022
│   ├── elementor
│   ├── wpforms
│   └── wp-import-export-lite
└── upload
    └── local
```

## 修改 Halo 配置

在 Halo 配置文件中增加如下配置，通过该配置，用户在 **{halo-work-dir}/attachments/migrate-from-wp/** \*/ 上传文件后，可以通过 **{HALO_EXTERNAL_URL}/wp-content/uploads/{文件名}** 访问到该文件，与 WordPress 中的附件链接规则一致。

```yaml
halo:
  attachment:
    resource-mappings:
      - pathPattern: /wp-content/uploads/**
        locations:
          - migrate-from-wp
```

同时，修改 Halo 的 **HALO_EXTERNAL_URL** 配置，与原本的 WordPress 域名保持一致，例如 https://blog.halo.run。

## 迁移

1. 点击左侧菜单的迁移进入迁移页面。
2. 在选择渠道步骤中，选择 **WordPress**，点击下一步。
3. 在导入数据步骤中，点击 **选择文件** 按钮，选择在 WordPress 导出的 WXR 数据文件（XML 格式），之后点击下一步。
4. 如果存在需要迁移的附件，则会出现 **设置附件存储策略** 步骤，选择本地至本地即可，完成之后点击下一步。
5. 在待迁移数据步骤中，可以再次审查待迁移的数据，审查结束后点击 **执行导入** 后，耐心等待即可，数据迁移完成后会有弹窗进行提示。
