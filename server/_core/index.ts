import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ensureRootAccount } from "../auth/rootBootstrap";
import { processMercadoPagoWebhook, resolveMercadoPagoNotificationDataId } from "../mercadoPago";
import { weeklyResetHandler } from "../weeklyReset";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  await ensureRootAccount();
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    // A prévia ROOT é carregada pela mesma origem; as demais páginas seguem sem poder ser incorporadas.
    const isSameOriginStorefrontPreview = req.path === "/" && req.query.preview === "storefront";
    res.setHeader("X-Frame-Options", isSameOriginStorefrontPreview ? "SAMEORIGIN" : "DENY");
    res.setHeader("Content-Security-Policy", isSameOriginStorefrontPreview ? "frame-ancestors 'self'" : "frame-ancestors 'none'");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    next();
  });
  // O limite cobre os uploads de imagem permitidos (até 4 MB) sem aceitar cargas desnecessariamente grandes.
  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ limit: "8mb", extended: true }));
  registerStorageProxy(app);
  app.post("/api/payments/mercado-pago/webhook", async (req, res) => {
    try {
      const dataId = resolveMercadoPagoNotificationDataId({
        queryDataId: req.query["data.id"],
        queryId: req.query.id,
        body: req.body,
      });
      const result = await processMercadoPagoWebhook({
        xSignature: req.header("x-signature"),
        xRequestId: req.header("x-request-id"),
        dataId,
        topic: req.query.topic ?? req.body?.type,
        isOfficialSimulation: req.body?.live_mode === false && dataId === "123456",
      });
      res.status(200).json({ received: true, result: result.action });
    } catch (error) {
      console.error("[Mercado Pago webhook] rejeitado:", error instanceof Error ? error.message : error);
      res.status(400).json({ received: false });
    }
  });
  app.post("/api/scheduled/weeklyReset", weeklyResetHandler);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
