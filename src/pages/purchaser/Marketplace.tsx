import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShoppingCart, FileText, Pill, Search, Sparkles, Heart, Activity, Shield } from "lucide-react";
import { SkeletonCard } from "@/components/SkeletonCard";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";

const categories = [
  { label: "All", value: "all", icon: Sparkles },
  { label: "Pain Relief", value: "pain", icon: Activity },
  { label: "Vitamins", value: "vitamins", icon: Heart },
  { label: "Chronic Care", value: "chronic", icon: Shield },
];

export default function Marketplace() {
  const { addItem } = useCart();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

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

  const filtered = medicines?.filter((med) => {
    const matchesSearch = med.name.toLowerCase().includes(search.toLowerCase()) ||
      (med.description?.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search medicines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <Button
                key={cat.value}
                variant={category === cat.value ? "default" : "outline"}
                size="sm"
                className="gap-1.5 shrink-0 transition-all duration-200"
                onClick={() => setCategory(cat.value)}
              >
                <cat.icon className="w-3.5 h-3.5" />
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : !filtered?.length ? (
          <div className="text-center py-16 space-y-3">
            <Pill className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No medicines found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((med, i) => (
              <motion.div
                key={med.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Card className="group flex flex-col overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 border-border/80">
                  {/* Image placeholder */}
                  <div className="h-36 bg-gradient-to-br from-muted to-secondary flex items-center justify-center relative overflow-hidden">
                    <Pill className="w-10 h-10 text-muted-foreground/30 group-hover:scale-110 transition-transform duration-300" />
                    {med.requires_prescription && (
                      <Badge className="absolute top-3 right-3 gap-1 text-[10px] bg-primary/90 text-primary-foreground border-0">
                        <FileText className="w-3 h-3" /> Rx Required
                      </Badge>
                    )}
                  </div>
                  <CardContent className="pt-4 pb-4 flex-1 flex flex-col gap-3">
                    <div className="flex-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        {med.requires_prescription ? "Prescription" : "Over the Counter"}
                      </p>
                      <h3 className="font-semibold text-foreground mt-1 leading-tight">{med.name}</h3>
                      {med.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{med.description}</p>
                      )}
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-lg font-bold text-foreground">${med.price.toFixed(2)}</span>
                        <p className="text-[10px] text-muted-foreground">{med.stock_level} in stock</p>
                      </div>
                      <Button
                        size="sm"
                        className="gap-1.5 transition-all duration-200 active:scale-95"
                        onClick={() => {
                          addItem(med);
                          toast.success(`${med.name} added to cart`);
                        }}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
