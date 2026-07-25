/**
 * Drops every table in the public schema plus drizzle's migration history,
 * so `db:migrate` can rebuild the database from 0000_init.
 *
 * Destructive — requires RESET_DB=yes to run.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

if (process.env.RESET_DB !== "yes") {
  console.error("Refusing to run. Re-run with RESET_DB=yes to confirm.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

console.log(`Target: ${url.replace(/(:\/\/[^:]+:)[^@]+@/, "$1***@")}`);

const sql = postgres(url, { max: 1 });

const tables = await sql`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
`;

if (tables.length === 0) {
  console.log("public schema already empty");
} else {
  console.log("Dropping:", tables.map((t) => t.tablename).join(", "));
  for (const { tablename } of tables) {
    await sql`DROP TABLE IF EXISTS public.${sql(tablename)} CASCADE`;
  }
}

await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
console.log("Dropped drizzle migration history");

await sql.end();
console.log("Done. Now run: bun run db:migrate");
