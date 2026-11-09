import React, { createContext, useContext, useEffect, useState } from "react";
import type { Product, ProductVariant, CartItem } from "@/types";

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant | null) => void;
  removeFromCart: (productId: string, variantId?: string | null) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "modernshop_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      console.error("Failed to save cart to localStorage", err);
    }
  }, [cart]);

  const addToCart = (product: Product, quantity = 1, variant: ProductVariant | null = null) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          (variant ? item.selectedVariant?.id === variant.id : !item.selectedVariant)
      );

      if (existingIndex > -1) {
        const next = [...prev];
        const newQty = next[existingIndex].quantity + quantity;
        const maxStock = variant ? variant.available_stock : product.available_stock;
        next[existingIndex].quantity = Math.min(newQty, maxStock);
        return next;
      }

      return [...prev, { product, selectedVariant: variant, quantity }];
    });
  };

  const removeFromCart = (productId: string, variantId: string | null = null) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId &&
            (variantId ? item.selectedVariant?.id === variantId : !item.selectedVariant)
          )
      )
    );
  };

  const updateQuantity = (productId: string, quantity: number, variantId: string | null = null) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (
          item.product.id === productId &&
          (variantId ? item.selectedVariant?.id === variantId : !item.selectedVariant)
        ) {
          const maxStock = item.selectedVariant
            ? item.selectedVariant.available_stock
            : item.product.available_stock;
          return { ...item, quantity: Math.min(quantity, maxStock) };
        }
        return item;
      })
    );
  };

  const clearCart = () => setCart([]);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = cart.reduce((sum, item) => {
    const unitPrice =
      Number(item.product.selling_price) + (item.selectedVariant?.additional_price || 0);
    return sum + unitPrice * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
