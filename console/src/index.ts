import { definePlugin } from "@halo-dev/console-shared";
import MigrateView from "./views/MigrateView.vue";
import { IconGrid } from "@halo-dev/components";
import { markRaw } from "vue";

export default definePlugin({
  name: "PluginMigrate",
  components: [],
  routes: [
    {
      parentName: "Root",
      route: {
        path: "/migrate",
        children: [
          {
            path: "",
            name: "Migrate",
            component: MigrateView,
            meta: {
              title: "迁移",
              searchable: true,
              menu: {
                name: "迁移",
                group: "tool",
                icon: markRaw(IconGrid),
                priority: 0,
              },
            },
          },
        ],
      },
    },
  ],
  extensionPoints: {},
});
