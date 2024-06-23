import { definePlugin } from "@halo-dev/console-shared";
import { markRaw } from "vue";
import SolarTransferHorizontalBoldDuotone from "~icons/solar/transfer-horizontal-bold-duotone";
import "./styles/tailwind.css";
import MigrateView from "./views/MigrateView.vue";

export default definePlugin({
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
              permissions: ["plugin:PluginMigrate:migrate"],
              menu: {
                name: "迁移",
                group: "tool",
                icon: markRaw(SolarTransferHorizontalBoldDuotone),
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
