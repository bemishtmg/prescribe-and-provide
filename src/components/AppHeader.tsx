import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Pill, LogOut, ShoppingCart, Wallet } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AppHeaderProps {
  onCartOpen?: () => void;
}

export default function AppHeader({ onCartOpen }: AppHeaderProps) {
  const { user, role, signOut } = useAuth();

  const { data: balance } = useQuery({
    queryKey: ["user-balance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data.balance as number;
    },
    enabled: !!user && role === "purchaser",
  });

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
            <Pill className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">PharmaCare</h1>
            <p className="text-xs text-muted-foreground capitalize">{role} Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {role === "purchaser" && balance !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">${balance.toFixed(2)}</span>
            </div>
          )}
          {role === "purchaser" && onCartOpen && (
            <CartButton onClick={onCartOpen} />
          )}
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {user?.email}
          </span>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function CartButton({ onClick }: { onClick: () => void }) {
  const { itemCount } = useCart();
  return (
    <Button variant="outline" size="icon" className="relative" onClick={onClick}>
      <ShoppingCart className="w-4 h-4" />
      {itemCount > 0 && (
        <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
          {itemCount}
        </Badge>
      )}
    </Button>
  );
}
