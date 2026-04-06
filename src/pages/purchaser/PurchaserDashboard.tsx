import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import PurchaserSidebar from "@/components/PurchaserSidebar";
import Marketplace from "./Marketplace";
import MyOrders from "./MyOrders";
import WalletHistory from "./WalletHistory";
import MyPrescriptions from "./MyPrescriptions";
import CartSheet from "./CartSheet";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { AnimatePresence } from "framer-motion";

export default function PurchaserDashboard() {
  const [cartOpen, setCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("marketplace");
  const { itemCount } = useCart();

  const renderPage = () => {
    switch (activeTab) {
      case "marketplace": return <Marketplace />;
      case "orders": return <MyOrders />;
      case "wallet": return <WalletHistory />;
      case "prescriptions": return <MyPrescriptions />;
      default: return <Marketplace />;
    }
  };

  const titles: Record<string, string> = {
    marketplace: "Catalog",
    orders: "My Orders",
    wallet: "Wallet History",
    prescriptions: "My Prescriptions",
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <PurchaserSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-40 h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h2 className="text-base font-semibold">{titles[activeTab]}</h2>
            </div>
            <Button variant="outline" size="icon" className="relative" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="w-4 h-4" />
              {itemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {itemCount}
                </Badge>
              )}
            </Button>
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
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </SidebarProvider>
  );
}
