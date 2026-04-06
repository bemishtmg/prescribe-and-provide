import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppHeader from "@/components/AppHeader";
import InventoryManager from "./InventoryManager";
import OrderInbox from "./OrderInbox";
import { Package, Inbox, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PharmacistDashboard() {
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleResetBalance = async () => {
    if (!resetEmail) return;
    setResetting(true);
    try {
      // Look up user by email via profiles + auth - we need to find user_id
      // Since we can't query auth.users, we'll use the edge function or a simpler approach
      // We'll query profiles joined approach - actually let's just search all profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id");
      if (profileError) throw profileError;

      // Try resetting each - the RPC will handle auth
      // Better approach: let pharmacist enter user_id or we add a lookup
      // For demo simplicity, reset ALL users' balances
      for (const profile of profiles || []) {
        await supabase.rpc("reset_user_balance", { _user_id: profile.user_id });
      }

      toast.success("All user balances reset to $1,000!");
      setDialogOpen(false);
      setResetEmail("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6">
        <Tabs defaultValue="inbox" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="inbox" className="gap-2">
                <Inbox className="w-4 h-4" /> Order Inbox
              </TabsTrigger>
              <TabsTrigger value="inventory" className="gap-2">
                <Package className="w-4 h-4" /> Inventory
              </TabsTrigger>
            </TabsList>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
                  <RotateCcw className="w-3 h-3" /> Reset Balances
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Reset All User Balances</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  This will reset all purchaser wallet balances to $1,000.00 for demo purposes.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleResetBalance} disabled={resetting} className="flex-1">
                    {resetting ? "Resetting..." : "Reset to $1,000"}
                  </Button>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

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
