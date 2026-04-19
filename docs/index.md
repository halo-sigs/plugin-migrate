# plugin-migrate

支持从其他平台迁移数据到 Halo 的插件。

![Screenshot](/img/screenshot.png)

目前已支持以下平台：

1. Halo 1.5 / 1.6
2. [WordPress](https://wordpress.org/)
3. [Ghost](https://ghost.org/)
4. [Typecho](https://github.com/typecho/typecho)
5. RSS / Atom 订阅文件或订阅链接
6. Markdown（适用于 Markdown + Front Matter 静态博客内容导入）

## 通用迁移说明

1. 每个平台都有独立的数据解析界面，但最终都会转换为统一的导入任务并按同一套流程执行。
2. 大多数平台都支持统一的附件处理步骤：自动上传本地附件或按原始路径手动迁移；Markdown 仅支持自动上传，RSS / Atom 则保留原始远程链接。
3. 对包含邮箱的来源用户，系统会在开始导入时优先匹配已有 Halo 用户；未匹配到时会自动创建 `guest` 用户，并尽量保留文章、页面、评论的归属关系。
4. Markdown 导入支持 YAML / TOML / JSON Front Matter，可识别标题、摘要、分类、标签、发布时间、页面类型，以及 `cover` / `thumbnail` / `feature_image` 等常见封面字段。

## 使用方式

1. 下载，目前提供以下两个下载方式：
    - GitHub Releases：访问 [Releases](https://github.com/halo-sigs/plugin-migrate/releases) 下载 Assets 中的 JAR 文件。
    - Halo 应用市场：<https://halo.run/store/apps/app-TlUBt>
2. 安装，插件安装和更新方式可参考：<https://docs.halo.run/user-guide/plugins>
3. 启动插件之后，即可在 Console 的左侧菜单栏看到 **迁移** 的菜单。

## 开发环境

插件开发的详细文档请查阅：<https://docs.halo.run/developer-guide/plugin/introduction>

所需环境：

1. Java 21
2. Node 24
3. pnpm 10
4. Docker (可选)

克隆项目：

```bash
git clone git@github.com:halo-sigs/plugin-migrate.git

# 或者当你 fork 之后

git clone git@github.com:{your_github_id}/plugin-migrate.git
```

```bash
cd path/to/plugin-migrate
```

### 运行方式（推荐）

> 此方式需要本地安装 Docker

```bash
# macOS / Linux
./gradlew pnpmInstall

# Windows
./gradlew.bat pnpmInstall
```

```bash
# macOS / Linux
./gradlew haloServer

# Windows
./gradlew.bat haloServer
```

执行此命令后，会自动创建一个 Halo 的 Docker 容器并加载当前的插件，更多文档可查阅：<https://docs.halo.run/developer-guide/plugin/basics/devtools>
