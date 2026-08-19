#!/usr/bin/env node
import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "drizzle");
const migration = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort().at(-1);
if (!migration) throw new Error("请先运行 npm run db:generate");

const sources = JSON.parse(readFileSync(path.join(root, "src", "content-sources.json"), "utf8"));
const quote = (value) => `'${String(value ?? "").replaceAll("'", "''")}'`;
const nullable = (value) => value == null ? "NULL" : quote(value);
const now = "2026-08-20T00:00:00.000Z";

const statements = [
  "",
  "-- Initial account and the existing 七月安妮 archive are seeded idempotently.",
  `INSERT OR IGNORE INTO accounts (id, display_name, handle, avatar_url, created_at, updated_at) VALUES ('annie-default', '安妮', '@kiki89699', '/annie-avatar.jpg', '${now}', '${now}');`,
];

for (const source of sources) {
  statements.push(`INSERT OR IGNORE INTO contents (
  id, owner_account_id, category, angle, action, source_name, source_url, product_fit, priority,
  requires_verification, origin, source_article, source_date, source_file, title, draft, insight, created_at, updated_at
) VALUES (
  ${quote(source.id)}, NULL, ${quote(source.category)}, ${quote(source.angle)}, ${quote(source.action)},
  ${quote(source.sourceName)}, ${quote(source.sourceUrl)}, ${quote(JSON.stringify(source.productFit || []))}, ${Number(source.priority || 0)},
  ${source.requiresVerification ? 1 : 0}, ${quote(source.origin)}, ${quote(source.sourceArticle)}, ${quote(source.sourceDate)},
  ${quote(source.sourceFile)}, ${quote(source.title)}, ${quote(source.draft)}, ${quote(source.insight)}, ${quote(now)}, ${quote(now)}
);`, "--> statement-breakpoint");
}

statements.push("PRAGMA optimize;", "");
appendFileSync(path.join(migrationsDir, migration), statements.join("\n"));
console.log(`Seeded ${sources.length} public content records into ${migration}`);
