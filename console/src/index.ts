import { definePlugin } from "@halo-dev/console-shared";
import ProviderSelectView from "./views/ProviderSelectView.vue";
import { markRaw } from "vue";
import MdiCogTransferOutline from "~icons/mdi/cog-transfer-outline";
import "./styles/tailwind.css";

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
            component: ProviderSelectView,
            meta: {
              title: "迁移",
              searchable: true,
              menu: {
                name: "迁移",
                group: "tool",
                icon: markRaw(MdiCogTransferOutline),
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
