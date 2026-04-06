import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Upload, Pill } from "lucide-react";
import PageTransition from "@/components/PageTransition";

export default function MyPrescriptions() {
  const { user } = useAuth();

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">My Prescriptions</h2>
          <p className="text-sm text-muted-foreground mt-1">View and manage your uploaded prescriptions</p>
        </div>

        <div className="text-center py-16 space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium text-muted-foreground">No prescriptions uploaded yet</p>
            <p className="text-sm text-muted-foreground">Prescriptions are uploaded during checkout for Rx items.</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
