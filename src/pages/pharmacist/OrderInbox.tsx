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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Eye, Clock, FileText, Loader2, Lock, ShieldCheck, Search, Filter } from "lucide-react";
import { SkeletonRow } from "@/components/SkeletonCard";
import PageTransition from "@/components/PageTransition";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending_validation: { label: "Pending", classes: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  awaiting_payment: { label: "Approved", classes: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  paid: { label: "Paid", classes: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  processing: { label: "Processing", classes: "bg-primary/10 text-primary border-primary/20" },
  shipped: { label: "Shipped", classes: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  rejected: { label: "Rejected", classes: "bg-red-500/15 text-red-600 border-red-500/30" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, classes: "bg-muted text-muted-foreground" };
  return <Badge className={config.classes}>{config.label}</Badge>;
}

export default function OrderInbox() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectingInline, setRejectingInline] = useState<string | null>(null);
  const [inlineReason, setInlineReason] = useState("");

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
      setRejectingInline(null);
      setInlineReason("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = orders?.filter((o) => {
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) ?? [];

  const pendingOrders = filtered.filter((o) => o.status === "pending_validation");
  const otherOrders = filtered.filter((o) => o.status !== "pending_validation");

  const renderQuickActions = (order: Order) => {
    if (order.status !== "pending_validation") {
      return (
        <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)} className="gap-1">
          <Eye className="w-3.5 h-3.5" /> View
        </Button>
      );
    }

    if (rejectingInline === order.id) {
      return (
        <div className="flex items-center gap-2">
          <Input
            value={inlineReason}
            onChange={(e) => setInlineReason(e.target.value)}
            placeholder="Reason..."
            className="h-8 text-xs w-40"
          />
          <Button
            size="sm"
            variant="destructive"
            className="h-8 px-2"
            disabled={!inlineReason || rejectMutation.isPending}
            onClick={() => rejectMutation.mutate({ orderId: order.id, reason: inlineReason })}
          >
            {rejectMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setRejectingInline(null); setInlineReason(""); }}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
          disabled={approveMutation.isPending}
          onClick={() => approveMutation.mutate(order.id)}
        >
          <Check className="w-4 h-4 mr-1" /> Approve
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-500/10"
          onClick={() => setRejectingInline(order.id)}
        >
          <X className="w-4 h-4 mr-1" /> Reject
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setSelectedOrder(order)}>
          <Eye className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-card">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_validation">Pending</SelectItem>
              <SelectItem value="awaiting_payment">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pending Verifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-5 h-5 text-yellow-500" />
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
                      <TableHead className="text-right">Quick Actions</TableHead>
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
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell className="text-right">{renderQuickActions(order)}</TableCell>
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
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell className="text-right">{renderQuickActions(order)}</TableCell>
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
                  <StatusBadge status={selectedOrder.status} />
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
                          className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
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
