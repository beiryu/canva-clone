import { subscriptions } from "@/db/schema";

export const checkIsActive = (
  subscription: typeof subscriptions.$inferSelect,
) => {
  let active = false;

  if (subscription && subscription.productId) {
    active =
      subscription.status === "paid" &&
      subscription.type === "initial_subscription";
  }

  return active;
};
