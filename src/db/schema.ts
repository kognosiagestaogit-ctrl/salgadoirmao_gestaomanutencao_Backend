import { pgTable, text, timestamp, boolean, integer, real, jsonb } from "drizzle-orm/pg-core";

export const categoriasMaquinaTable = pgTable("categorias_maquina", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  icone: text("icone"),
  created_at: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const maquinasTable = pgTable("maquinas", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  categoria_id: text("categoria_id")
    .notNull()
    .references(() => categoriasMaquinaTable.id, { onDelete: "restrict" }),
  localizacao: text("localizacao"),
  intervalo_dias: integer("intervalo_dias").notNull().default(30),
  proxima_manutencao: text("proxima_manutencao").notNull(), // ISO YYYY-MM-DD
  status: text("status").notNull().default("ok"), // 'ok' | 'atencao' | 'parada'
  ativa: boolean("ativa").notNull().default(true),
  observacoes: text("observacoes"),
  created_at: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const usuariosTable = pgTable("usuarios", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  nome: text("nome").notNull(),
  role: text("role").notNull().default("operador"), // 'admin' | 'tecnico' | 'operador'
  ativo: boolean("ativo").notNull().default(true),
  created_at: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const manutencoesTable = pgTable("manutencoes", {
  id: text("id").primaryKey(),
  maquina_id: text("maquina_id")
    .notNull()
    .references(() => maquinasTable.id, { onDelete: "cascade" }),
  tecnico_id: text("tecnico_id")
    .notNull()
    .references(() => usuariosTable.id, { onDelete: "restrict" }),
  tecnico_nome: text("tecnico_nome"),
  data_servico: text("data_servico").notNull(), // ISO YYYY-MM-DD
  descricao: text("descricao").notNull(),
  pecas_trocadas: text("pecas_trocadas"),
  custo: real("custo").default(0),
  status_final: text("status_final").notNull(), // 'ok' | 'atencao' | 'parada'
  created_at: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const configAlertasTable = pgTable("config_alertas", {
  id: text("id").primaryKey(),
  singleton: boolean("singleton").notNull().default(true),
  dias_antecedencia: integer("dias_antecedencia").notNull().default(15),
  emails_destinatarios: jsonb("emails_destinatarios").$type<string[]>().default([]).notNull(),
  nome_remetente: text("nome_remetente"),
  email_remetente: text("email_remetente"),
  updated_at: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});
