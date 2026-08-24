import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import "dotenv/config";

import maquinasRouter from "./routes/maquinas.routes";
import categoriasRouter from "./routes/categorias.routes";
import manutencoesRouter from "./routes/manutencoes.routes";
import dashboardRouter from "./routes/dashboard.routes";
import usuariosRouter from "./routes/usuarios.routes";
import configRouter from "./routes/config.routes";
import authRouter from "./routes/auth.routes";
import { authMiddleware } from "./middlewares/auth.middleware";
import swaggerRouter from "./swagger";

const app = new Hono();

// Middlewares Globais
app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://18.223.89.173:7001"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

// Aplicar middleware de autenticação nas rotas protegidas da API
app.use("/api/*", authMiddleware);

// Rota de Health Check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "Salgado Care API",
    timestamp: new Date().toISOString(),
  });
});

// Montagem das rotas da API REST
app.route("/api/auth", authRouter);
app.route("/api/maquinas", maquinasRouter);
app.route("/api/categorias", categoriasRouter);
app.route("/api/manutencoes", manutencoesRouter);
app.route("/api/dashboard", dashboardRouter);
app.route("/api/usuarios", usuariosRouter);
app.route("/api/configuracoes", configRouter);

// Documentação (Swagger UI)
app.route("/", swaggerRouter);

// Tratamento global de rotas 404
app.notFound((c) => {
  return c.json({ error: "Rota não encontrada na API do Salgado Care", path: c.req.path }, 404);
});

// Tratamento global de erros 500
app.onError((err, c) => {
  console.error("❌ Erro na requisição API:", err);
  return c.json({ error: "Erro interno do servidor", message: err.message }, 500);
});

const port = Number(process.env.PORT || 3001);
console.log(`🚀 API Salgado Care em execução na porta ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
