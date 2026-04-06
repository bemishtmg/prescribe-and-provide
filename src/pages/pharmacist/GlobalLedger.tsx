import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { SkeletonRow } from "@/components/SkeletonCard";
import PageTransition from "@/components/PageTransition";

export default function GlobalLedger() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["all-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <PageTransition>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              All Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : !transactions?.length ? (
              <p className="text-muted-foreground text-center py-8">No transactions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx: any) => {
                      const isCredit = tx.type === "credit";
                      return (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                isCredit ? "bg-success/10" : "bg-destructive/10"
                              }`}>
                                {isCredit ? (
                                  <ArrowDownLeft className="w-3.5 h-3.5 text-success" />
                                ) : (
                                  <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
                                )}
                              </div>
                              <span className="text-sm">{isCredit ? "Credit" : "Debit"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {tx.user_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            {tx.order_id ? (
                              <Badge variant="outline" className="text-xs">#{tx.order_id.slice(0, 8)}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`font-semibold text-sm ${isCredit ? "text-success" : "text-destructive"}`}>
                              {isCredit ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), "MMM d, h:mm a")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
