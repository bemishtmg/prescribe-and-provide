import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowDownLeft, ArrowUpRight, ExternalLink, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { SkeletonRow } from "@/components/SkeletonCard";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";

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

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Glassmorphism Balance Card */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <Card className="glass bg-gradient-to-br from-primary/5 via-card to-primary/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="flex items-center gap-5 py-8 relative z-10">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15">
                <Wallet className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Virtual Balance</p>
                <p className="text-4xl font-bold text-primary mt-1">
                  ${balance !== undefined ? balance.toFixed(2) : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transaction List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : !transactions?.length ? (
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
              {transactions.map((tx: any, i: number) => {
                const isCredit = tx.type === "credit";
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${
                        isCredit ? "bg-success/10" : "bg-destructive/10"
                      }`}>
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4 text-success" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{isCredit ? "Balance Top-Up" : "Purchase"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${isCredit ? "text-success" : "text-destructive"}`}>
                        {isCredit ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                      </span>
                      {tx.order_id && (
                        <Badge variant="outline" className="text-xs gap-1 cursor-default">
                          <ExternalLink className="w-3 h-3" />
                          #{tx.order_id.slice(0, 8)}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
