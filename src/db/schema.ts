import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projects = pgTable("project", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),
  json: jsonb("json").notNull(),
  height: integer("height").notNull(),
  width: integer("width").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  isTemplate: boolean("isTemplate"),
  isPro: boolean("isPro"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
});

export const projectsRelations = relations(projects, ({ one }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
}));

export const projectsInsertSchema = createInsertSchema(projects);

export const generatedImages = pgTable("generated_image", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("projectId")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fullPath: text("fullPath").notNull(),
  prompt: text("prompt"),
  style: text("style"),
  model: text("model"),
  settings: jsonb("settings").notNull(),
  providerName: text("providerName"),
  providerImageId: text("providerImageId"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
});

export const generatedImagesRelations = relations(
  generatedImages,
  ({ one }) => ({
    project: one(projects, {
      fields: [generatedImages.projectId],
      references: [projects.id],
    }),
  }),
);

export const generatedImagesInsertSchema = createInsertSchema(generatedImages);

export const uploadedImages = pgTable("uploaded_image", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("projectId")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fullPath: text("fullPath").notNull(),
  fileName: text("fileName").notNull(),
  fileSize: integer("fileSize").notNull(),
  fileType: text("fileType").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
});

export const uploadedImagesRelations = relations(uploadedImages, ({ one }) => ({
  project: one(projects, {
    fields: [uploadedImages.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [uploadedImages.userId],
    references: [users.id],
  }),
}));

export const uploadedImagesInsertSchema = createInsertSchema(uploadedImages);
