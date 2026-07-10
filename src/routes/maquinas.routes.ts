import { Hono } from "hono";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/client";
import { maquinasTable, categoriasMaquinaTable } from "../db/schema";

const maquinasRouter = new Hono();

// Schema Zod para criação/edição de máquina
const createMaquinaSchema = z.object({
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  categoria_id: z.string().min(1, "ID da categoria é obrigatório"),
  localizacao: z.string().optional().nullable(),
  intervalo_dias: z.number().int().positive().default(30),
  proxima_manutencao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  status: z.enum(["ok", "atencao", "parada"]).default("ok"),
  ativa: z.boolean().default(true),
  observacoes: z.string().optional().nullable(),
});

const updateMaquinaSchema = createMaquinaSchema.partial();

// GET /api/maquinas - Listar todas as máquinas com sua categoria
maquinasRouter.get("/", async (c) => {
  const allMaquinas = await db
    .select({
      id: maquinasTable.id,
      nome: maquinasTable.nome,
      categoria_id: maquinasTable.categoria_id,
      localizacao: maquinasTable.localizacao,
      intervalo_dias: maquinasTable.intervalo_dias,
      proxima_manutencao: maquinasTable.proxima_manutencao,
      status: maquinasTable.status,
      ativa: maquinasTable.ativa,
      observacoes: maquinasTable.observacoes,
      created_at: maquinasTable.created_at,
      updated_at: maquinasTable.updated_at,
      categoria: {
        id: categoriasMaquinaTable.id,
        nome: categoriasMaquinaTable.nome,
        icone: categoriasMaquinaTable.icone,
        created_at: categoriasMaquinaTable.created_at,
      },
    })
    .from(maquinasTable)
    .leftJoin(categoriasMaquinaTable, eq(maquinasTable.categoria_id, categoriasMaquinaTable.id))
    .orderBy(desc(maquinasTable.updated_at));

  return c.json(allMaquinas);
});

// GET /api/maquinas/:id - Buscar máquina específica por ID
maquinasRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const maquina = await db
    .select({
      id: maquinasTable.id,
      nome: maquinasTable.nome,
      categoria_id: maquinasTable.categoria_id,
      localizacao: maquinasTable.localizacao,
      intervalo_dias: maquinasTable.intervalo_dias,
      proxima_manutencao: maquinasTable.proxima_manutencao,
      status: maquinasTable.status,
      ativa: maquinasTable.ativa,
      observacoes: maquinasTable.observacoes,
      created_at: maquinasTable.created_at,
      updated_at: maquinasTable.updated_at,
      categoria: {
        id: categoriasMaquinaTable.id,
        nome: categoriasMaquinaTable.nome,
        icone: categoriasMaquinaTable.icone,
        created_at: categoriasMaquinaTable.created_at,
      },
    })
    .from(maquinasTable)
    .leftJoin(categoriasMaquinaTable, eq(maquinasTable.categoria_id, categoriasMaquinaTable.id))
    .where(eq(maquinasTable.id, id))
    .limit(1);

  if (!maquina || maquina.length === 0) {
    return c.json({ error: "Equipamento não encontrado" }, 404);
  }

  return c.json(maquina[0]);
});

// POST /api/maquinas - Criar novo equipamento
maquinasRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validated = createMaquinaSchema.parse(body);

    const newId = `maq-${Date.now()}`;
    const now = new Date().toISOString();

    const [inserted] = await db
      .insert(maquinasTable)
      .values({
        id: newId,
        nome: validated.nome,
        categoria_id: validated.categoria_id,
        localizacao: validated.localizacao || null,
        intervalo_dias: validated.intervalo_dias,
        proxima_manutencao: validated.proxima_manutencao,
        status: validated.status,
        ativa: validated.ativa,
        observacoes: validated.observacoes || null,
        created_at: now,
        updated_at: now,
      })
      .returning();

    // Buscar categoria para retornar o objeto completo exatamente como o frontend espera
    const cat = await db
      .select()
      .from(categoriasMaquinaTable)
      .where(eq(categoriasMaquinaTable.id, inserted.categoria_id))
      .limit(1);

    return c.json({
      ...inserted,
      categoria: cat[0] || null,
    }, 201);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ error: "Erro de validação", details: err.errors }, 400);
    }
    return c.json({ error: err.message || "Erro ao salvar máquina" }, 500);
  }
});

// PUT /api/maquinas/:id - Atualizar equipamento existente
maquinasRouter.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const validated = updateMaquinaSchema.parse(body);

    const now = new Date().toISOString();

    const [updated] = await db
      .update(maquinasTable)
      .set({
        ...validated,
        updated_at: now,
      })
      .where(eq(maquinasTable.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Equipamento não encontrado para atualização" }, 404);
    }

    const cat = await db
      .select()
      .from(categoriasMaquinaTable)
      .where(eq(categoriasMaquinaTable.id, updated.categoria_id))
      .limit(1);

    return c.json({
      ...updated,
      categoria: cat[0] || null,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ error: "Erro de validação", details: err.errors }, 400);
    }
    return c.json({ error: err.message || "Erro ao atualizar máquina" }, 500);
  }
});

// DELETE /api/maquinas/:id - Remover equipamento
maquinasRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [deleted] = await db.delete(maquinasTable).where(eq(maquinasTable.id, id)).returning();

  if (!deleted) {
    return c.json({ error: "Equipamento não encontrado para exclusão" }, 404);
  }

  return c.json({ success: true, message: "Equipamento removido com sucesso" });
});

export default maquinasRouter;
