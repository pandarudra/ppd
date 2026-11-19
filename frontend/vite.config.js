import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          map: ["d3-geo", "topojson-client", "world-atlas/land-110m.json"],
        },
      },
    },
  },
  test: { environment: "jsdom", globals: true, setupFiles: "./src/test-setup.js" },
  server: {
    host: true,
    port: 5173,
  },
});
