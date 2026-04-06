import { useAuth } from "@/hooks/useAuth";
import AuthPage from "./AuthPage";
import PharmacistDashboard from "./pharmacist/PharmacistDashboard";
import PurchaserDashboard from "./purchaser/PurchaserDashboard";

export default function Index() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  if (role === "pharmacist") return <PharmacistDashboard />;
  return <PurchaserDashboard />;
}
