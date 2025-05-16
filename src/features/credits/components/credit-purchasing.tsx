"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { usePurchaseCredits } from "@/features/credits/api/use-purchase-credits";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePaywall } from "@/features/subscriptions/hooks/use-paywall";
import { useGetCredits } from "../api/use-get-credits";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Credit conversion rates
const CREDIT_CONVERSION = 50; // 1$ = 50 credits

const predefinedAmounts = [
  { price: 10, credits: 500 },
  { price: 20, credits: 1000 },
  { price: 50, credits: 2500 },
  { price: 100, credits: 5000 },
];

export function CreditPurchasing() {
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<number>(10);

  const { mutate: purchaseCredits, isPending: isPurchasing } =
    usePurchaseCredits();

  const { shouldBlock, triggerPaywall } = usePaywall();

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount(amount);
  };

  const handlePurchase = () => {
    if (shouldBlock) {
      triggerPaywall();
      return;
    }

    if (customAmount < 5) {
      toast.error("Please enter an amount greater than $5");
      return;
    }

    // Convert dollars to cents
    const amountInCents = Math.floor(customAmount * 100);

    purchaseCredits(amountInCents, {
      onSuccess: (data) => {
        // Open the Polar checkout URL
        window.open(data.url, "_blank");
      },
      onError: (error) => {
        console.error(error);
        toast.error("Error creating checkout");
      },
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Purchase Credits</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div>
            <div className="mb-4 text-sm font-medium">Select amount</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {predefinedAmounts.map((option) => (
                <button
                  key={option.price}
                  onClick={() => handleAmountSelect(option.price)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border p-3 transition-all hover:border-primary",
                    selectedAmount === option.price
                      ? "border-primary bg-primary/5"
                      : "border-border",
                  )}
                >
                  <div className="flex items-center gap-1 text-lg font-semibold">
                    ${option.price}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">Custom amount</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={customAmount}
                  onChange={(e) =>
                    setCustomAmount(parseFloat(e.target.value) || 0)
                  }
                  min={5}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Minimum purchase amount is $5
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-muted-foreground">
                Credits to receive
              </span>
              <span className="text-sm font-medium text-primary">
                {customAmount * CREDIT_CONVERSION} credits
              </span>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handlePurchase}
                disabled={isPurchasing || customAmount < 5 || shouldBlock}
                className="w-full"
                size="lg"
              >
                {isPurchasing ? "Processing..." : "Purchase Credits"}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="flex items-center gap-3 rounded-lg py-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="text-xs">
                  Credits will be added to your account immediately after
                  successful payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
