import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Uses Neon's HTTP driver so this works in Cloudflare's edge runtime
// (no TCP sockets needed). Set DATABASE_URL to your Neon connection string.
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
