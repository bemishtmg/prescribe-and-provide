import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppHeader from "@/components/AppHeader";
import Marketplace from "./Marketplace";
import MyOrders from "./MyOrders";
import CartSheet from "./CartSheet";
import { ShoppingBag, ClipboardList } from "lucide-react";

export default function PurchaserDashboard() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onCartOpen={() => setCartOpen(true)} />
      <main className="container py-6">
        <Tabs defaultValue="marketplace" className="space-y-6">
          <TabsList>
            <TabsTrigger value="marketplace" className="gap-2">
              <ShoppingBag className="w-4 h-4" /> Marketplace
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ClipboardList className="w-4 h-4" /> My Orders
            </TabsTrigger>
          </TabsList>
          <TabsContent value="marketplace">
            <Marketplace />
          </TabsContent>
          <TabsContent value="orders">
            <MyOrders />
          </TabsContent>
        </Tabs>
      </main>
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
