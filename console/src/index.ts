import { definePlugin, BasicLayout } from "@halo-dev/console-shared";
import DefaultView from "./views/DefaultView.vue";
import { IconGrid } from "@halo-dev/components";
import "./styles/index.css";

export default definePlugin({
  name: "PluginMigrate",
  components: [],
  routes: [
    {
      path: "/hello-world",
      component: BasicLayout,
      children: [
        {
          path: "",
          name: "HelloWorld",
          component: DefaultView,
          meta: {
            permissions: ["plugin:apples:view"],
          },
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
          path: "/hello-world",
          icon: IconGrid,
        },
      ],
    },
  ],
  extensionPoints: {},
  activated() {},
  deactivated() {},
});
