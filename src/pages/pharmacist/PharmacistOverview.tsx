import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Package, DollarSign, Clock } from "lucide-react";
import PageTransition from "@/components/PageTransition";

export default function PharmacistOverview() {
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

  const pending = orders?.filter((o) => o.status === "pending_validation").length ?? 0;
  const totalOrders = orders?.length ?? 0;
  const totalMeds = medicines?.length ?? 0;
  const revenue = orders?.filter((o) => o.status === "paid" || o.status === "shipped" || o.status === "processing")
    .reduce((sum, o) => sum + o.total_price, 0) ?? 0;

  const stats = [
    { label: "Pending Verifications", value: pending, icon: Clock, color: "text-warning" },
    { label: "Total Orders", value: totalOrders, icon: ClipboardList, color: "text-primary" },
    { label: "Medicines", value: totalMeds, icon: Package, color: "text-primary" },
    { label: "Revenue", value: `$${revenue.toFixed(2)}`, icon: DollarSign, color: "text-success" },
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

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {!orders?.length ? (
              <p className="text-muted-foreground text-center py-4">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{order.status.replace(/_/g, " ")}</p>
                    </div>
                    <p className="text-sm font-semibold">${order.total_price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
