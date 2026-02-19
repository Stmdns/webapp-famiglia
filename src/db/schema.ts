import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  image: text("image"),
  password: text("password"),
  provider: text("provider").notNull().default("credentials"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const groupMembers = sqliteTable("group_members", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  quotaPercent: real("quota_percent").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const expenseCategories = sqliteTable("expense_categories", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("Folder"),
  color: text("color").notNull().default("#6b7280"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const recurringExpenses = sqliteTable("recurring_expenses", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  frequencyType: text("frequency_type").notNull(), // 'weekly' | 'monthly' | 'yearly' | 'days' | 'months'
  frequencyValue: integer("frequency_value").notNull().default(1),
  dayOfMonth: integer("day_of_month"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  startMonth: integer("start_month"),
  startYear: integer("start_year"),
  endMonth: integer("end_month"),
  endYear: integer("end_year"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const oneTimeExpenses = sqliteTable("one_time_expenses", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  expenseId: text("expense_id").references(() => recurringExpenses.id, { onDelete: "set null" }),
  categoryId: text("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(false),
  receiptText: text("receipt_text"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const expensePayments = sqliteTable("expense_payments", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  expenseId: text("expense_id").notNull().references(() => recurringExpenses.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  amount: real("amount").notNull(),
  paidAt: integer("paid_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => groupMembers.id, { onDelete: "cascade" }),
  expenseId: text("expense_id").references(() => recurringExpenses.id, { onDelete: "set null" }),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  amountPaid: real("amount_paid").notNull(),
  isConfirmed: integer("is_confirmed", { mode: "boolean" }).notNull().default(false),
  confirmedAt: integer("confirmed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Relations
export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  categories: many(expenseCategories),
  expenses: many(recurringExpenses),
  oneTimeExpenses: many(oneTimeExpenses),
  payments: many(payments),
  expensePayments: many(expensePayments),
}));

export const usersRelations = relations(users, ({ many }) => ({
  groupMembers: many(groupMembers),
}));

export const groupMembersRelations = relations(groupMembers, ({ one, many }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  payments: many(payments),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  group: one(groups, {
    fields: [expenseCategories.groupId],
    references: [groups.id],
  }),
  expenses: many(recurringExpenses),
  oneTimeExpenses: many(oneTimeExpenses),
}));

export const recurringExpensesRelations = relations(recurringExpenses, ({ one, many }) => ({
  group: one(groups, {
    fields: [recurringExpenses.groupId],
    references: [groups.id],
  }),
  category: one(expenseCategories, {
    fields: [recurringExpenses.categoryId],
    references: [expenseCategories.id],
  }),
  payments: many(payments),
  expensePayments: many(expensePayments),
}));

export const oneTimeExpensesRelations = relations(oneTimeExpenses, ({ one }) => ({
  group: one(groups, {
    fields: [oneTimeExpenses.groupId],
    references: [groups.id],
  }),
  expense: one(recurringExpenses, {
    fields: [oneTimeExpenses.expenseId],
    references: [recurringExpenses.id],
  }),
  category: one(expenseCategories, {
    fields: [oneTimeExpenses.categoryId],
    references: [expenseCategories.id],
  }),
}));

export const expensePaymentsRelations = relations(expensePayments, ({ one }) => ({
  group: one(groups, {
    fields: [expensePayments.groupId],
    references: [groups.id],
  }),
  expense: one(recurringExpenses, {
    fields: [expensePayments.expenseId],
    references: [recurringExpenses.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  group: one(groups, {
    fields: [payments.groupId],
    references: [groups.id],
  }),
  member: one(groupMembers, {
    fields: [payments.memberId],
    references: [groupMembers.id],
  }),
  expense: one(recurringExpenses, {
    fields: [payments.expenseId],
    references: [recurringExpenses.id],
  }),
}));

// Types
export type Group = typeof groups.$inferSelect;
export type User = typeof users.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type RecurringExpense = typeof recurringExpenses.$inferSelect;
export type OneTimeExpense = typeof oneTimeExpenses.$inferSelect;
export type ExpensePayment = typeof expensePayments.$inferSelect;
export type Payment = typeof payments.$inferSelect;
