import Stripe from "stripe";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { verifyAuth } from "@hono/auth-js";

import { checkIsActive } from "@/features/subscriptions/lib";

import { stripe } from "@/lib/stripe";
import { db } from "@/db/drizzle";
import { subscriptions } from "@/db/schema";
import { polar } from "@/lib/polar";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks.js";
import { handleWebhookPayload } from "@polar-sh/adapter-utils";
import { Webhooks } from "@polar-sh/nextjs";

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
      .where(eq(subscriptions.userId, auth.token.id));

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
    const products = [process.env.POLAR_PRODUCT_ID!];

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
        : {
          userId: auth.token.id
        },
      allowDiscountCodes: originURL.searchParams.has("allowDiscountCodes")
        ? originURL.searchParams.get("allowDiscountCodes") === "true"
        : undefined,
      discountId: originURL.searchParams.get("discountId") ?? undefined,
      metadata: originURL.searchParams.has("metadata")
        ? JSON.parse(originURL.searchParams.get("metadata") ?? "{}")
        : undefined,
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
    console.log('requestBody', requestBody);

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
      onCheckoutUpdated: async (payload) => {
        const subscription = await polar.subscriptions.get({
          id: webhookPayload.data.id
        })
        console.log(subscription);
        // await db.insert(subscriptions).values({
        //   status: payload.data.status,
        //   userId: payload.data.customerMetadata.userId as string,
        //   subscriptionId: payload.data.subscriptionId as string,
        //   customerId: payload.data.customerId as string,
        //   priceId: payload.data.productPriceId as string,
        //   currentPeriodEnd: payload.data.expiresAt,
        //   createdAt: new Date(),
        //   updatedAt: new Date(),
        // });
      },
      onOrderPaid: async (payload) => {
        await db
          .update(subscriptions)
          .set({
            status: payload.data.status,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, payload.data.subscriptionId as string));
      },
    });

    return c.json(null, 200);
  });

export default app;
