import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CreditCard, Clock, CheckCircle, Truck, XCircle, FileText, Loader2, AlertTriangle } from "lucide-react";

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending_validation: { icon: Clock, color: "bg-warning/10 text-warning border-warning/20", label: "Pending Review" },
  awaiting_payment: { icon: CreditCard, color: "bg-primary/10 text-primary border-primary/20", label: "Awaiting Payment" },
  paid: { icon: CheckCircle, color: "bg-success/10 text-success border-success/20", label: "Paid" },
  processing: { icon: Clock, color: "bg-primary/10 text-primary border-primary/20", label: "Processing" },
  shipped: { icon: Truck, color: "bg-success/10 text-success border-success/20", label: "Shipped" },
  rejected: { icon: XCircle, color: "bg-destructive/10 text-destructive border-destructive/20", label: "Rejected" },
};

export default function MyOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [showInsufficientFunds, setShowInsufficientFunds] = useState<{ balance: number; total: number } | null>(null);

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

  const { data: orders, isLoading } = useQuery({
    queryKey: ["purchaser-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, medicines(name))")
        .eq("purchaser_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const payMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.rpc("process_payment", { order_id: orderId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaser-orders"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["user-balance"] });
      toast.success("Payment successful! Your wallet has been charged.");
      setProcessingOrderId(null);
    },
    onError: (err: any) => {
      setProcessingOrderId(null);
      toast.error(err.message);
    },
  });

  const handlePay = (orderId: string, orderTotal: number) => {
    if (balance !== undefined && balance < orderTotal) {
      setShowInsufficientFunds({ balance, total: orderTotal });
      return;
    }
    // Show processing spinner for 1.5s then execute
    setProcessingOrderId(orderId);
    setTimeout(() => {
      payMutation.mutate(orderId);
    }, 1500);
  };

  if (isLoading) return <p className="text-center text-muted-foreground py-8">Loading orders...</p>;

  if (!orders?.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">No orders yet. Start shopping!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order: any) => {
        const config = statusConfig[order.status];
        const Icon = config.icon;
        const isProcessing = processingOrderId === order.id;
        return (
          <Card key={order.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Order #{order.id.slice(0, 8)}</CardTitle>
                <Badge className={config.color}>
                  <Icon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.medicines?.name} × {item.quantity}
                    </span>
                    <span>${(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="font-semibold">Total</span>
                <span className="font-bold">${order.total_price.toFixed(2)}</span>
              </div>

              {order.status === "rejected" && order.rejection_reason && (
                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <p className="text-sm text-destructive">
                    <strong>Reason:</strong> {order.rejection_reason}
                  </p>
                </div>
              )}

              {order.status === "awaiting_payment" && (
                <Button
                  className="w-full gap-2"
                  onClick={() => handlePay(order.id, order.total_price)}
                  disabled={isProcessing || payMutation.isPending}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Pay ${order.total_price.toFixed(2)} from Wallet
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Insufficient Funds Modal */}
      <Dialog open={!!showInsufficientFunds} onOpenChange={() => setShowInsufficientFunds(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Transaction Declined
            </DialogTitle>
          </DialogHeader>
          {showInsufficientFunds && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Insufficient funds in your wallet.
              </p>
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Your balance:</span>
                  <span className="font-semibold">${showInsufficientFunds.balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Order total:</span>
                  <span className="font-semibold text-destructive">${showInsufficientFunds.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-destructive/20 pt-2">
                  <span>Shortfall:</span>
                  <span className="font-bold text-destructive">
                    ${(showInsufficientFunds.total - showInsufficientFunds.balance).toFixed(2)}
                  </span>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setShowInsufficientFunds(null)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
