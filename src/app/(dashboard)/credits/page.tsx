"use client";

import { DashboardOverview } from "@/features/credits/components/dashboard-overview";
import { CreditUsageChart } from "@/features/credits/components/credit-usage-chart";
import { RecentTransactions } from "@/features/credits/components/recent-transactions";
import { CreditPurchasing } from "@/features/credits/components/credit-purchasing";

export default function CreditsPage() {
  return (
    <div className="w-full p-6 space-y-6">
      <h1 className="text-3xl font-bold">Credits Management</h1>
      <DashboardOverview />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CreditUsageChart />
        <CreditPurchasing />
      </div>

      <RecentTransactions />
    </div>
  );
}
