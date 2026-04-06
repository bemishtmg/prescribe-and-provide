import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import PharmacistSidebar from "@/components/PharmacistSidebar";
import InventoryManager from "./InventoryManager";
import OrderInbox from "./OrderInbox";
import PharmacistOverview from "./PharmacistOverview";
import GlobalLedger from "./GlobalLedger";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";

export default function PharmacistDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleResetBalances = async () => {
    setResetting(true);
    try {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id");
      if (profileError) throw profileError;

      for (const profile of profiles || []) {
        await supabase.rpc("reset_user_balance", { _user_id: profile.user_id });
      }

      toast.success("All user balances reset to $1,000!");
      setResetDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResetting(false);
    }
  };

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard": return <PharmacistOverview />;
      case "inbox": return <OrderInbox />;
      case "inventory": return <InventoryManager />;
      case "ledger": return <GlobalLedger />;
      default: return <PharmacistOverview />;
    }
  };

  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    inbox: "Order Verifications",
    inventory: "Inventory Management",
    ledger: "Global Ledger",
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <PharmacistSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onResetBalances={() => setResetDialogOpen(true)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h2 className="text-base font-semibold">{titles[activeTab]}</h2>
            </div>
          </header>

          <main className="flex-1 p-6">
            <AnimatePresence mode="wait">
              <div key={activeTab}>
                {renderPage()}
              </div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Reset Balances Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset All User Balances</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will reset all purchaser wallet balances to $1,000.00 for demo purposes.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleResetBalances} disabled={resetting} className="flex-1">
              {resetting ? "Resetting..." : "Reset to $1,000"}
            </Button>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
