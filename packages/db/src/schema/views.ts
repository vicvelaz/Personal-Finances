import { eq, getTableColumns, sql } from "drizzle-orm";
import { pgView } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { transactionSplits } from "./splits";
import { transactions } from "./transactions";

/** One row per split, or per transaction without splits. Used by budgets and category reports. */
export const transactionLines = pgView("transaction_lines")
  .with({ securityInvoker: true })
  .as((qb) =>
    qb
      .select({
        transactionId: sql<string>`${transactions.id}`.as("transaction_id"),
        userId: transactions.userId,
        accountId: transactions.accountId,
        kind: transactions.kind,
        occurredOn: transactions.occurredOn,
        currency: transactions.currency,
        categoryId: sql<string | null>`case when ${transactionSplits.id} is null then ${transactions.categoryId} else ${transactionSplits.categoryId} end`.as(
          "category_id",
        ),
        amount: sql<number>`coalesce(${transactionSplits.amount}, ${transactions.amount})`.as("amount"),
      })
      .from(transactions)
      .leftJoin(transactionSplits, eq(transactionSplits.transactionId, transactions.id)),
  );

/** Accounts with current balance (minor units). security_invoker makes RLS of the caller apply. */
export const accountBalances = pgView("account_balances")
  .with({ securityInvoker: true })
  .as((qb) =>
    qb
      .select({
        ...getTableColumns(accounts),
        balance:
          sql<number>`(${accounts.openingBalance} + coalesce(sum(${transactions.amount}), 0))::bigint`.as(
            "balance",
          ),
        transactionCount: sql<number>`count(${transactions.id})::int`.as(
          "transaction_count",
        ),
      })
      .from(accounts)
      .leftJoin(transactions, eq(transactions.accountId, accounts.id))
      .groupBy(accounts.id),
  );
