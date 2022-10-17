import { definePlugin, BasicLayout } from "@halo-dev/console-shared";
import MigrateView from "./views/MigrateView.vue";
import { IconGrid } from "@halo-dev/components";

export default definePlugin({
  name: "PluginMigrate",
  components: [],
  routes: [
    {
      path: "/migrate",
      component: BasicLayout,
      children: [
        {
          path: "",
          name: "Migrate",
          component: MigrateView,
        },
      ],
    },
  ],
  menus: [
    {
      name: "系统",
      items: [
        {
          name: "数据迁移",
          path: "/migrate",
          icon: IconGrid,
        },
      ],
    },
  ],
  extensionPoints: {},
});
