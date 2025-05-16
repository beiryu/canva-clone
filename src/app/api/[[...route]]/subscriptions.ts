import { verifyAuth } from "@hono/auth-js";
import { eq, and } from "drizzle-orm";
import { Hono } from "hono";

import { checkIsActive } from "@/features/subscriptions/lib";

import { db } from "@/db/drizzle";
import { subscriptions } from "@/db/schema";
import { polar } from "@/lib/polar";
import { handleWebhookPayload } from "@polar-sh/adapter-utils";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks.js";
import { addCredits } from "@/features/credits/core/credit";

const app = new Hono()
  .post("/billing", verifyAuth(), async (c) => {
    const auth = c.get("authUser");

    if (!auth.token?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, auth.token.id));

    if (!subscription) {
      return c.json({ error: "No subscription found" }, 404);
    }

    const session = await polar.customerSessions.create({
      customerId: subscription.customerId,
    });

    if (!session.customerPortalUrl) {
      return c.json({ error: "Failed to create session" }, 400);
    }

    return c.json({ data: session.customerPortalUrl });
  })
  .get("/current", verifyAuth(), async (c) => {
    const auth = c.get("authUser");

    if (!auth.token?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, auth.token.id), eq(subscriptions.type, "initial_subscription")));

    const active = checkIsActive(subscription);

    return c.json({
      data: {
        ...subscription,
        active,
      },
    });
  })
  .get("/checkout", verifyAuth(), async (c) => {
    const auth = c.get("authUser");

    if (!auth.token?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const originURL = new URL(c.req.url);
    const products = [process.env.POLAR_ONETIME_PRODUCT_ID!];

    if (products.length === 0) {
      return c.json({ error: "Missing products in query params" }, 400);
    }

    const session = await polar.checkouts.create({
      products,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}?success=1`,
      customerId: originURL.searchParams.get("customerId") ?? undefined,
      customerExternalId:
        originURL.searchParams.get("customerExternalId") ?? undefined,
      customerEmail:
        originURL.searchParams.get("customerEmail") ?? auth.token.email,
      customerName: originURL.searchParams.get("customerName") ?? undefined,
      customerBillingAddress: originURL.searchParams.has(
        "customerBillingAddress",
      )
        ? JSON.parse(
            originURL.searchParams.get("customerBillingAddress") ?? "{}",
          )
        : undefined,
      customerTaxId: originURL.searchParams.get("customerTaxId") ?? undefined,
      customerIpAddress:
        originURL.searchParams.get("customerIpAddress") ?? undefined,
      customerMetadata: originURL.searchParams.has("customerMetadata")
        ? JSON.parse(originURL.searchParams.get("customerMetadata") ?? "{}")
        : undefined,
      allowDiscountCodes: originURL.searchParams.has("allowDiscountCodes")
        ? originURL.searchParams.get("allowDiscountCodes") === "true"
        : undefined,
      discountId: originURL.searchParams.get("discountId") ?? undefined,
      metadata: originURL.searchParams.has("metadata")
        ? JSON.parse(originURL.searchParams.get("metadata") ?? "{}")
        : {
            type: "initial_subscription",
            userId: auth.token.id,
          },
    });

    const url = session.url;

    if (!url) {
      return c.json({ error: "Failed to create session" }, 400);
    }

    return c.json({ data: url });
  })
  .post("/webhook", async (c) => {
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET!;

    const requestBody = await c.req.text();

    const webhookHeaders = {
      "webhook-id": c.req.header("webhook-id") ?? "",
      "webhook-timestamp": c.req.header("webhook-timestamp") ?? "",
      "webhook-signature": c.req.header("webhook-signature") ?? "",
    };

    let webhookPayload: ReturnType<typeof validateEvent>;
    try {
      webhookPayload = validateEvent(
        requestBody,
        webhookHeaders,
        webhookSecret,
      );
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        return c.json({ received: false }, { status: 403 });
      }

      throw error;
    }

    await handleWebhookPayload(webhookPayload, {
      webhookSecret,
      onOrderCreated: async (payload) => {
        const { data } = payload;

        await db.insert(subscriptions).values({
          status: data.status,
          userId: data.metadata.userId as string,
          customerId: data.customer.id as string,
          priceId: data.items[0].productPriceId as string,
          productId: data.productId,
          checkoutId: data.checkoutId,
          type: data.metadata.type as string,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      },
      onOrderPaid: async (payload) => {
        const { data } = payload;

        switch (data.productId) {
          case process.env.POLAR_ONETIME_PRODUCT_ID:
            try {
              const initialCredits = 1000;

              const [subscription] = await db
                .update(subscriptions)
                .set({
                  status: data.status,
                  updatedAt: new Date(),
                })
                .where(eq(subscriptions.checkoutId, data.checkoutId as string))
                .returning();

              if (subscription) {
                await addCredits({
                  userId: subscription.userId,
                  amount: initialCredits,
                  description: "Initial subscription credits",
                  metadata: {},
                  referenceId: subscription.id,
                  referenceType: subscription.type,
                });
              }
            } catch (error) {
              console.error(
                "Error adding initial subscription credits:",
                error,
              );
            }
            break;
          case process.env.POLAR_PAYG_PRODUCT_ID:
            try {
              const creditsToAdd = parseInt(data.metadata.credits as string);

              const [subscription] = await db
                .update(subscriptions)
                .set({
                  status: data.status,
                  updatedAt: new Date(),
                })
                .where(eq(subscriptions.checkoutId, data.checkoutId as string))
                .returning();

              if (subscription) {
                await addCredits({
                  userId: subscription.userId,
                  amount: creditsToAdd,
                  description: `Purchase ${creditsToAdd} credits`,
                  metadata: {},
                  referenceId: subscription.id,
                  referenceType: subscription.type,
                });
              }
            } catch (error) {
              console.error("Error purchasing credits:", error);
            }
            break;
          default:
            break;
        }
      },
    });

    return c.json(null, 200);
  });

export default app;
