"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useGetCreditHistory } from "../api/use-get-credit-history";
import { format } from "date-fns";
import { Loader } from "lucide-react";

export function CreditUsageChart() {
  const { data: history, isLoading: isLoadingHistory } = useGetCreditHistory();

  // Process data for the chart
  const chartData =
    history?.reduce((acc: any[], transaction) => {
      const date = format(new Date(transaction.createdAt), "MMM d");
      const existingDay = acc.find((item) => item.name === date);

      if (existingDay) {
        if (
          transaction.referenceType === "initial_subscription" ||
          transaction.referenceType === "purchase_credits"
        ) {
          existingDay.credit += transaction.amount;
        } else {
          existingDay.usage += Math.abs(transaction.amount);
        }
      } else {
        acc.push({
          name: date,
          credit:
            transaction.referenceType === "initial_subscription" ||
            transaction.referenceType === "purchase_credits"
              ? transaction.amount
              : 0,
          usage:
            transaction.referenceType === "initial_subscription" ||
            transaction.referenceType === "purchase_credits"
              ? 0
              : Math.abs(transaction.amount),
        });
      }

      return acc;
    }, []) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Usage</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingHistory ? (
          <div className="flex flex-col gap-y-4 items-center justify-center h-[300px]">
            <Loader className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="bar">
            <TabsList className="mb-4">
              <TabsTrigger value="bar">Bar</TabsTrigger>
              <TabsTrigger value="line">Line</TabsTrigger>
            </TabsList>

            <TabsContent value="line" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="credit"
                    name="Credits Earned"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="usage"
                    name="Credits Used"
                    stroke="#82ca9d"
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="bar" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="credit" name="Credits Earned" fill="#8884d8" />
                  <Bar dataKey="usage" name="Credits Used" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
