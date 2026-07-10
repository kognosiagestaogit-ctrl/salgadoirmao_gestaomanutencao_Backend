import { Hono } from "hono";
import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { db } from "../db/client";
import { usuariosTable } from "../db/schema";

const usuariosRouter = new Hono();

const updateRoleSchema = z.object({
  role: z.enum(["admin", "tecnico", "operador"]),
});

// GET /api/usuarios - Listar colaboradores da equipe
usuariosRouter.get("/", async (c) => {
  const usuarios = await db.select().from(usuariosTable).orderBy(asc(usuariosTable.nome));
  return c.json(usuarios);
});

// PUT /api/usuarios/:id/role - Alterar papel de acesso de um usuário
usuariosRouter.put("/:id/role", async (c) => {
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

    return c.json(updated);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ error: "Erro de validação", details: err.errors }, 400);
    }
    return c.json({ error: err.message || "Erro ao atualizar permissão do usuário" }, 500);
  }
});

export default usuariosRouter;
