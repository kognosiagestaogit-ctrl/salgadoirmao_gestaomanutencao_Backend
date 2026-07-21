import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";

const swaggerRouter = new Hono();

// ─── OpenAPI 3.0 Specification ────────────────────────────────────────────────
const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Salgado Care API",
    description:
      "API RESTful para a plataforma de manutenção industrial **Salgado Care**.\n\n" +
      "Stack: Hono · Drizzle ORM · PostgreSQL · Bun\n\n" +
      "Todas as rotas `/api/*` (exceto `/api/auth/login`) requerem autenticação via Bearer Token JWT.",
    version: "1.0.0",
    contact: {
      name: "Salgado Care",
    },
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Servidor de desenvolvimento local",
    },
  ],
  tags: [
    { name: "Health", description: "Health check do serviço" },
    { name: "Auth", description: "Autenticação e sessão do usuário" },
    { name: "Máquinas", description: "CRUD de equipamentos / máquinas" },
    { name: "Categorias", description: "Categorias de máquinas" },
    { name: "Manutenções", description: "Ordens de serviço de manutenção" },
    { name: "Dashboard", description: "Métricas e indicadores" },
    { name: "Usuários", description: "Gestão da equipe" },
    { name: "Configurações", description: "Configurações do sistema de alertas" },
  ],

  // ─── Security ────────────────────────────────────────────────────────────────
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http" as const,
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token JWT retornado pelo endpoint POST /api/auth/login",
      },
    },
    schemas: {
      // ── Error ────────────────────────────────────────────────────────────────
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
        },
      },
      ValidationError: {
        type: "object",
        properties: {
          error: { type: "string", example: "Erro de validação" },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                path: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },

      // ── Auth ─────────────────────────────────────────────────────────────────
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@salgadocare.com.br" },
          password: { type: "string", minLength: 4, example: "admin123" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          token: { type: "string", description: "JWT Token" },
          user: { $ref: "#/components/schemas/UserSafe" },
        },
      },

      // ── User ─────────────────────────────────────────────────────────────────
      UserSafe: {
        type: "object",
        description: "Usuário sem o campo password_hash",
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          nome: { type: "string" },
          role: { type: "string", enum: ["admin", "tecnico", "operador"] },
          ativo: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      UpdateRoleRequest: {
        type: "object",
        required: ["role"],
        properties: {
          role: { type: "string", enum: ["admin", "tecnico", "operador"] },
        },
      },
      CreateUserRequest: {
        type: "object",
        required: ["email", "nome", "password"],
        properties: {
          email: { type: "string", format: "email" },
          nome: { type: "string", minLength: 2 },
          password: { type: "string", minLength: 4 },
          role: { type: "string", enum: ["admin", "tecnico", "operador"], default: "operador" },
          ativo: { type: "boolean", default: true },
        },
      },
      UpdateUserRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          nome: { type: "string", minLength: 2 },
          password: { type: "string", minLength: 4 },
          role: { type: "string", enum: ["admin", "tecnico", "operador"] },
          ativo: { type: "boolean" },
        },
      },

      // ── Categoria ────────────────────────────────────────────────────────────
      Categoria: {
        type: "object",
        properties: {
          id: { type: "string" },
          nome: { type: "string" },
          icone: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      CreateCategoriaRequest: {
        type: "object",
        required: ["nome"],
        properties: {
          nome: { type: "string", minLength: 2, example: "Fornos Industriais" },
          icone: { type: "string", default: "Cog", example: "Flame" },
        },
      },

      // ── Máquina ──────────────────────────────────────────────────────────────
      Maquina: {
        type: "object",
        properties: {
          id: { type: "string" },
          nome: { type: "string" },
          categoria_id: { type: "string" },
          localizacao: { type: "string", nullable: true },
          intervalo_dias: { type: "integer" },
          proxima_manutencao: { type: "string", format: "date", description: "YYYY-MM-DD" },
          status: { type: "string", enum: ["ok", "atencao", "parada"] },
          ativa: { type: "boolean" },
          observacoes: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
          categoria: { $ref: "#/components/schemas/Categoria" },
        },
      },
      CreateMaquinaRequest: {
        type: "object",
        required: ["nome", "categoria_id", "proxima_manutencao"],
        properties: {
          nome: { type: "string", minLength: 2, example: "Forno Turbo FT-200" },
          categoria_id: { type: "string", example: "cat-fornos" },
          localizacao: { type: "string", nullable: true, example: "Setor A – Área 3" },
          intervalo_dias: { type: "integer", minimum: 1, default: 30, example: 30 },
          proxima_manutencao: { type: "string", format: "date", example: "2026-08-15" },
          status: { type: "string", enum: ["ok", "atencao", "parada"], default: "ok" },
          ativa: { type: "boolean", default: true },
          observacoes: { type: "string", nullable: true, example: "Manutenção preventiva mensal" },
        },
      },
      UpdateMaquinaRequest: {
        type: "object",
        description: "Todos os campos são opcionais (partial update)",
        properties: {
          nome: { type: "string", minLength: 2 },
          categoria_id: { type: "string" },
          localizacao: { type: "string", nullable: true },
          intervalo_dias: { type: "integer", minimum: 1 },
          proxima_manutencao: { type: "string", format: "date" },
          status: { type: "string", enum: ["ok", "atencao", "parada"] },
          ativa: { type: "boolean" },
          observacoes: { type: "string", nullable: true },
        },
      },

      // ── Manutenção ───────────────────────────────────────────────────────────
      Manutencao: {
        type: "object",
        properties: {
          id: { type: "string" },
          maquina_id: { type: "string" },
          tecnico_id: { type: "string" },
          tecnico_nome: { type: "string" },
          data_servico: { type: "string", format: "date" },
          descricao: { type: "string" },
          pecas_trocadas: { type: "string", nullable: true },
          custo: { type: "number", format: "float" },
          status_final: { type: "string", enum: ["ok", "atencao", "parada"] },
          created_at: { type: "string", format: "date-time" },
          maquina: {
            type: "object",
            properties: {
              id: { type: "string" },
              nome: { type: "string" },
              categoria_id: { type: "string" },
              localizacao: { type: "string" },
              status: { type: "string" },
            },
          },
          tecnico: {
            type: "object",
            properties: {
              id: { type: "string" },
              nome: { type: "string" },
              email: { type: "string" },
              role: { type: "string" },
            },
          },
        },
      },
      CreateManutencaoRequest: {
        type: "object",
        required: ["maquina_id", "tecnico_id", "data_servico", "descricao"],
        properties: {
          maquina_id: { type: "string", example: "maq-001" },
          tecnico_id: { type: "string", example: "usr-001" },
          data_servico: { type: "string", format: "date", example: "2026-07-20" },
          descricao: { type: "string", minLength: 3, example: "Troca de resistência do forno" },
          pecas_trocadas: { type: "string", nullable: true, example: "Resistência 220V 3000W" },
          custo: { type: "number", minimum: 0, default: 0, example: 450.0 },
          status_final: { type: "string", enum: ["ok", "atencao", "parada"], default: "ok" },
        },
      },

      // ── Dashboard ────────────────────────────────────────────────────────────
      DashboardMetrics: {
        type: "object",
        properties: {
          totalMaquinas: { type: "integer" },
          maquinasOk: { type: "integer" },
          maquinasAtencao: { type: "integer" },
          maquinasParadas: { type: "integer" },
          manutencoesMesAtual: { type: "integer" },
          custoMesAtual: { type: "number", format: "float" },
          custosPorMes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                mes: { type: "string", example: "Jul" },
                custo: { type: "number" },
                quantidade: { type: "integer" },
              },
            },
          },
          manutencoesPorCategoria: {
            type: "array",
            items: {
              type: "object",
              properties: {
                categoria: { type: "string" },
                quantidade: { type: "integer" },
              },
            },
          },
        },
      },

      // ── Configurações ────────────────────────────────────────────────────────
      ConfigAlertas: {
        type: "object",
        properties: {
          id: { type: "string" },
          singleton: { type: "boolean" },
          dias_antecedencia: { type: "integer" },
          emails_destinatarios: { type: "array", items: { type: "string", format: "email" } },
          nome_remetente: { type: "string", nullable: true },
          email_remetente: { type: "string", format: "email", nullable: true },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      UpdateConfigRequest: {
        type: "object",
        properties: {
          dias_antecedencia: { type: "integer", minimum: 1, default: 15 },
          emails_destinatarios: { type: "array", items: { type: "string", format: "email" } },
          nome_remetente: { type: "string", nullable: true },
          email_remetente: { type: "string", format: "email", nullable: true },
        },
      },
    },
  },

  security: [{ BearerAuth: [] }],

  // ─── Paths ───────────────────────────────────────────────────────────────────
  paths: {
    // ── Health ────────────────────────────────────────────────────────────────
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Verifica se a API está ativa.",
        security: [],
        responses: {
          "200": {
            description: "Serviço online",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    service: { type: "string", example: "Salgado Care API" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Auth ──────────────────────────────────────────────────────────────────
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        description: "Autentica o usuário e retorna um token JWT válido por 7 dias.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Login bem-sucedido",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          "400": {
            description: "Erro de validação",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } },
            },
          },
          "401": {
            description: "Credenciais inválidas",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "403": {
            description: "Usuário inativo",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Usuário autenticado",
        description: "Retorna os dados do usuário logado com base no JWT.",
        responses: {
          "200": {
            description: "Dados do usuário",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/UserSafe" } },
            },
          },
          "401": {
            description: "Não autorizado / sessão inválida",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "403": {
            description: "Usuário inativo",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "404": {
            description: "Usuário não encontrado",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },

    // ── Máquinas ──────────────────────────────────────────────────────────────
    "/api/maquinas": {
      get: {
        tags: ["Máquinas"],
        summary: "Listar máquinas",
        description: "Retorna todas as máquinas cadastradas com suas categorias.",
        responses: {
          "200": {
            description: "Lista de máquinas",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Maquina" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Máquinas"],
        summary: "Criar máquina",
        description: "Cadastra um novo equipamento no sistema.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateMaquinaRequest" } },
          },
        },
        responses: {
          "201": {
            description: "Máquina criada com sucesso",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Maquina" } },
            },
          },
          "400": {
            description: "Erro de validação",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } },
            },
          },
        },
      },
    },
    "/api/maquinas/{id}": {
      get: {
        tags: ["Máquinas"],
        summary: "Buscar máquina por ID",
        description: "Retorna os detalhes de uma máquina específica.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID da máquina",
          },
        ],
        responses: {
          "200": {
            description: "Detalhes da máquina",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Maquina" } },
            },
          },
          "404": {
            description: "Equipamento não encontrado",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
      put: {
        tags: ["Máquinas"],
        summary: "Atualizar máquina",
        description: "Atualiza os dados de um equipamento existente (partial update).",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID da máquina",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdateMaquinaRequest" } },
          },
        },
        responses: {
          "200": {
            description: "Máquina atualizada",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Maquina" } },
            },
          },
          "400": {
            description: "Erro de validação",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } },
            },
          },
          "404": {
            description: "Equipamento não encontrado",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
      delete: {
        tags: ["Máquinas"],
        summary: "Remover máquina",
        description: "Remove um equipamento do sistema.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID da máquina",
          },
        ],
        responses: {
          "200": {
            description: "Equipamento removido com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "404": {
            description: "Equipamento não encontrado",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },

    // ── Categorias ────────────────────────────────────────────────────────────
    "/api/categorias": {
      get: {
        tags: ["Categorias"],
        summary: "Listar categorias",
        description: "Retorna todas as categorias de máquinas, ordenadas por nome.",
        responses: {
          "200": {
            description: "Lista de categorias",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Categoria" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Categorias"],
        summary: "Criar categoria",
        description: "Cadastra uma nova categoria de máquina.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCategoriaRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Categoria criada",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Categoria" } },
            },
          },
          "400": {
            description: "Erro de validação",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } },
            },
          },
        },
      },
    },

    // ── Manutenções ──────────────────────────────────────────────────────────
    "/api/manutencoes": {
      get: {
        tags: ["Manutenções"],
        summary: "Listar manutenções",
        description:
          "Retorna todas as ordens de serviço, com dados da máquina e técnico. Opcionalmente filtra por `maquina_id`.",
        parameters: [
          {
            name: "maquina_id",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filtrar manutenções de uma máquina específica",
          },
        ],
        responses: {
          "200": {
            description: "Lista de manutenções",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Manutencao" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Manutenções"],
        summary: "Registrar manutenção",
        description:
          "Cria uma nova ordem de serviço. **Regra de negócio:** ao registrar, o sistema calcula automaticamente a próxima data de manutenção da máquina com base no `intervalo_dias` e atualiza o status da máquina.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateManutencaoRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Manutenção registrada com sucesso",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Manutencao" } },
            },
          },
          "400": {
            description: "Erro de validação",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } },
            },
          },
          "404": {
            description: "Máquina não encontrada",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },

    // ── Dashboard ────────────────────────────────────────────────────────────
    "/api/dashboard/metrics": {
      get: {
        tags: ["Dashboard"],
        summary: "Métricas do dashboard",
        description:
          "Retorna indicadores gerais: total de máquinas por status, manutenções do mês, custos agregados por mês e manutenções por categoria.",
        responses: {
          "200": {
            description: "Métricas do sistema",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DashboardMetrics" },
              },
            },
          },
        },
      },
    },

    // ── Usuários ─────────────────────────────────────────────────────────────
    "/api/usuarios": {
      get: {
        tags: ["Usuários"],
        summary: "Listar usuários",
        description: "Retorna todos os colaboradores da equipe, ordenados por nome.",
        responses: {
          "200": {
            description: "Lista de usuários",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/UserSafe" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Usuários"],
        summary: "Criar usuário (Admin)",
        description: "Cadastra um novo usuário no sistema.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUserRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Usuário criado com sucesso",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/UserSafe" } },
            },
          },
          "400": {
            description: "Erro de validação ou e-mail já cadastrado",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } },
            },
          },
          "403": {
            description: "Acesso negado (apenas admin)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/api/usuarios/{id}": {
      put: {
        tags: ["Usuários"],
        summary: "Atualizar usuário (Admin)",
        description: "Atualiza os dados de um usuário existente (partial update).",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID do usuário",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateUserRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Usuário atualizado",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/UserSafe" } },
            },
          },
          "400": {
            description: "Erro de validação",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } },
            },
          },
          "403": {
            description: "Acesso negado (apenas admin)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "404": {
            description: "Usuário não encontrado",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
      delete: {
        tags: ["Usuários"],
        summary: "Remover usuário (Admin)",
        description: "Remove um usuário do sistema.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID do usuário",
          },
        ],
        responses: {
          "200": {
            description: "Usuário removido com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Não é permitido excluir seu próprio usuário",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "403": {
            description: "Acesso negado (apenas admin)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "404": {
            description: "Usuário não encontrado",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/api/usuarios/{id}/role": {
      put: {
        tags: ["Usuários"],
        summary: "Alterar papel de acesso",
        description: "Atualiza o role (papel) de um usuário específico.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID do usuário",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateRoleRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Papel atualizado",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/UserSafe" } },
            },
          },
          "400": {
            description: "Erro de validação",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } },
            },
          },
          "404": {
            description: "Usuário não encontrado",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },

    // ── Configurações ────────────────────────────────────────────────────────
    "/api/configuracoes": {
      get: {
        tags: ["Configurações"],
        summary: "Obter configurações",
        description:
          "Retorna a configuração singleton do sistema de alertas. Se não existir, cria uma configuração padrão automaticamente.",
        responses: {
          "200": {
            description: "Configuração do sistema",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConfigAlertas" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Configurações"],
        summary: "Atualizar configurações",
        description: "Atualiza a configuração do sistema de alertas de manutenção.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateConfigRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Configuração atualizada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConfigAlertas" },
              },
            },
          },
          "400": {
            description: "Erro de validação",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } },
            },
          },
        },
      },
    },
  },
};

// ─── Endpoint que serve o JSON do OpenAPI spec ─────────────────────────────────
swaggerRouter.get("/doc", (c) => {
  return c.json(openApiSpec);
});

// ─── Swagger UI em /docs ───────────────────────────────────────────────────────
swaggerRouter.get("/docs", swaggerUI({ url: "/doc" }));

export default swaggerRouter;
