import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Uses Neon's HTTP driver so this works in Cloudflare's edge runtime
const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });
