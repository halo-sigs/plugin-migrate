import { Provider } from "@/types";
import { defineAsyncComponent } from "vue";

// 新增的迁移数据来源，需要在此处进行注册
export const providerItems: Provider[] = [
  {
    name: "Halo",
    icon: "https://halo.run/logo",
    description: "Halo 1.5, 1.6 数据迁移",
    importComponent: defineAsyncComponent(
      () => import("./halo/HaloMigrateDataParser.vue")
    ),
    options: {
      attachmentFolderPath: "migrate-from-1.x",
    },
  },
  {
    name: "WordPress",
    icon: "https://s.w.org/images/wmark.png",
    description: "WordPress WXR 数据迁移",
    importComponent: defineAsyncComponent(
      () => import("./wordpress/WordPressMigrateDataParser.vue")
    ),
    options: {
      attachmentFolderPath: "migrate-from-wp",
    },
  },
  {
    name: "RSS",
    icon: "https://raw.githubusercontent.com/github/explore/44746728c4b7718fb01d3b32ed2ce9c4e0fdd887/topics/rss/rss.png",
    description: "基于 RSS 订阅文件的数据迁移",
    importComponent: defineAsyncComponent(
      () => import("./rss/RssMigrateDataParser.vue")
    ),
  },
];
