import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

async function main() {
  try {
    const server = await createServer({
      configFile: false,
      plugins: [react(), tsconfigPaths()],
      root: "/Users/vladislav/Documents/Maestro/site",
      server: {
        port: 3000,
        host: "0.0.0.0",
      },
    });
    await server.listen();
    console.log("🎸 Maestro Store is listening at:");
    server.printUrls();

    setInterval(() => {}, 1000 * 60 * 60);
  } catch (err) {
    console.error("Vite error:", err);
  }
}
main();
