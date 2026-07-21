import { Hono } from "hono";
import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { db } from "../db/client";
import { usuariosTable } from "../db/schema";

const usuariosRouter = new Hono();

const createUserSchema = z.object({
  email: z.string().email("E-mail inválido"),
  nome: z.string().min(2, "Nome é obrigatório"),
  password: z.string().min(4, "Senha deve ter pelo menos 4 caracteres"),
  role: z.enum(["admin", "tecnico", "operador"]).default("operador"),
  ativo: z.boolean().default(true),
});

const updateUserSchema = z.object({
  email: z.string().email("E-mail inválido").optional(),
  nome: z.string().min(2, "Nome é obrigatório").optional(),
  password: z.string().min(4, "Senha deve ter pelo menos 4 caracteres").optional(),
  role: z.enum(["admin", "tecnico", "operador"]).optional(),
  ativo: z.boolean().optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(["admin", "tecnico", "operador"]),
});

// Helper middleware para verificar se é admin
const requireAdmin = async (c: any, next: any) => {
  const payload = c.get("jwtPayload");
  if (!payload || payload.role !== "admin") {
    return c.json({ error: "Acesso negado", message: "Apenas administradores podem realizar esta ação." }, 403);
  }
  return await next();
};

// GET /api/usuarios - Listar colaboradores da equipe
usuariosRouter.get("/", async (c) => {
  const usuarios = await db.select().from(usuariosTable).orderBy(asc(usuariosTable.nome));
  return c.json(usuarios);
});

// PUT /api/usuarios/:id/role - Alterar papel de acesso de um usuário (mantido por compatibilidade)
usuariosRouter.put("/:id/role", requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const validated = updateRoleSchema.parse(body);

    const [updated] = await db
      .update(usuariosTable)
      .set({ role: validated.role })
      .where(eq(usuariosTable.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Usuário não encontrado" }, 404);
    }

    const { password_hash, ...safeUser } = updated;
    return c.json(safeUser);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ error: "Erro de validação", details: err.errors }, 400);
    }
    return c.json({ error: err.message || "Erro ao atualizar permissão do usuário" }, 500);
  }
});

// POST /api/usuarios - Criar novo usuário (Admin)
usuariosRouter.post("/", requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const validated = createUserSchema.parse(body);

    // Verificar se email já existe
    const [existingUser] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.email, validated.email))
      .limit(1);

    if (existingUser) {
      return c.json({ error: "E-mail já cadastrado" }, 400);
    }

    const password_hash = await Bun.password.hash(validated.password);
    const newId = `usr-${Date.now()}`;

    const [inserted] = await db
      .insert(usuariosTable)
      .values({
        id: newId,
        email: validated.email,
        nome: validated.nome,
        password_hash,
        role: validated.role,
        ativo: validated.ativo,
        created_at: new Date().toISOString(),
      })
      .returning();

    const { password_hash: _ph, ...safeUser } = inserted;
    return c.json(safeUser, 201);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ error: "Erro de validação", details: err.errors }, 400);
    }
    return c.json({ error: err.message || "Erro ao criar usuário" }, 500);
  }
});

// PUT /api/usuarios/:id - Atualizar usuário (Admin)
usuariosRouter.put("/:id", requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const validated = updateUserSchema.parse(body);

    const updateData: any = { ...validated };
    
    // Hash da nova senha se foi enviada
    if (validated.password) {
      updateData.password_hash = await Bun.password.hash(validated.password);
      delete updateData.password;
    }

    // Verificar se email já existe em outro usuário caso tenha sido alterado
    if (validated.email) {
      const [existingUser] = await db
        .select()
        .from(usuariosTable)
        .where(eq(usuariosTable.email, validated.email))
        .limit(1);

      if (existingUser && existingUser.id !== id) {
        return c.json({ error: "E-mail já cadastrado para outro usuário" }, 400);
      }
    }

    const [updated] = await db
      .update(usuariosTable)
      .set(updateData)
      .where(eq(usuariosTable.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Usuário não encontrado" }, 404);
    }

    const { password_hash, ...safeUser } = updated;
    return c.json(safeUser);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ error: "Erro de validação", details: err.errors }, 400);
    }
    return c.json({ error: err.message || "Erro ao atualizar usuário" }, 500);
  }
});

// DELETE /api/usuarios/:id - Excluir usuário (Admin)
usuariosRouter.delete("/:id", requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");

    // Impedir que o admin exclua a si mesmo
    const payload = c.get("jwtPayload");
    if (payload && payload.id === id) {
      return c.json({ error: "Não é permitido excluir seu próprio usuário" }, 400);
    }

    const [deleted] = await db.delete(usuariosTable).where(eq(usuariosTable.id, id)).returning();

    if (!deleted) {
      return c.json({ error: "Usuário não encontrado" }, 404);
    }

    return c.json({ success: true, message: "Usuário removido com sucesso" });
  } catch (err: any) {
    return c.json({ error: "Erro ao excluir usuário", message: err.message }, 500);
  }
});

export default usuariosRouter;
