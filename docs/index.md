# plugin-migrate

支持多种平台的数据迁移，目前已支持：

1. Halo 1.5 / 1.6
2. WordPress
3. RSS / Atom 订阅链接

## 使用方式

1. 下载，目前提供以下两个下载方式：
    - GitHub Releases：访问 [Releases](https://github.com/halo-sigs/plugin-migrate/releases) 下载 Assets 中的 JAR 文件。
    - Halo 应用市场：<https://halo.run/store/apps/app-TlUBt>
2. 安装，插件安装和更新方式可参考：<https://docs.halo.run/user-guide/plugins>
3. 启动插件之后，即可在 Console 的左侧菜单栏看到**迁移**的菜单。

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
