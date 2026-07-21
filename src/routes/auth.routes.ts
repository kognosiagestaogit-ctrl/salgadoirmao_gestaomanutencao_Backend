import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { db } from "../db/client";
import { usuariosTable } from "../db/schema";

const authRouter = new Hono();
const JWT_SECRET = process.env.JWT_SECRET || "salgado_care_secret_key_123";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(4, "Senha deve ter pelo menos 4 caracteres"),
});

// POST /api/auth/login - Autenticar usuário
authRouter.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const validated = loginSchema.parse(body);

    // Buscar usuário pelo e-mail
    const [user] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.email, validated.email))
      .limit(1);

    if (!user) {
      return c.json({ error: "Credenciais inválidas", message: "E-mail ou senha incorretos." }, 401);
    }

    if (!user.ativo) {
      return c.json({ error: "Acesso bloqueado", message: "Este usuário está inativo no sistema." }, 403);
    }

    // Verificar hash da senha usando Bun.password.verify
    const passwordMatch = await Bun.password.verify(validated.password, user.password_hash);
    if (!passwordMatch) {
      return c.json({ error: "Credenciais inválidas", message: "E-mail ou senha incorretos." }, 401);
    }

    // Gerar token JWT (expira em 7 dias)
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
    const token = await sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        exp,
      },
      JWT_SECRET
    );

    // Remover hash da senha antes de retornar os dados do usuário
    const { password_hash, ...safeUser } = user;

    return c.json({
      token,
      user: safeUser,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ error: "Erro de validação", details: err.errors }, 400);
    }
    return c.json({ error: "Erro interno", message: err.message || "Erro durante o login" }, 500);
  }
});

// GET /api/auth/me - Obter dados do usuário autenticado (JWT decodificado)
authRouter.get("/me", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    if (!payload || !payload.id) {
      return c.json({ error: "Não autorizado", message: "Sessão inválida." }, 401);
    }

    const [user] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.id, payload.id))
      .limit(1);

    if (!user) {
      return c.json({ error: "Usuário não encontrado" }, 404);
    }

    if (!user.ativo) {
      return c.json({ error: "Acesso bloqueado", message: "Este usuário está inativo no sistema." }, 403);
    }

    const { password_hash, ...safeUser } = user;
    return c.json(safeUser);
  } catch (err: any) {
    return c.json({ error: "Erro ao buscar usuário logado", message: err.message }, 500);
  }
});

export default authRouter;
