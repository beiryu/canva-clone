import { eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { creditTransactions, userCredits } from "@/db/schema";

export const getUserCredits = async (userId: string) => {
  const [userCredit] = await db
    .select()
    .from(userCredits)
    .where(eq(userCredits.userId, userId));

  if (!userCredit) {
    // Create user credits if they don't exist
    const newUserCredit = await db
      .insert(userCredits)
      .values({
        userId,
        balance: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newUserCredit[0];
  }

  return userCredit;
};

export const addCredits = async ({
  userId,
  amount,
  description,
  metadata,
  referenceId,
  referenceType,
}: {
  userId: string;
  amount: number;
  description?: string;
  metadata?: Record<string, any>;
  referenceId?: string;
  referenceType?: string;
}) => {
  // Get user credits or create if not exists
  const userCredit = await getUserCredits(userId);

  // Calculate new balance
  const newBalance = userCredit.balance + amount;
  const newLifetimeEarned = userCredit.lifetimeEarned + amount;

  // Update user credits
  await db
    .update(userCredits)
    .set({
      balance: newBalance,
      lifetimeEarned: newLifetimeEarned,
      updatedAt: new Date(),
    })
    .where(eq(userCredits.id, userCredit.id));

  // Create transaction record
  const [transaction] = await db
    .insert(creditTransactions)
    .values({
      userId,
      amount,
      balanceAfter: newBalance,
      description,
      metadata,
      referenceId,
      referenceType,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return transaction;
};
