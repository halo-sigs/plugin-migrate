# plugin-migrate

支持从 Halo 1.5/1.6 迁移数据

## 开发环境

```bash
git clone git@github.com:halo-sigs/plugin-migrate.git

# 或者当你 fork 之后

git clone git@github.com:{your_github_id}/plugin-migrate.git
```

```bash
cd path/to/plugin-migrate
```

```bash
# macOS / Linux
./gradlew pnpmInstall

# Windows
./gradlew.bat pnpmInstall
```

```bash
# macOS / Linux
./gradlew build

# Windows
./gradlew.bat build
```

修改 Halo 配置文件：

```yaml
halo:
  plugin:
    runtime-mode: development
    classes-directories:
      - "build/classes"
      - "build/resources"
    lib-directories:
      - "libs"
    fixedPluginPath:
      - "/path/to/plugin-migrate"
```

## 使用方式

1. 在 [Releases](https://github.com/halo-sigs/plugin-migrate/releases) 下载最新的 JAR 文件。
2. 在 Halo 后台的插件管理上传 JAR 文件进行安装。
3. 启动插件之后，即可在 Console 的左侧菜单栏看到迁移的菜单。

> **Warning**
> 详细的迁移文档请查阅 <https://docs.halo.run/getting-started/migrate-from-1.x>
