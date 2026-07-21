import { Context, Next } from "hono";
import { verify } from "hono/jwt";

const JWT_SECRET = process.env.JWT_SECRET || "salgado_care_secret_key_123";

export async function authMiddleware(c: Context, next: Next) {
  const path = c.req.path;
  
  // Liberar health check e endpoint de login
  if (path === "/health" || path === "/api/auth/login") {
    return await next();
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { error: "Não autorizado", message: "Acesso restrito. Faça login para continuar." },
      401
    );
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verify(token, JWT_SECRET, "HS256");
    c.set("jwtPayload", payload);
    return await next();
  } catch (err) {
    return c.json(
      { error: "Não autorizado", message: "Sua sessão expirou. Por favor, faça login novamente." },
      401
    );
  }
}
