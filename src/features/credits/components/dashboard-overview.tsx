"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, DollarSign, TrendingUp, Users } from "lucide-react";
import { useGetCredits } from "../api/use-get-credits";
import { useGetCreditHistory } from "../api/use-get-credit-history";
import { format, subMonths } from "date-fns";

export function DashboardOverview() {
  const { data: credits } = useGetCredits();
  const { data: history } = useGetCreditHistory();

  // Calculate this month's and last month's credits
  const now = new Date();
  const thisMonth = format(now, "MMM yyyy");
  const lastMonth = format(subMonths(now, 1), "MMM yyyy");

  const calculateMonthlyStats = (month: string) => {
    if (!history) return { earned: 0, spent: 0 };

    return history.reduce(
      (acc, transaction) => {
        const transactionMonth = format(
          new Date(transaction.createdAt),
          "MMM yyyy",
        );
        if (transactionMonth === month) {
          if (
            transaction.referenceType === "initial_subscription" ||
            transaction.referenceType === "purchase_credits"
          ) {
            acc.earned += transaction.amount;
          } else {
            acc.spent += Math.abs(transaction.amount);
          }
        }
        return acc;
      },
      { earned: 0, spent: 0 },
    );
  };

  const thisMonthStats = calculateMonthlyStats(thisMonth);
  const lastMonthStats = calculateMonthlyStats(lastMonth);

  // Calculate percentage changes
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const earnedChange = calculatePercentageChange(
    thisMonthStats.earned,
    lastMonthStats.earned,
  );

  const spentChange = calculatePercentageChange(
    thisMonthStats.spent,
    lastMonthStats.spent,
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Available Credits
              </p>
              <p className="text-2xl font-bold mt-1">{credits?.balance || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span
                  className={
                    earnedChange >= 0 ? "text-green-500" : "text-red-500"
                  }
                >
                  {earnedChange >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(Math.round(earnedChange))}%
                </span>{" "}
                from last month
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Credits Used
              </p>
              <p className="text-2xl font-bold mt-1">
                {credits?.lifetimeSpent || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <span
                  className={
                    spentChange <= 0 ? "text-green-500" : "text-red-500"
                  }
                >
                  {spentChange >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(Math.round(spentChange))}%
                </span>{" "}
                from last month
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-destructive" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Credits Earned
              </p>
              <p className="text-2xl font-bold mt-1">
                {credits?.lifetimeEarned || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-500">Lifetime total</span>
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Recent Transactions
              </p>
              <p className="text-2xl font-bold mt-1">{history?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-blue-500">All time</span> transactions
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
