import { pgEnum } from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", [
  "checking",
  "savings",
  "credit_card",
  "cash",
  "investment",
  "loan",
]);

export const categoryKindEnum = pgEnum("category_kind", ["income", "expense"]);

export const transactionKindEnum = pgEnum("transaction_kind", [
  "income",
  "expense",
  "transfer",
  "adjustment",
]);

export const budgetPeriodEnum = pgEnum("budget_period", [
  "once",
  "monthly",
  "annual",
]);

export const budgetClosureStatusEnum = pgEnum("budget_closure_status", [
  "open",
  "completed",
]);

export const budgetSettlementDestinationEnum = pgEnum("budget_settlement_destination", [
  "reallocation",
  "goal",
  "rollover",
  "expire",
]);

export const recurrenceEnum = pgEnum("recurrence", [
  "none",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "achieved",
  "archived",
]);
