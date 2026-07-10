import { Hono } from "hono";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/client";
import { manutencoesTable, maquinasTable, usuariosTable } from "../db/schema";

const manutencoesRouter = new Hono();

const createManutencaoSchema = z.object({
  maquina_id: z.string().min(1, "ID da máquina é obrigatório"),
  tecnico_id: z.string().min(1, "ID do técnico é obrigatório"),
  data_servico: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  descricao: z.string().min(3, "Descrição é obrigatória"),
  pecas_trocadas: z.string().optional().nullable(),
  custo: z.number().nonnegative().default(0),
  status_final: z.enum(["ok", "atencao", "parada"]).default("ok"),
});

// GET /api/manutencoes - Listar ordens (opcionalmente filtrando por ?maquina_id=X)
manutencoesRouter.get("/", async (c) => {
  const maquinaId = c.req.query("maquina_id");

  let query = db
    .select({
      id: manutencoesTable.id,
      maquina_id: manutencoesTable.maquina_id,
      tecnico_id: manutencoesTable.tecnico_id,
      tecnico_nome: manutencoesTable.tecnico_nome,
      data_servico: manutencoesTable.data_servico,
      descricao: manutencoesTable.descricao,
      pecas_trocadas: manutencoesTable.pecas_trocadas,
      custo: manutencoesTable.custo,
      status_final: manutencoesTable.status_final,
      created_at: manutencoesTable.created_at,
      maquina: {
        id: maquinasTable.id,
        nome: maquinasTable.nome,
        categoria_id: maquinasTable.categoria_id,
        localizacao: maquinasTable.localizacao,
        status: maquinasTable.status,
      },
      tecnico: {
        id: usuariosTable.id,
        nome: usuariosTable.nome,
        email: usuariosTable.email,
        role: usuariosTable.role,
      },
    })
    .from(manutencoesTable)
    .leftJoin(maquinasTable, eq(manutencoesTable.maquina_id, maquinasTable.id))
    .leftJoin(usuariosTable, eq(manutencoesTable.tecnico_id, usuariosTable.id));

  if (maquinaId) {
    query = query.where(eq(manutencoesTable.maquina_id, maquinaId)) as any;
  }

  const results = await query.orderBy(desc(manutencoesTable.data_servico));

  // Garantir formatação exatamente compatível com o domínio
  return c.json(
    results.map((r) => ({
      ...r,
      tecnico_nome: r.tecnico?.nome || r.tecnico_nome || "Técnico Responsável",
      tecnico: r.tecnico || { id: r.tecnico_id, nome: r.tecnico_nome || "Técnico Responsável" },
    }))
  );
});

// POST /api/manutencoes - Criar ordem de serviço + Regra de negócio de agendamento automático
manutencoesRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validated = createManutencaoSchema.parse(body);

    // 1. Buscar a máquina associada para ler o intervalo de dias
    const maq = await db
      .select()
      .from(maquinasTable)
      .where(eq(maquinasTable.id, validated.maquina_id))
      .limit(1);

    if (!maq || maq.length === 0) {
      return c.json({ error: "Máquina informada não foi encontrada" }, 404);
    }

    const maquina = maq[0];

    // 2. Buscar técnico associado
    const tec = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.id, validated.tecnico_id))
      .limit(1);

    const tecnico = tec[0] || { id: validated.tecnico_id, nome: "Técnico Responsável" };

    // 3. Regra de Negócio: Calcular a nova data da próxima manutenção
    // Soma intervalo_dias à data_servico
    const dataServicoDate = new Date(`${validated.data_servico}T00:00:00Z`);
    dataServicoDate.setUTCDate(dataServicoDate.getUTCDate() + maquina.intervalo_dias);
    const novaProximaManutencao = dataServicoDate.toISOString().slice(0, 10);

    const now = new Date().toISOString();
    const newId = `man-${Date.now()}`;

    // 4. Inserir a manutenção
    const [inserted] = await db
      .insert(manutencoesTable)
      .values({
        id: newId,
        maquina_id: validated.maquina_id,
        tecnico_id: validated.tecnico_id,
        tecnico_nome: tecnico.nome,
        data_servico: validated.data_servico,
        descricao: validated.descricao,
        pecas_trocadas: validated.pecas_trocadas || null,
        custo: validated.custo,
        status_final: validated.status_final,
        created_at: now,
      })
      .returning();

    // 5. Atualizar a máquina com o novo status e a nova próxima manutenção
    await db
      .update(maquinasTable)
      .set({
        status: validated.status_final,
        proxima_manutencao: novaProximaManutencao,
        updated_at: now,
      })
      .where(eq(maquinasTable.id, maquina.id));

    return c.json(
      {
        ...inserted,
        maquina: {
          id: maquina.id,
          nome: maquina.nome,
          categoria_id: maquina.categoria_id,
          localizacao: maquina.localizacao,
          status: validated.status_final,
        },
        tecnico: { id: tecnico.id, nome: tecnico.nome },
        tecnico_nome: tecnico.nome,
      },
      201
    );
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ error: "Erro de validação", details: err.errors }, 400);
    }
    return c.json({ error: err.message || "Erro ao registrar manutenção" }, 500);
  }
});

export default manutencoesRouter;
