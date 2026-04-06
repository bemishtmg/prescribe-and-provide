import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Eye, Clock, FileText, Loader2, Lock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;

const statusColors: Record<string, string> = {
  pending_validation: "bg-warning/10 text-warning border-warning/20",
  awaiting_payment: "bg-primary/10 text-primary border-primary/20",
  paid: "bg-success/10 text-success border-success/20",
  processing: "bg-primary/10 text-primary border-primary/20",
  shipped: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function OrderInbox() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["pharmacist-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orderItems } = useQuery({
    queryKey: ["order-items", selectedOrder?.id],
    enabled: !!selectedOrder,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*, medicines(name)")
        .eq("order_id", selectedOrder!.id);
      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "awaiting_payment" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacist-orders"] });
      toast.success("Order approved for payment");
      setSelectedOrder(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "rejected", rejection_reason: reason })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacist-orders"] });
      toast.success("Order rejected");
      setSelectedOrder(null);
      setShowReject(false);
      setRejectionReason("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pendingOrders = orders?.filter((o) => o.status === "pending_validation") ?? [];
  const otherOrders = orders?.filter((o) => o.status !== "pending_validation") ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" />
            Pending Validation ({pendingOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-4">Loading...</p>
          ) : !pendingOrders.length ? (
            <p className="text-muted-foreground text-center py-4">No orders pending validation</p>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <OrderCard key={order.id} order={order} onView={() => setSelectedOrder(order)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {otherOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {otherOrders.map((order) => (
                <OrderCard key={order.id} order={order} onView={() => setSelectedOrder(order)} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) { setSelectedOrder(null); setShowReject(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Order #{selectedOrder.id.slice(0, 8)}</span>
                <Badge className={statusColors[selectedOrder.status]}>
                  {selectedOrder.status.replace(/_/g, " ")}
                </Badge>
              </div>

              <div className="text-lg font-semibold">Total: ${selectedOrder.total_price.toFixed(2)}</div>

              {selectedOrder.prescription_url && (
                <PrescriptionViewer prescriptionUrl={selectedOrder.prescription_url} />
              )}

              {orderItems && (
                <div className="space-y-2">
                  <Label>Items</Label>
                  <div className="space-y-1">
                    {orderItems.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm bg-muted/50 p-2 rounded">
                        <span>{item.medicines?.name} × {item.quantity}</span>
                        <span>${(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder.status === "pending_validation" && (
                <div className="space-y-3">
                  {!showReject ? (
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => approveMutation.mutate(selectedOrder.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="w-4 h-4" /> Approve for Payment
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 gap-2"
                        onClick={() => setShowReject(true)}
                      >
                        <X className="w-4 h-4" /> Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Rejection Reason</Label>
                      <Input
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why..."
                        required
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => rejectMutation.mutate({ orderId: selectedOrder.id, reason: rejectionReason })}
                          disabled={!rejectionReason || rejectMutation.isPending}
                        >
                          Confirm Reject
                        </Button>
                        <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderCard({ order, onView }: { order: Order; onView: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="space-y-1">
        <span className="text-sm font-medium">Order #{order.id.slice(0, 8)}</span>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[order.status]}>
            {order.status.replace(/_/g, " ")}
          </Badge>
          <span className="text-sm text-muted-foreground">${order.total_price.toFixed(2)}</span>
          {order.prescription_url && <FileText className="w-3 h-3 text-primary" />}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onView} className="gap-2">
        <Eye className="w-4 h-4" /> View
      </Button>
    </div>
  );
}

function PrescriptionViewer({ prescriptionUrl }: { prescriptionUrl: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract the storage path from the full URL
  const extractPath = (url: string) => {
    const match = url.match(/\/prescriptions\/(.+)$/);
    return match ? match[1] : null;
  };

  const fetchSignedUrl = async () => {
    const path = extractPath(prescriptionUrl);
    if (!path) {
      setError("Invalid prescription path");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-signed-prescription-url",
        { body: { path } }
      );
      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);
      setSignedUrl(data.signedUrl);

      // Auto-expire after 55 seconds (before the 60s server expiry)
      setTimeout(() => setSignedUrl(null), 55000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <FileText className="w-4 h-4" /> Prescription Image
      </Label>
      {signedUrl ? (
        <div className="relative">
          <img
            src={signedUrl}
            alt="Prescription"
            className="w-full rounded-lg border border-border max-h-64 object-contain"
          />
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="bg-card/80 text-xs gap-1">
              <Lock className="w-3 h-3" /> Expires in 60s
            </Badge>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 p-6 rounded-lg border border-border bg-muted/30">
          <Lock className="w-6 h-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center">
            Prescription is stored securely. Click to generate a temporary viewing link.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button size="sm" onClick={fetchSignedUrl} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {loading ? "Loading..." : "View Prescription"}
          </Button>
        </div>
      )}
    </div>
  );
}
