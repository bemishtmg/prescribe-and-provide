import { useAuth } from "@/hooks/useAuth";
import AuthPage from "./AuthPage";
import PharmacistDashboard from "./pharmacist/PharmacistDashboard";
import PurchaserDashboard from "./purchaser/PurchaserDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill } from "lucide-react";

export default function Index() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 animate-pulse">
          <Pill className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2 flex flex-col items-center">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  if (role === "pharmacist") return <PharmacistDashboard />;
  return <PurchaserDashboard />;
}
