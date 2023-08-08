import { defineConfig } from "vitepress";
import { Provider } from "@/types";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "迁移插件使用文档",
  description: "多平台迁移至 Halo 2.x 的迁移插件使用文档",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Examples", link: "/markdown-examples" },
    ],

    sidebar: [
      {
        text: "Provider",
        items: [
          { text: "Halo 1.x", link: "/provider/halo.md" },
          { text: "WordPress", link: "/provider/wordpress.md" },
          { text: "Rss", link: "/provider/rss.md" },
        ],
      }
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
