import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, Trash2, Upload, FileText } from "lucide-react";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const { items, updateQuantity, removeItem, clearCart, totalPrice, requiresPrescription } = useCart();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCheckout = async () => {
    if (!user || items.length === 0) return;
    if (requiresPrescription && !prescriptionFile) {
      toast.error("Please upload a prescription image for Rx items");
      return;
    }

    setSubmitting(true);
    try {
      let prescriptionUrl: string | null = null;

      if (prescriptionFile) {
        const ext = prescriptionFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("prescriptions")
          .upload(path, prescriptionFile);
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("prescriptions").getPublicUrl(path);
        prescriptionUrl = urlData.publicUrl;
      }

      const needsValidation = requiresPrescription;
      const status = needsValidation ? "pending_validation" : "awaiting_payment";

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          purchaser_id: user.id,
          status,
          prescription_url: prescriptionUrl,
          total_price: totalPrice,
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        medicine_id: i.medicine.id,
        quantity: i.quantity,
        price_at_purchase: i.medicine.price,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      clearCart();
      setPrescriptionFile(null);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["purchaser-orders"] });

      if (needsValidation) {
        toast.success("Order submitted! Waiting for pharmacist approval.");
      } else {
        toast.success("Order placed! Ready for payment.");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
          ) : (
            items.map((item) => (
              <div key={item.medicine.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{item.medicine.name}</p>
                    {item.medicine.requires_prescription && (
                      <FileText className="w-3 h-3 text-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">${item.medicine.price.toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.medicine.id, item.quantity - 1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.medicine.id)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border pt-4 space-y-4">
            {requiresPrescription && (
              <div className="space-y-2 p-3 rounded-lg bg-accent/50 border border-primary/20">
                <Label className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
                  <Upload className="w-4 h-4" />
                  Prescription Required
                </Label>
                <p className="text-xs text-muted-foreground">
                  Some items require a prescription. Upload an image to proceed.
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPrescriptionFile(e.target.files?.[0] ?? null)}
                  className="text-sm"
                />
                {prescriptionFile && (
                  <p className="text-xs text-primary">✓ {prescriptionFile.name}</p>
                )}
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold">${totalPrice.toFixed(2)}</span>
            </div>

            <SheetFooter>
              <Button className="w-full" onClick={handleCheckout} disabled={submitting}>
                {submitting ? "Placing order..." : requiresPrescription ? "Submit for Validation" : "Place Order"}
              </Button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
