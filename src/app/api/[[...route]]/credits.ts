import { verifyAuth } from "@hono/auth-js";
import { eq, desc } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "@/db/drizzle";
import { creditTransactions } from "@/db/schema";
import { getUserCredits } from "@/features/credits/core/credit";
import { polar } from "@/lib/polar";

const app = new Hono()
  .get("/balance", verifyAuth(), async (c) => {
    const auth = c.get("authUser");

    if (!auth.token?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userCredit = await getUserCredits(auth.token.id);

    return c.json({ data: userCredit });
  })

  .get("/history", verifyAuth(), async (c) => {
    const auth = c.get("authUser");

    if (!auth.token?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const transactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, auth.token.id))
      .orderBy(desc(creditTransactions.createdAt));

    return c.json({ data: transactions });
  })

  .get("/purchase", verifyAuth(), async (c) => {
    const auth = c.get("authUser");

    if (!auth.token?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get amount from query params
    const url = new URL(c.req.url);
    const amountInCents = parseInt(url.searchParams.get("amount") || "0", 10);

    if (!amountInCents || amountInCents <= 0) {
      return c.json({ error: "Invalid amount" }, 400);
    }

    // 0.002 USD per credit
    const credits = Math.round(amountInCents / 2);

    const products = [process.env.POLAR_PAYG_PRODUCT_ID!];

    if (products.length === 0) {
      return c.json({ error: "Missing products in query params" }, 400);
    }

    // Create a checkout session
    const session = await polar.checkouts.create({
      products,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/credits?credits_success=1`,
      customerId: url.searchParams.get("customerId") ?? undefined,
      customerExternalId:
        url.searchParams.get("customerExternalId") ?? undefined,
      customerEmail: url.searchParams.get("customerEmail") ?? auth.token.email,
      customerName: url.searchParams.get("customerName") ?? undefined,
      customerBillingAddress: url.searchParams.has("customerBillingAddress")
        ? JSON.parse(url.searchParams.get("customerBillingAddress") ?? "{}")
        : undefined,
      customerTaxId: url.searchParams.get("customerTaxId") ?? undefined,
      customerIpAddress: url.searchParams.get("customerIpAddress") ?? undefined,
      customerMetadata: url.searchParams.has("customerMetadata")
        ? JSON.parse(url.searchParams.get("customerMetadata") ?? "{}")
        : undefined,
      allowDiscountCodes: url.searchParams.has("allowDiscountCodes")
        ? url.searchParams.get("allowDiscountCodes") === "true"
        : undefined,
      discountId: url.searchParams.get("discountId") ?? undefined,
      metadata: url.searchParams.has("metadata")
        ? JSON.parse(url.searchParams.get("metadata") ?? "{}")
        : {
            type: "purchase_credits",
            userId: auth.token.id,
            credits: credits,
          },
      // Override the price to the custom amount
      amount: amountInCents,
    });

    if (!session.url) {
      return c.json({ error: "Failed to create session" }, 400);
    }

    return c.json({
      data: {
        url: session.url,
      },
    });
  });

export default app;
