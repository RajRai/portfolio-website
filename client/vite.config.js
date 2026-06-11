import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const posthogProxyPath = "/_relay";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:5174",
      [posthogProxyPath]: "http://localhost:5174",
    },
  },
});
