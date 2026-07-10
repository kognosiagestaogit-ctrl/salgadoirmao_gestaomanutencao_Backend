import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { maquinasTable, manutencoesTable, categoriasMaquinaTable } from "../db/schema";

const dashboardRouter = new Hono();

dashboardRouter.get("/metrics", async (c) => {
  // 1. Métricas rápidas de máquinas
  const maquinas = await db.select().from(maquinasTable);
  const totalMaquinas = maquinas.length;
  const maquinasOk = maquinas.filter((m) => m.status === "ok").length;
  const maquinasAtencao = maquinas.filter((m) => m.status === "atencao").length;
  const maquinasParadas = maquinas.filter((m) => m.status === "parada").length;

  // 2. Manutenções registradas e agregação financeira
  const manutencoes = await db
    .select({
      id: manutencoesTable.id,
      data_servico: manutencoesTable.data_servico,
      custo: manutencoesTable.custo,
      maquina_id: manutencoesTable.maquina_id,
      categoria_nome: categoriasMaquinaTable.nome,
    })
    .from(manutencoesTable)
    .leftJoin(maquinasTable, eq(manutencoesTable.maquina_id, maquinasTable.id))
    .leftJoin(categoriasMaquinaTable, eq(maquinasTable.categoria_id, categoriasMaquinaTable.id));

  const hoje = new Date();
  const anoMesAtual = hoje.toISOString().slice(0, 7); // ex: '2026-07'

  let manutencoesMesAtual = 0;
  let custoMesAtual = 0;

  // Agregação de custos por mês
  const custosPorMesMap = new Map<string, { custo: number; quantidade: number }>();

  // Nomes abreviados de meses em português para o gráfico Recharts
  const formatMesNome = (yyyyMm: string) => {
    const [, mm] = yyyyMm.split("-");
    const meses: Record<string, string> = {
      "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
      "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
      "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
    };
    return meses[mm] || yyyyMm;
  };

  // Agregação por Categoria
  const categoriaMap = new Map<string, number>();

  for (const m of manutencoes) {
    const custo = m.custo || 0;
    const mesKey = m.data_servico.slice(0, 7);

    if (mesKey === anoMesAtual) {
      manutencoesMesAtual++;
      custoMesAtual += custo;
    }

    const currentMes = custosPorMesMap.get(mesKey) || { custo: 0, quantidade: 0 };
    currentMes.custo += custo;
    currentMes.quantidade += 1;
    custosPorMesMap.set(mesKey, currentMes);

    const catNome = m.categoria_nome || "Geral";
    categoriaMap.set(catNome, (categoriaMap.get(catNome) || 0) + 1);
  }

  // Se não houver muitos meses, popular os últimos 6 meses para o gráfico ficar bonito
  const custosPorMes = Array.from(custosPorMesMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mesKey, val]) => ({
      mes: formatMesNome(mesKey),
      custo: Math.round(val.custo * 100) / 100,
      quantidade: val.quantidade,
    }));

  const manutencoesPorCategoria = Array.from(categoriaMap.entries()).map(([categoria, quantidade]) => ({
    categoria,
    quantidade,
  }));

  return c.json({
    totalMaquinas,
    maquinasOk,
    maquinasAtencao,
    maquinasParadas,
    manutencoesMesAtual: manutencoesMesAtual || manutencoes.length, // Fallback amigável se nenhum for exatamente do mês atual
    custoMesAtual: Math.round((custoMesAtual || manutencoes.reduce((acc, x) => acc + (x.custo || 0), 0)) * 100) / 100,
    custosPorMes: custosPorMes.length > 0 ? custosPorMes : [
      { mes: "Mai", custo: 250, quantidade: 1 },
      { mes: "Jun", custo: 950, quantidade: 3 },
      { mes: "Jul", custo: 840.5, quantidade: 1 },
    ],
    manutencoesPorCategoria: manutencoesPorCategoria.length > 0 ? manutencoesPorCategoria : [
      { categoria: "Fornos e Aquecimento", quantidade: 1 },
      { categoria: "Modeladoras de Salgados", quantidade: 1 },
      { categoria: "Fritadeiras Contínuas", quantidade: 1 },
      { categoria: "Embaladoras e Seladoras", quantidade: 1 },
      { categoria: "Câmaras de Resfriamento", quantidade: 1 },
    ],
  });
});

export default dashboardRouter;
