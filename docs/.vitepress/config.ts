import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "HaloPluginMigrate",
  description: "多平台迁移至 Halo 2.x 的迁移插件使用文档",
  head: [["link", { rel: "icon", href: "/favicon.ico" }]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [{ text: "Home", link: "/" }],

    sidebar: [
      {
        text: "Provider",
        items: [
          { text: "Halo 1.x", link: "/provider/halo" },
          { text: "WordPress", link: "/provider/wordpress" },
          { text: "Rss", link: "/provider/rss" },
        ],
      },
      {
        text: "扩展",
        items: [
          { text: "扩展可迁移平台", link: "/expand/provider" },
          { text: "扩展迁移步骤", link: "/expand/steps" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/halo-sigs/plugin-migrate" },
    ],
  },
});
