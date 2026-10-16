import {
  bigint,
  boolean,
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { categories } from "./categories";
import { budgetClosureStatusEnum, budgetPeriodEnum, budgetSettlementDestinationEnum } from "./enums";
import { savingsGoals } from "./goals";
import { mfaPolicy, ownerOnlyPolicy } from "./policies";
import { profiles } from "./profiles";

/** Budget definitions; once-period rows preserve the existing one-month behavior. */
export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    /** First day of the initial budget period. */
    periodStart: date("period_start").notNull(),
    period: budgetPeriodEnum("period").notNull().default("once"),
    periodEnd: date("period_end"),
    amount: bigint("amount", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("budgets_user_period_idx").on(t.userId, t.periodStart),
    unique("budgets_user_category_period_uq").on(
      t.userId,
      t.categoryId,
      t.periodStart,
    ),
    ownerOnlyPolicy("budgets", t.userId),
    mfaPolicy("budgets"),
  ],
);

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

/** Per-month overrides for a recurring monthly budget's annual plan. */
export const budgetMonthPlans = pgTable(
  "budget_month_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    periodStart: date("period_start").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("budget_month_plans_amount_positive", sql`${t.amount} > 0`),
    unique("budget_month_plans_budget_period_uq").on(t.budgetId, t.periodStart),
    index("budget_month_plans_user_period_idx").on(t.userId, t.periodStart),
    ownerOnlyPolicy("budget_month_plans", t.userId),
    mfaPolicy("budget_month_plans"),
  ],
).enableRLS();

export type BudgetMonthPlan = typeof budgetMonthPlans.$inferSelect;
export type NewBudgetMonthPlan = typeof budgetMonthPlans.$inferInsert;

/** Per-category monthly closure state, allowing an incomplete close to be resumed. */
export const budgetClosures = pgTable(
  "budget_closures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    periodStart: date("period_start").notNull(),
    status: budgetClosureStatusEnum("status").notNull().default("open"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("budget_closures_owner_budget_period_uq").on(t.userId, t.budgetId, t.periodStart),
    index("budget_closures_user_period_idx").on(t.userId, t.periodStart),
    ownerOnlyPolicy("budget_closures", t.userId),
    mfaPolicy("budget_closures"),
  ],
).enableRLS();

export type BudgetClosure = typeof budgetClosures.$inferSelect;
export type NewBudgetClosure = typeof budgetClosures.$inferInsert;

/** Idempotent virtual allocation records produced by monthly budget closures. */
export const budgetSettlements = pgTable(
  "budget_settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    closureId: uuid("closure_id")
      .notNull()
      .references(() => budgetClosures.id, { onDelete: "cascade" }),
    destination: budgetSettlementDestinationEnum("destination").notNull(),
    targetBudgetId: uuid("target_budget_id").references(() => budgets.id, { onDelete: "cascade" }),
    savingsGoalId: uuid("savings_goal_id").references(() => savingsGoals.id, { onDelete: "cascade" }),
    targetPeriod: date("target_period"),
    amount: bigint("amount", { mode: "number" }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("budget_settlements_amount_positive", sql`${t.amount} > 0`),
    check(
      "budget_settlements_destination_target_check",
      sql`(
        (${t.destination} = 'reallocation' and ${t.targetBudgetId} is not null and ${t.savingsGoalId} is null and ${t.targetPeriod} is not null)
        or (${t.destination} = 'goal' and ${t.targetBudgetId} is null and ${t.savingsGoalId} is not null and ${t.targetPeriod} is null)
        or (${t.destination} = 'rollover' and ${t.targetBudgetId} is not null and ${t.savingsGoalId} is null and ${t.targetPeriod} is not null)
        or (${t.destination} = 'expire' and ${t.targetBudgetId} is null and ${t.savingsGoalId} is null and ${t.targetPeriod} is null)
      )`,
    ),
    unique("budget_settlements_user_idempotency_uq").on(t.userId, t.idempotencyKey),
    index("budget_settlements_closure_idx").on(t.closureId),
    ownerOnlyPolicy("budget_settlements", t.userId),
    mfaPolicy("budget_settlements"),
  ],
).enableRLS();

export type BudgetSettlement = typeof budgetSettlements.$inferSelect;
export type NewBudgetSettlement = typeof budgetSettlements.$inferInsert;

/** A user's automatic destination for each monthly budget's positive remainder. */
export const budgetClosureRules = pgTable(
  "budget_closure_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    destination: budgetSettlementDestinationEnum("destination").notNull(),
    targetBudgetId: uuid("target_budget_id").references(() => budgets.id, { onDelete: "cascade" }),
    savingsGoalId: uuid("savings_goal_id").references(() => savingsGoals.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "budget_closure_rules_target_check",
      sql`(
        (${t.destination} = 'reallocation' and ${t.targetBudgetId} is not null and ${t.savingsGoalId} is null)
        or (${t.destination} = 'goal' and ${t.targetBudgetId} is null and ${t.savingsGoalId} is not null)
        or (${t.destination} = 'rollover' and ${t.targetBudgetId} = ${t.budgetId} and ${t.savingsGoalId} is null)
        or (${t.destination} = 'expire' and ${t.targetBudgetId} is null and ${t.savingsGoalId} is null)
      )`,
    ),
    unique("budget_closure_rules_user_budget_uq").on(t.userId, t.budgetId),
    index("budget_closure_rules_active_idx").on(t.isActive, t.budgetId),
    ownerOnlyPolicy("budget_closure_rules", t.userId),
    mfaPolicy("budget_closure_rules"),
  ],
).enableRLS();

export type BudgetClosureRule = typeof budgetClosureRules.$inferSelect;
export type NewBudgetClosureRule = typeof budgetClosureRules.$inferInsert;
