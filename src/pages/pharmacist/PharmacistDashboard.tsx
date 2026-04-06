import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppHeader from "@/components/AppHeader";
import InventoryManager from "./InventoryManager";
import OrderInbox from "./OrderInbox";
import { Package, Inbox } from "lucide-react";

export default function PharmacistDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6">
        <Tabs defaultValue="inbox" className="space-y-6">
          <TabsList>
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="w-4 h-4" /> Order Inbox
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <Package className="w-4 h-4" /> Inventory
            </TabsTrigger>
          </TabsList>
          <TabsContent value="inbox">
            <OrderInbox />
          </TabsContent>
          <TabsContent value="inventory">
            <InventoryManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
