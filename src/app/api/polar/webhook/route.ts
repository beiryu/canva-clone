import { Webhooks } from "@polar-sh/nextjs";

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET!;

export const POST = Webhooks({
  webhookSecret: POLAR_WEBHOOK_SECRET,
  // TODO: Thêm các handler như onPayload, onOrderCreated, onSubscriptionCreated,... để mapping vào DB nếu cần
});
