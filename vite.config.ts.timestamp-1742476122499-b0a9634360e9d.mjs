// vite.config.ts
import { defineConfig } from "file:///home/allan/Documents/bsky-copilot2/Bluesky-copilot/node_modules/vite/dist/node/index.js";
import { getDirname } from "file:///home/allan/Documents/bsky-copilot2/Bluesky-copilot/node_modules/@adonisjs/core/build/src/helpers/main.js";
import inertia from "file:///home/allan/Documents/bsky-copilot2/Bluesky-copilot/node_modules/@adonisjs/inertia/build/src/plugins/vite.js";
import { svelte } from "file:///home/allan/Documents/bsky-copilot2/Bluesky-copilot/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import adonisjs from "file:///home/allan/Documents/bsky-copilot2/Bluesky-copilot/node_modules/@adonisjs/vite/build/src/client/main.js";
import { sveltePreprocess } from "file:///home/allan/Documents/bsky-copilot2/Bluesky-copilot/node_modules/svelte-preprocess/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///home/allan/Documents/bsky-copilot2/Bluesky-copilot/vite.config.ts";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9hbGxhbi9Eb2N1bWVudHMvYnNreS1jb3BpbG90Mi9CbHVlc2t5LWNvcGlsb3RcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2FsbGFuL0RvY3VtZW50cy9ic2t5LWNvcGlsb3QyL0JsdWVza3ktY29waWxvdC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9hbGxhbi9Eb2N1bWVudHMvYnNreS1jb3BpbG90Mi9CbHVlc2t5LWNvcGlsb3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHsgZ2V0RGlybmFtZSB9IGZyb20gJ0BhZG9uaXNqcy9jb3JlL2hlbHBlcnMnXG5pbXBvcnQgaW5lcnRpYSBmcm9tICdAYWRvbmlzanMvaW5lcnRpYS9jbGllbnQnXG5pbXBvcnQgeyBzdmVsdGUgfSBmcm9tICdAc3ZlbHRlanMvdml0ZS1wbHVnaW4tc3ZlbHRlJ1xuaW1wb3J0IGFkb25pc2pzIGZyb20gJ0BhZG9uaXNqcy92aXRlL2NsaWVudCdcbmltcG9ydCB7IHN2ZWx0ZVByZXByb2Nlc3MgfSBmcm9tICdzdmVsdGUtcHJlcHJvY2Vzcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtpbmVydGlhKHsgc3NyOiB7IGVuYWJsZWQ6IHRydWUsIGVudHJ5cG9pbnQ6ICdpbmVydGlhL2FwcC9zc3IudHMnIH0gfSksIHN2ZWx0ZSh7XG4gICAgY29tcGlsZXJPcHRpb25zOiB7IGh5ZHJhdGFibGU6IHRydWUgfSwgcHJlcHJvY2VzczogW3N2ZWx0ZVByZXByb2Nlc3MoeyB0eXBlc2NyaXB0OiB0cnVlIH0pXVxuICB9LCksIGFkb25pc2pzKHsgZW50cnlwb2ludHM6IFsnaW5lcnRpYS9hcHAvYXBwLnRzJ10sIHJlbG9hZDogWydyZXNvdXJjZXMvdmlld3MvKiovKi5lZGdlJ10gfSldLFxuXG4gIC8qKlxuICAgKiBEZWZpbmUgYWxpYXNlcyBmb3IgaW1wb3J0aW5nIG1vZHVsZXMgZnJvbVxuICAgKiB5b3VyIGZyb250ZW5kIGNvZGVcbiAgICovXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ34vJzogYCR7Z2V0RGlybmFtZShpbXBvcnQubWV0YS51cmwpfS9pbmVydGlhL2AsXG4gICAgICAnQCc6IGAke2dldERpcm5hbWUoaW1wb3J0Lm1ldGEudXJsKX0vaW5lcnRpYS9saWJgXG4gICAgfSxcblxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMlUsU0FBUyxvQkFBb0I7QUFDeFcsU0FBUyxrQkFBa0I7QUFDM0IsT0FBTyxhQUFhO0FBQ3BCLFNBQVMsY0FBYztBQUN2QixPQUFPLGNBQWM7QUFDckIsU0FBUyx3QkFBd0I7QUFMNkssSUFBTSwyQ0FBMkM7QUFPL1AsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsU0FBUyxNQUFNLFlBQVkscUJBQXFCLEVBQUUsQ0FBQyxHQUFHLE9BQU87QUFBQSxJQUN0RixpQkFBaUIsRUFBRSxZQUFZLEtBQUs7QUFBQSxJQUFHLFlBQVksQ0FBQyxpQkFBaUIsRUFBRSxZQUFZLEtBQUssQ0FBQyxDQUFDO0FBQUEsRUFDNUYsQ0FBRSxHQUFHLFNBQVMsRUFBRSxhQUFhLENBQUMsb0JBQW9CLEdBQUcsUUFBUSxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNN0YsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsTUFBTSxHQUFHLFdBQVcsd0NBQWUsQ0FBQztBQUFBLE1BQ3BDLEtBQUssR0FBRyxXQUFXLHdDQUFlLENBQUM7QUFBQSxJQUNyQztBQUFBLEVBRUY7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
