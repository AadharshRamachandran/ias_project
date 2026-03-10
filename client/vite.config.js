import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    define: {
        // Expose environment variables from root .env to the application
        // Maps PINATA_* to VITE_PINATA_* for client-side access
        "import.meta.env.VITE_PINATA_API_KEY": JSON.stringify(
            process.env.PINATA_API_KEY || process.env.VITE_PINATA_API_KEY || ""
        ),
        "import.meta.env.VITE_PINATA_API_SECRET": JSON.stringify(
            process.env.PINATA_API_SECRET || process.env.VITE_PINATA_API_SECRET || ""
        ),
        "import.meta.env.VITE_PINATA_GATEWAY": JSON.stringify(
            process.env.PINATA_GATEWAY || process.env.VITE_PINATA_GATEWAY || "https://gateway.pinata.cloud"
        ),
    },
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "http://localhost:3001",
                changeOrigin: true,
            },
        },
    },
    resolve: {
        alias: {
            process: "process/browser",
        },
    },
});
