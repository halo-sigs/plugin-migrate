import type { Provider } from "@/types";
import { defineAsyncComponent } from "vue";
import wordpress from "@/assets/wordpress.svg";
import rss from "@/assets/rss.svg";
import atom from "@/assets/atom.svg";

// 新增的迁移数据来源，需要在此处进行注册
export const providerItems: Provider[] = [
  {
    name: "Halo",
    icon: "https://halo.run/logo",
    description: "Halo 1.5 / 1.6 数据迁移",
    importComponent: defineAsyncComponent(
      () => import("./halo/HaloMigrateDataParser.vue")
    ),
    options: {
      attachmentFolderPath: "migrate-from-1.x",
    },
  },
  {
    name: "WordPress",
    icon: wordpress,
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
    icon: rss,
    description: "基于 RSS 订阅文件的数据迁移",
    importComponent: defineAsyncComponent(
      () => import("./rss/RssMigrateDataParser.vue")
    ),
  },
  {
    name: "Atom Feed",
    icon: atom,
    description: "基于 Atom Feed 订阅文件的数据迁移",
    importComponent: defineAsyncComponent(
      () => import("./atom/AtomMigrateDataParser.vue")
    ),
  },
];
