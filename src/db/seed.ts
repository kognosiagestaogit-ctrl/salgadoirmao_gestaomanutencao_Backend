import { db, queryClient } from "./client";
import {
  categoriasMaquinaTable,
  maquinasTable,
  usuariosTable,
  manutencoesTable,
  configAlertasTable,
} from "./schema";

async function seed() {
  console.log("🌱 Iniciando o Seed do Banco de Dados Salgado Care...");

  try {
    // 1. Limpar tabelas existentes (em ordem inversa das foreign keys)
    console.log("🧹 Limpando dados anteriores...");
    await db.delete(manutencoesTable);
    await db.delete(maquinasTable);
    await db.delete(categoriasMaquinaTable);
    await db.delete(usuariosTable);
    await db.delete(configAlertasTable);

    // 2. Inserir Categorias
    console.log("⚙️ Inserindo Categorias de Máquinas...");
    const categorias = [
      { id: "cat-1", nome: "Fornos e Aquecimento", icone: "Flame", created_at: "2025-01-10T10:00:00Z" },
      { id: "cat-2", nome: "Misturadeiras e Batedeiras", icone: "RotateCw", created_at: "2025-01-10T10:00:00Z" },
      { id: "cat-3", nome: "Modeladoras de Salgados", icone: "Cog", created_at: "2025-01-10T10:00:00Z" },
      { id: "cat-4", nome: "Fritadeiras Contínuas", icone: "Utensils", created_at: "2025-01-10T10:00:00Z" },
      { id: "cat-5", nome: "Embaladoras e Seladoras", icone: "Package", created_at: "2025-01-10T10:00:00Z" },
      { id: "cat-6", nome: "Câmaras de Resfriamento", icone: "Snowflake", created_at: "2025-01-10T10:00:00Z" },
    ];
    await db.insert(categoriasMaquinaTable).values(categorias);

    // 3. Inserir Usuários
    console.log("👥 Inserindo Usuários da Equipe com Senha Criptografada...");
    const defaultPasswordHash = await Bun.password.hash("123456");
    const usuarios = [
      {
        id: "usr-admin",
        email: "admin@salgadocare.com.br",
        nome: "Administrador Geral",
        password_hash: defaultPasswordHash,
        role: "admin",
        ativo: true,
        created_at: "2025-01-01T08:00:00Z",
      },
    ];
    await db.insert(usuariosTable).values(usuarios);

    // 4. Inserir Máquinas
    console.log("🏭 Inserindo Máquinas e Equipamentos...");
    const maquinas = [
      {
        id: "maq-001",
        nome: "Forno Rotativo Industrial Turbo - Linha A",
        categoria_id: "cat-1",
        localizacao: "Galpão Principal - Setor de Assados",
        intervalo_dias: 30,
        proxima_manutencao: "2026-07-15",
        status: "ok",
        ativa: true,
        observacoes: "Manutenção dos queimadores a gás deve ser feita por técnico credenciado.",
        created_at: "2025-02-01T08:00:00Z",
        updated_at: "2026-06-15T14:30:00Z",
      },
      {
        id: "maq-002",
        nome: "Modeladora de Coxinhas e Salgados Max-5000",
        categoria_id: "cat-3",
        localizacao: "Sala de Modelagem 01",
        intervalo_dias: 15,
        proxima_manutencao: "2026-07-08",
        status: "atencao",
        ativa: true,
        observacoes: "Ajustar cabeçote de recheio e verificar ruído na engrenagem de tração.",
        created_at: "2025-02-10T09:15:00Z",
        updated_at: "2026-06-20T11:00:00Z",
      },
      {
        id: "maq-003",
        nome: "Fritadeira Industrial Contínua a Óleo 200L",
        categoria_id: "cat-4",
        localizacao: "Setor de Fritura e Escorrimento",
        intervalo_dias: 20,
        proxima_manutencao: "2026-07-12",
        status: "parada",
        ativa: true,
        observacoes: "Parada aguardando troca da esteira de teflon e termostato de segurança.",
        created_at: "2025-03-01T10:00:00Z",
        updated_at: "2026-07-05T16:45:00Z",
      },
      {
        id: "maq-004",
        nome: "Misturadeira de Massa de Quibe 150kg",
        categoria_id: "cat-2",
        localizacao: "Galpão Principal - Setor de Massas",
        intervalo_dias: 45,
        proxima_manutencao: "2026-08-01",
        status: "ok",
        ativa: true,
        observacoes: "Engraxar mancais de rolamento com graxa alimentícia atóxica.",
        created_at: "2025-03-15T11:00:00Z",
        updated_at: "2026-06-15T10:00:00Z",
      },
      {
        id: "maq-005",
        nome: "Embaladora Horizontal Flow-Pack Rápida",
        categoria_id: "cat-5",
        localizacao: "Sala de Embalagem e Expedição",
        intervalo_dias: 30,
        proxima_manutencao: "2026-07-25",
        status: "ok",
        ativa: true,
        observacoes: "Verificar mordente térmico de selagem e sensor fotoelétrico de corte.",
        created_at: "2025-04-01T14:00:00Z",
        updated_at: "2026-06-25T15:30:00Z",
      },
      {
        id: "maq-006",
        nome: "Câmara Fria de Congelamento Rápido (-25°C)",
        categoria_id: "cat-6",
        localizacao: "Setor de Estoque e Congelados",
        intervalo_dias: 60,
        proxima_manutencao: "2026-08-10",
        status: "ok",
        ativa: true,
        observacoes: "Checar pressão de fluido refrigerante e borracha de vedação das portas.",
        created_at: "2025-04-10T16:00:00Z",
        updated_at: "2026-06-10T09:00:00Z",
      },
    ];
    await db.insert(maquinasTable).values(maquinas);

    // 5. Inserir Manutenções
    console.log("🛠️ Inserindo Histórico de Ordens de Serviço...");
    const manutencoes = [
      {
        id: "man-101",
        maquina_id: "maq-003",
        tecnico_id: "usr-admin",
        tecnico_nome: "Administrador Geral",
        data_servico: "2026-07-05",
        descricao: "Parada emergencial da Fritadeira por falha no termostato principal. Equipamento isolado por segurança.",
        pecas_trocadas: "Termostato digital J-Type, Contatora 24V 40A",
        custo: 840.5,
        status_final: "parada",
        created_at: "2026-07-05T16:30:00Z",
      },
      {
        id: "man-102",
        maquina_id: "maq-002",
        tecnico_id: "usr-admin",
        tecnico_nome: "Administrador Geral",
        data_servico: "2026-06-20",
        descricao: "Limpeza profunda dos moldes de coxinha e lubrificação do eixo de modelagem contínua.",
        pecas_trocadas: "Anel de vedação de silicone alimentício (2x)",
        custo: 180.0,
        status_final: "ok",
        created_at: "2026-06-20T14:00:00Z",
      },
      {
        id: "man-103",
        maquina_id: "maq-001",
        tecnico_id: "usr-admin",
        tecnico_nome: "Administrador Geral",
        data_servico: "2026-06-15",
        descricao: "Manutenção preventiva mensal do forno turbo. Calibração da pressão de chama e teste da válvula de escape.",
        pecas_trocadas: "Filtro de gás LP industrial",
        custo: 350.0,
        status_final: "ok",
        created_at: "2026-06-15T11:20:00Z",
      },
      {
        id: "man-104",
        maquina_id: "maq-005",
        tecnico_id: "usr-admin",
        tecnico_nome: "Administrador Geral",
        data_servico: "2026-06-10",
        descricao: "Substituição da correia de avanço do filme plástico na embaladora Flow-Pack.",
        pecas_trocadas: "Correia de tração dentada PU 1200mm",
        custo: 420.0,
        status_final: "ok",
        created_at: "2026-06-10T15:00:00Z",
      },
      {
        id: "man-105",
        maquina_id: "maq-006",
        tecnico_id: "usr-admin",
        tecnico_nome: "Administrador Geral",
        data_servico: "2026-05-12",
        descricao: "Higienização dos evaporadores da câmara fria e checagem de consumo elétrico do compressor.",
        pecas_trocadas: "Nenhuma peça substituída (revisão limpa)",
        custo: 250.0,
        status_final: "ok",
        created_at: "2026-05-12T16:00:00Z",
      },
    ];
    await db.insert(manutencoesTable).values(manutencoes);

    // 6. Inserir Configurações de Alerta
    console.log("🔔 Inserindo Configurações do Sistema...");
    await db.insert(configAlertasTable).values({
      id: "cfg-01",
      singleton: true,
      dias_antecedencia: 15,
      emails_destinatarios: [
        "carlos.salgado@salgadocare.com.br",
        "gestao.industrial@salgadoirmaos.com.br",
      ],
      nome_remetente: "Manutenção Salgado & Irmãos",
      email_remetente: "alertas@salgadoirmaos.com.br",
      updated_at: new Date().toISOString(),
    });

    console.log("✅ Seed concluído com sucesso!");
  } catch (error) {
    console.error("❌ Erro durante o seed do banco de dados:", error);
    throw error;
  } finally {
    await queryClient.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
