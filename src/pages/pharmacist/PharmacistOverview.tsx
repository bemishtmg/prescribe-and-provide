import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Package, DollarSign, Clock, Check, X } from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending_validation: { label: "Pending", classes: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  awaiting_payment: { label: "Approved", classes: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  paid: { label: "Paid", classes: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  processing: { label: "Processing", classes: "bg-primary/10 text-primary border-primary/20" },
  shipped: { label: "Shipped", classes: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  rejected: { label: "Rejected", classes: "bg-red-500/15 text-red-600 border-red-500/30" },
};

export default function PharmacistOverview() {
  const queryClient = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ["pharmacist-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: medicines } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("medicines").select("*");
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
      toast.success("Order approved");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from("orders").update({ status: "rejected", rejection_reason: "Rejected from dashboard" }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacist-orders"] });
      toast.success("Order rejected");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pending = orders?.filter((o) => o.status === "pending_validation").length ?? 0;
  const totalOrders = orders?.length ?? 0;
  const totalMeds = medicines?.length ?? 0;
  const revenue = orders?.filter((o) => o.status === "paid" || o.status === "shipped" || o.status === "processing")
    .reduce((sum, o) => sum + o.total_price, 0) ?? 0;

  const stats = [
    { label: "Pending Verifications", value: pending, icon: Clock, color: "text-yellow-500" },
    { label: "Total Orders", value: totalOrders, icon: ClipboardList, color: "text-primary" },
    { label: "Medicines", value: totalMeds, icon: Package, color: "text-primary" },
    { label: "Revenue", value: `$${revenue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-500" },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-muted ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders with Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {!orders?.length ? (
              <p className="text-muted-foreground text-center py-4">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 8).map((order) => {
                  const config = statusConfig[order.status] ?? { label: order.status, classes: "" };
                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium font-mono">#{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={config.classes}>{config.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">${order.total_price.toFixed(2)}</p>
                        {order.status === "pending_validation" && (
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() => approveMutation.mutate(order.id)}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-600 hover:bg-red-500/10"
                              onClick={() => rejectMutation.mutate(order.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
