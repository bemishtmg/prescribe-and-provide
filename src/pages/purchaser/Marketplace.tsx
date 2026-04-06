import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingCart, FileText, Pill } from "lucide-react";

export default function Marketplace() {
  const { addItem } = useCart();

  const { data: medicines, isLoading } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .gt("stock_level", 0)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <p className="text-center text-muted-foreground py-8">Loading medicines...</p>;
  }

  if (!medicines?.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <Pill className="w-12 h-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">No medicines available right now.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {medicines.map((med) => (
        <Card key={med.id} className="flex flex-col">
          <CardContent className="pt-6 flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-foreground">{med.name}</h3>
              {med.requires_prescription && (
                <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary shrink-0">
                  <FileText className="w-3 h-3" /> Rx
                </Badge>
              )}
            </div>
            {med.description && (
              <p className="text-sm text-muted-foreground">{med.description}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-foreground">${med.price.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">{med.stock_level} in stock</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full gap-2"
              onClick={() => {
                addItem(med);
                toast.success(`${med.name} added to cart`);
              }}
            >
              <ShoppingCart className="w-4 h-4" /> Add to Cart
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
