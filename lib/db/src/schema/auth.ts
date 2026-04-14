import { pgTable, text, varchar, timestamp, uuid, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const sessionsTable = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    token: text("token").notNull().unique(),
    refreshToken: text("refresh_token"),
    provider: varchar("provider", { length: 50 }).notNull().default("email"), // email, google, github, apple, linkedin
    providerUserId: varchar("provider_user_id", { length: 255 }),
    expiresAt: timestamp("expires_at").notNull(),
    isRevoked: boolean("is_revoked").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    tokenIdx: index("sessions_token_idx").on(table.token),
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
  })
);

export const oauthAccountsTable = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    provider: varchar("provider", { length: 50 }).notNull(), // google, github, apple, linkedin
    providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    displayName: varchar("display_name", { length: 255 }),
    profileUrl: text("profile_url"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    connectedAt: timestamp("connected_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => ({
    userIdIdx: index("oauth_accounts_user_id_idx").on(table.userId),
    providerIdx: index("oauth_accounts_provider_idx").on(table.provider),
  })
);

export const passwordResetTokensTable = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("password_reset_user_id_idx").on(table.userId),
    tokenIdx: index("password_reset_token_idx").on(table.token),
  })
);

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true }) as unknown as z.ZodType<any, any, any>;
export const selectSessionSchema = createSelectSchema(sessionsTable) as unknown as z.ZodType<any, any, any>;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
export type OAuthAccount = typeof oauthAccountsTable.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
