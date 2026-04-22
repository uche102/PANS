import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/admin/",

  plugins: [
    react({
      // 2. Configure the React Compiler inside the react plugin options

      babel: {
        plugins: [
          [
            "babel-plugin-react-compiler",
            {
              /* options */
            },
          ],
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5000,
    strictPort: true,
  },
});
