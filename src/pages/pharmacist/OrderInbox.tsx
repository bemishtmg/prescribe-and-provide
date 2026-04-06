import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check, X, Eye, Clock, FileText, Loader2, Lock, ShieldCheck } from "lucide-react";
import { SkeletonRow } from "@/components/SkeletonCard";
import PageTransition from "@/components/PageTransition";
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
      const { error } = await supabase.from("orders").update({ status: "awaiting_payment" }).eq("id", orderId);
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
      const { error } = await supabase.from("orders").update({ status: "rejected", rejection_reason: reason }).eq("id", orderId);
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
    <PageTransition>
      <div className="space-y-6">
        {/* Pending Verifications - Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-5 h-5 text-warning" />
              Pending Verifications ({pendingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : !pendingOrders.length ? (
              <p className="text-muted-foreground text-center py-8">No orders pending verification</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Prescription</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium font-mono text-sm">#{order.id.slice(0, 8)}</TableCell>
                        <TableCell className="font-semibold">${order.total_price.toFixed(2)}</TableCell>
                        <TableCell>
                          {order.prescription_url ? (
                            <Badge variant="outline" className="gap-1 text-xs"><FileText className="w-3 h-3" /> Uploaded</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status]}>Pending</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)} className="gap-1">
                            <Eye className="w-3.5 h-3.5" /> Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Other Orders */}
        {otherOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium font-mono text-sm">#{order.id.slice(0, 8)}</TableCell>
                        <TableCell className="font-semibold">${order.total_price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status]}>{order.status.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)} className="gap-1">
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Detail Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) { setSelectedOrder(null); setShowReject(false); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-mono">Order #{selectedOrder.id.slice(0, 8)}</span>
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
                        <div key={item.id} className="flex justify-between text-sm bg-muted/50 p-2.5 rounded-lg">
                          <span>{item.medicines?.name} × {item.quantity}</span>
                          <span className="font-medium">${(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedOrder.status === "pending_validation" && (
                  <div className="space-y-3 pt-2">
                    {!showReject ? (
                      <div className="flex gap-3">
                        <Button
                          className="flex-1 gap-2"
                          onClick={() => approveMutation.mutate(selectedOrder.id)}
                          disabled={approveMutation.isPending}
                        >
                          <Check className="w-4 h-4" /> Approve
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
    </PageTransition>
  );
}

function PrescriptionViewer({ prescriptionUrl }: { prescriptionUrl: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractPath = (url: string) => {
    const match = url.match(/\/prescriptions\/(.+)$/);
    return match ? match[1] : null;
  };

  const fetchSignedUrl = async () => {
    const path = extractPath(prescriptionUrl);
    if (!path) { setError("Invalid prescription path"); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-signed-prescription-url", { body: { path } });
      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);
      setSignedUrl(data.signedUrl);
      setTimeout(() => setSignedUrl(null), 55000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> Prescription</Label>
      {signedUrl ? (
        <div className="relative">
          <img src={signedUrl} alt="Prescription" className="w-full rounded-xl border border-border max-h-64 object-contain" />
          <Badge variant="outline" className="absolute top-2 right-2 bg-card/80 text-xs gap-1">
            <Lock className="w-3 h-3" /> 60s
          </Badge>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border bg-muted/30">
          <Lock className="w-6 h-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center">Stored securely. Generate a temporary link.</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button size="sm" onClick={fetchSignedUrl} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {loading ? "Loading..." : "View"}
          </Button>
        </div>
      )}
    </div>
  );
}
