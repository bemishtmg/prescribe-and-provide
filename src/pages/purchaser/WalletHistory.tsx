import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowDownLeft, ArrowUpRight, ExternalLink, ShoppingBag } from "lucide-react";
import { format } from "date-fns";

export default function WalletHistory() {
  const { user } = useAuth();

  const { data: balance } = useQuery({
    queryKey: ["user-balance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data.balance as number;
    },
    enabled: !!user,
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return <p className="text-center text-muted-foreground py-8">Loading transactions...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Balance Summary Card */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20">
            <Wallet className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-3xl font-bold text-emerald-500">
              ${balance !== undefined ? balance.toFixed(2) : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      {!transactions?.length ? (
        <div className="text-center py-16 space-y-3">
          <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">Your wallet is quiet!</p>
          <p className="text-sm text-muted-foreground">Start shopping to see your history here.</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0 pb-2">
            {transactions.map((tx: any) => {
              const isCredit = tx.type === "credit";
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        isCredit
                          ? "bg-emerald-500/10"
                          : "bg-destructive/10"
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {isCredit ? "Balance Top-Up" : "Purchase"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-semibold ${
                        isCredit ? "text-emerald-500" : "text-destructive"
                      }`}
                    >
                      {isCredit ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                    </span>
                    {tx.order_id && (
                      <Badge variant="outline" className="text-xs gap-1 cursor-default">
                        <ExternalLink className="w-3 h-3" />
                        #{tx.order_id.slice(0, 8)}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
