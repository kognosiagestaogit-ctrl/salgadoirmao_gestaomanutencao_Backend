import { Hono } from "hono";
import { z } from "zod";
import { asc } from "drizzle-orm";
import { db } from "../db/client";
import { categoriasMaquinaTable } from "../db/schema";

const categoriasRouter = new Hono();

const createCategoriaSchema = z.object({
  nome: z.string().min(2, "Nome da categoria é obrigatório"),
  icone: z.string().default("Cog"),
});

// GET /api/categorias - Listar categorias
categoriasRouter.get("/", async (c) => {
  const categorias = await db
    .select()
    .from(categoriasMaquinaTable)
    .orderBy(asc(categoriasMaquinaTable.nome));
  return c.json(categorias);
});

// POST /api/categorias - Criar categoria
categoriasRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validated = createCategoriaSchema.parse(body);

    const newId = `cat-${Date.now()}`;
    const [inserted] = await db
      .insert(categoriasMaquinaTable)
      .values({
        id: newId,
        nome: validated.nome,
        icone: validated.icone,
        created_at: new Date().toISOString(),
      })
      .returning();

    return c.json(inserted, 201);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ error: "Erro de validação", details: err.errors }, 400);
    }
    return c.json({ error: err.message || "Erro ao criar categoria" }, 500);
  }
});

export default categoriasRouter;
