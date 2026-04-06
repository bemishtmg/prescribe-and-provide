import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Pill, LogOut, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { Badge } from "@/components/ui/badge";

interface AppHeaderProps {
  onCartOpen?: () => void;
}

export default function AppHeader({ onCartOpen }: AppHeaderProps) {
  const { user, role, signOut } = useAuth();

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
