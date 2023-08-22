import { fileURLToPath, URL } from "url";

import { defineConfig } from "vite";
import Vue from "@vitejs/plugin-vue";
import Icons from "unplugin-icons/vite";

export default ({ mode }: { mode: string }) => {
  const isProduction = mode === "production";
  const outDir = isProduction
    ? "../src/main/resources/console"
    : "../build/resources/main/console";

  return defineConfig({
    plugins: [Vue(), Icons({ compiler: "vue3" })],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      minify: isProduction,
      outDir,
      emptyOutDir: true,
      lib: {
        entry: "src/index.ts",
        name: "PluginMigrate",
        formats: ["iife"],
        fileName: () => "main.js",
      },
      rollupOptions: {
        external: [
          "vue",
          "vue-router",
          "@halo-dev/shared",
          "@halo-dev/components",
          "@vueuse/core",
        ],
        output: {
          globals: {
            vue: "Vue",
            "vue-router": "VueRouter",
            "@vueuse/core": "VueUse",
            "@halo-dev/components": "HaloComponents",
            "@halo-dev/console-shared": "HaloConsoleShared",
          },
        },
      },
    },
    define: {
      "process.env": {},
    },
  });
};
