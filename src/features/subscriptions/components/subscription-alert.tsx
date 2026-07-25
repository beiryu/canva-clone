"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useFailModal } from "@/features/subscriptions/store/use-fail-modal";
import { useSuccessModal } from "@/features/subscriptions/store/use-success-modal";
import { useCreditsSuccessModal } from "@/features/subscriptions/store/use-credits-success-modal";

export const SubscriptionAlert = () => {
  const params = useSearchParams();

  const { onOpen: onOpenFail } = useFailModal();
  const { onOpen: onOpenSuccess } = useSuccessModal();
  const { onOpen: onOpenCreditsSuccess } = useCreditsSuccessModal();

  const canceled = params.get("canceled");
  const success = params.get("success");
  const creditsSuccess = params.get("credits_success");

  useEffect(() => {
    if (canceled) {
      onOpenFail();
    }

    if (success) {
      onOpenSuccess();
    }

    if (creditsSuccess) {
      onOpenCreditsSuccess();
    }
  }, [
    canceled,
    onOpenFail,
    success,
    onOpenSuccess,
    creditsSuccess,
    onOpenCreditsSuccess,
  ]);

  return null;
};
