// vite.config.ts
import { defineConfig } from "file:///home/allan/Documents/bsky-copilot2/bsky-copilot/node_modules/vite/dist/node/index.js";
import { getDirname } from "file:///home/allan/Documents/bsky-copilot2/bsky-copilot/node_modules/@adonisjs/core/build/src/helpers/main.js";
import inertia from "file:///home/allan/Documents/bsky-copilot2/bsky-copilot/node_modules/@adonisjs/inertia/build/src/plugins/vite.js";
import { svelte } from "file:///home/allan/Documents/bsky-copilot2/bsky-copilot/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import adonisjs from "file:///home/allan/Documents/bsky-copilot2/bsky-copilot/node_modules/@adonisjs/vite/build/src/client/main.js";
import { sveltePreprocess } from "file:///home/allan/Documents/bsky-copilot2/bsky-copilot/node_modules/svelte-preprocess/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///home/allan/Documents/bsky-copilot2/bsky-copilot/vite.config.ts";
var vite_config_default = defineConfig({
  plugins: [inertia({ ssr: { enabled: true, entrypoint: "inertia/app/ssr.ts" } }), svelte({
    compilerOptions: { hydratable: true },
    preprocess: [sveltePreprocess({ typescript: true })]
  }), adonisjs({ entrypoints: ["inertia/app/app.ts"], reload: ["resources/views/**/*.edge"] })],
  /**
   * Define aliases for importing modules from
   * your frontend code
   */
  resolve: {
    alias: {
      "~/": `${getDirname(__vite_injected_original_import_meta_url)}/inertia/`,
      "@": `${getDirname(__vite_injected_original_import_meta_url)}/inertia/lib`
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9hbGxhbi9Eb2N1bWVudHMvYnNreS1jb3BpbG90Mi9ic2t5LWNvcGlsb3RcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2FsbGFuL0RvY3VtZW50cy9ic2t5LWNvcGlsb3QyL2Jza3ktY29waWxvdC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9hbGxhbi9Eb2N1bWVudHMvYnNreS1jb3BpbG90Mi9ic2t5LWNvcGlsb3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHsgZ2V0RGlybmFtZSB9IGZyb20gJ0BhZG9uaXNqcy9jb3JlL2hlbHBlcnMnXG5pbXBvcnQgaW5lcnRpYSBmcm9tICdAYWRvbmlzanMvaW5lcnRpYS9jbGllbnQnXG5pbXBvcnQgeyBzdmVsdGUgfSBmcm9tICdAc3ZlbHRlanMvdml0ZS1wbHVnaW4tc3ZlbHRlJ1xuaW1wb3J0IGFkb25pc2pzIGZyb20gJ0BhZG9uaXNqcy92aXRlL2NsaWVudCdcbmltcG9ydCB7IHN2ZWx0ZVByZXByb2Nlc3MgfSBmcm9tICdzdmVsdGUtcHJlcHJvY2Vzcyc7XG5cblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW2luZXJ0aWEoeyBzc3I6IHsgZW5hYmxlZDogdHJ1ZSwgZW50cnlwb2ludDogJ2luZXJ0aWEvYXBwL3Nzci50cycgfSB9KSwgc3ZlbHRlKHtcbiAgICBjb21waWxlck9wdGlvbnM6IHsgaHlkcmF0YWJsZTogdHJ1ZSB9LCBwcmVwcm9jZXNzOiBbc3ZlbHRlUHJlcHJvY2Vzcyh7IHR5cGVzY3JpcHQ6IHRydWUgfSldXG4gIH0sKSwgYWRvbmlzanMoeyBlbnRyeXBvaW50czogWydpbmVydGlhL2FwcC9hcHAudHMnXSwgcmVsb2FkOiBbJ3Jlc291cmNlcy92aWV3cy8qKi8qLmVkZ2UnXSB9KV0sXG5cbiAgLyoqXG4gICAqIERlZmluZSBhbGlhc2VzIGZvciBpbXBvcnRpbmcgbW9kdWxlcyBmcm9tXG4gICAqIHlvdXIgZnJvbnRlbmQgY29kZVxuICAgKi9cbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnfi8nOiBgJHtnZXREaXJuYW1lKGltcG9ydC5tZXRhLnVybCl9L2luZXJ0aWEvYCxcbiAgICAgICdAJzogYCR7Z2V0RGlybmFtZShpbXBvcnQubWV0YS51cmwpfS9pbmVydGlhL2xpYmBcbiAgICB9LFxuXG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFrVSxTQUFTLG9CQUFvQjtBQUMvVixTQUFTLGtCQUFrQjtBQUMzQixPQUFPLGFBQWE7QUFDcEIsU0FBUyxjQUFjO0FBQ3ZCLE9BQU8sY0FBYztBQUNyQixTQUFTLHdCQUF3QjtBQUx1SyxJQUFNLDJDQUEyQztBQVF6UCxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxTQUFTLE1BQU0sWUFBWSxxQkFBcUIsRUFBRSxDQUFDLEdBQUcsT0FBTztBQUFBLElBQ3RGLGlCQUFpQixFQUFFLFlBQVksS0FBSztBQUFBLElBQUcsWUFBWSxDQUFDLGlCQUFpQixFQUFFLFlBQVksS0FBSyxDQUFDLENBQUM7QUFBQSxFQUM1RixDQUFFLEdBQUcsU0FBUyxFQUFFLGFBQWEsQ0FBQyxvQkFBb0IsR0FBRyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU03RixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxNQUFNLEdBQUcsV0FBVyx3Q0FBZSxDQUFDO0FBQUEsTUFDcEMsS0FBSyxHQUFHLFdBQVcsd0NBQWUsQ0FBQztBQUFBLElBQ3JDO0FBQUEsRUFFRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
