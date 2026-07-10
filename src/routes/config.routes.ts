import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { configAlertasTable } from "../db/schema";

const configRouter = new Hono();

const updateConfigSchema = z.object({
  dias_antecedencia: z.number().int().positive().default(15),
  emails_destinatarios: z.array(z.string().email("E-mail inválido")).default([]),
  nome_remetente: z.string().optional().nullable(),
  email_remetente: z.string().email("E-mail remetente inválido").optional().nullable(),
});

// GET /api/configuracoes - Retornar configuração do sistema
configRouter.get("/", async (c) => {
  const configs = await db.select().from(configAlertasTable).limit(1);

  if (!configs || configs.length === 0) {
    const [inserted] = await db
      .insert(configAlertasTable)
      .values({
        id: "cfg-01",
        singleton: true,
        dias_antecedencia: 15,
        emails_destinatarios: ["carlos.salgado@salgadocare.com.br"],
        nome_remetente: "Manutenção Salgado & Irmãos",
        email_remetente: "alertas@salgadocare.com.br",
        updated_at: new Date().toISOString(),
      })
      .returning();
    return c.json(inserted);
  }

  return c.json(configs[0]);
});

// PUT /api/configuracoes - Atualizar configuração
configRouter.put("/", async (c) => {
  try {
    const body = await c.req.json();
    const validated = updateConfigSchema.parse(body);

    const now = new Date().toISOString();

    const [updated] = await db
      .update(configAlertasTable)
      .set({
        ...validated,
        updated_at: now,
      })
      .where(eq(configAlertasTable.singleton, true))
      .returning();

    if (!updated) {
      const [inserted] = await db
        .insert(configAlertasTable)
        .values({
          id: "cfg-01",
          singleton: true,
          ...validated,
          updated_at: now,
        })
        .returning();
      return c.json(inserted);
    }

    return c.json(updated);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ error: "Erro de validação", details: err.errors }, 400);
    }
    return c.json({ error: err.message || "Erro ao salvar configurações" }, 500);
  }
});

export default configRouter;
