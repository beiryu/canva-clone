"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDownIcon, ArrowUpIcon, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetCreditHistory } from "../api/use-get-credit-history";
import { format } from "date-fns";

export function RecentTransactions() {
  const { data: history, isLoading: isLoadingHistory } = useGetCreditHistory();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Transactions</CardTitle>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </CardHeader>
      <CardContent>
        {isLoadingHistory ? (
          <div className="flex flex-col gap-y-4 items-center justify-center h-32">
            <Loader className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : history && history.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    {transaction.id}
                  </TableCell>
                  <TableCell>
                    {format(
                      new Date(transaction.createdAt),
                      "MMM d, yyyy HH:mm",
                    )}
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {transaction.referenceType === "initial_subscription" ||
                      transaction.referenceType === "purchase_credits" ? (
                        <ArrowUpIcon className="mr-1 h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownIcon className="mr-1 h-4 w-4 text-red-500" />
                      )}
                      {transaction.amount}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {transaction.balanceAfter}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col gap-y-4 items-center justify-center h-32">
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
