/** Read-only: prints tables, row counts, and drizzle migration history. */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const [{ version }] = await sql`SELECT version()`;
console.log("Connected:", version.split(" ").slice(0, 2).join(" "));

const tables = await sql`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
`;

console.log(`\npublic tables (${tables.length}):`);
for (const { tablename } of tables) {
  const [{ count }] = await sql`SELECT count(*)::int FROM public.${sql(tablename)}`;
  console.log(`  ${tablename}: ${count} rows`);
}

const fks = await sql`
  SELECT conname, conrelid::regclass AS tbl, confdeltype
  FROM pg_constraint
  WHERE contype = 'f' AND connamespace = 'public'::regnamespace
  ORDER BY conname
`;
console.log(`\nforeign keys (${fks.length}):`);
for (const f of fks) {
  const onDelete = f.confdeltype === "c" ? "cascade" : f.confdeltype;
  console.log(`  ${f.tbl}.${f.conname} onDelete=${onDelete}`);
}

console.log("\ndrizzle migration history:");
try {
  const rows = await sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
  if (!rows.length) console.log("  (empty)");
  for (const r of rows) console.log(`  ${r.hash.slice(0, 16)}… ${new Date(Number(r.created_at)).toISOString()}`);
} catch (e) {
  console.log("  (no drizzle schema yet)");
}

await sql.end();
