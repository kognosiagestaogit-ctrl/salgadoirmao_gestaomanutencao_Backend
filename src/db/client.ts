import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgrespassword@localhost:7003/salgado_care";

// Para consultas com Postgres.js no Bun
export const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });
