import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  handle: text("handle").notNull().unique(),
  avatarUrl: text("avatar_url").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const contents = sqliteTable("contents", {
  id: text("id").primaryKey(),
  ownerAccountId: text("owner_account_id").references(() => accounts.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  angle: text("angle").notNull().default(""),
  action: text("action").notNull().default(""),
  sourceName: text("source_name").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  productFit: text("product_fit").notNull().default("[]"),
  priority: integer("priority").notNull().default(0),
  requiresVerification: integer("requires_verification", { mode: "boolean" }).notNull().default(false),
  origin: text("origin").notNull().default(""),
  sourceArticle: text("source_article").notNull().default(""),
  sourceDate: text("source_date").notNull().default(""),
  sourceFile: text("source_file").notNull().default(""),
  title: text("title").notNull(),
  draft: text("draft").notNull(),
  insight: text("insight").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_contents_owner_account_id").on(table.ownerAccountId)]);

export const adminLoginAttempts = sqliteTable("admin_login_attempts", {
  clientKey: text("client_key").primaryKey(),
  failures: integer("failures").notNull().default(0),
  lockedUntil: integer("locked_until").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});

export const backgrounds = sqliteTable("backgrounds", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tags: text("tags").notNull().default(""),
  imageUrl: text("image_url").notNull(),
  storageKey: text("storage_key"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
