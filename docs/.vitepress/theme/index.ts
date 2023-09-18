import DefaultTheme from "vitepress/theme";
import { onMounted, watch, nextTick } from "vue";
import "./custom.css";
import mediumZoom from "medium-zoom";
import { useRoute } from "vitepress/client";

export default {
  ...DefaultTheme,

  setup() {
    const route = useRoute();
    const initZoom = () => {
      mediumZoom("[data-zoomable]", { background: "var(--vp-c-bg)" });
    };
    onMounted(() => {
      initZoom();
    });
    watch(
      () => route.path,
      () => nextTick(() => initZoom())
    );
  },
};
