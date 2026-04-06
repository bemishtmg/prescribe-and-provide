import { createContext, useContext, useState, ReactNode } from "react";
import type { Tables } from "@/integrations/supabase/types";

type Medicine = Tables<"medicines">;

interface CartItem {
  medicine: Medicine;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (medicine: Medicine) => void;
  removeItem: (medicineId: string) => void;
  updateQuantity: (medicineId: string, quantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
  requiresPrescription: boolean;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (medicine: Medicine) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.medicine.id === medicine.id);
      if (existing) {
        return prev.map((i) =>
          i.medicine.id === medicine.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { medicine, quantity: 1 }];
    });
  };

  const removeItem = (medicineId: string) => {
    setItems((prev) => prev.filter((i) => i.medicine.id !== medicineId));
  };

  const updateQuantity = (medicineId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(medicineId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.medicine.id === medicineId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setItems([]);

  const totalPrice = items.reduce((sum, i) => sum + i.medicine.price * i.quantity, 0);
  const requiresPrescription = items.some((i) => i.medicine.requires_prescription);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalPrice, requiresPrescription, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
