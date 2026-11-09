import { useCart } from "@/context/CartContext";
import { useNavigation } from "@/context/NavigationContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Trash2, ArrowRight, Store, ArrowLeft } from "lucide-react";

export function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, subtotal, itemCount } = useCart();
  const { navigate } = useNavigation();

  const shippingFee = subtotal >= 999 || subtotal === 0 ? 0 : 49;
  const finalTotal = subtotal + shippingFee;

  // Group items by seller store
  const vendorGroups = cart.reduce((groups, item) => {
    const storeName = item.product.salesman_profiles?.store_name || "General Merchant";
    if (!groups[storeName]) groups[storeName] = [];
    groups[storeName].push(item);
    return groups;
  }, {} as Record<string, typeof cart>);

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4 max-w-md">
        <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <ShoppingCart className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Your Cart is Empty</h2>
        <p className="text-muted-foreground text-sm">
          Explore our marketplace catalog and add items from independent sellers across India.
        </p>
        <Button onClick={() => navigate("/products")} className="gap-2 mt-2">
          <span>Start Shopping</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-6xl">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Shopping Cart</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            You have <span className="font-semibold text-foreground">{itemCount}</span> items in your cart
          </p>
        </div>

        <button
          onClick={clearCart}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Cart Items Partitioned by Vendor */}
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(vendorGroups).map(([storeName, items]) => (
            <Card key={storeName} className="overflow-hidden border">
              <CardHeader className="py-3 px-5 bg-muted/40 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Fulfilled by: <span className="text-foreground">{storeName}</span>
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {items.length} {items.length === 1 ? "Item" : "Items"}
                </Badge>
              </CardHeader>

              <CardContent className="p-0 divide-y">
                {items.map((item) => {
                  const unitPrice =
                    Number(item.product.selling_price) +
                    (item.selectedVariant?.additional_price || 0);

                  const img =
                    item.product.product_images?.find((i) => i.is_primary)?.image_url ||
                    item.product.product_images?.[0]?.image_url ||
                    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80";

                  return (
                    <div
                      key={`${item.product.id}-${item.selectedVariant?.id || "base"}`}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={img}
                          alt={item.product.title}
                          className="h-20 w-20 rounded-lg object-cover bg-muted shrink-0 cursor-pointer"
                          onClick={() => navigate(`/products/${item.product.id}`)}
                        />
                        <div className="space-y-1">
                          <h4
                            className="text-sm font-semibold hover:text-primary cursor-pointer line-clamp-1"
                            onClick={() => navigate(`/products/${item.product.id}`)}
                          >
                            {item.product.title}
                          </h4>
                          {item.selectedVariant && (
                            <p className="text-xs text-muted-foreground">
                              Variant: <span className="font-medium text-foreground">{item.selectedVariant.variant_name}</span>
                            </p>
                          )}
                          <p className="text-xs font-bold text-foreground">
                            ₹{unitPrice.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>

                      {/* Quantity & Delete Controls */}
                      <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                        <div className="flex items-center border rounded-md bg-background">
                          <button
                            className="px-2.5 py-1 text-sm font-bold hover:bg-muted"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity - 1,
                                item.selectedVariant?.id
                              )
                            }
                          >
                            -
                          </button>
                          <span className="px-3 py-1 text-xs font-bold">{item.quantity}</span>
                          <button
                            className="px-2.5 py-1 text-sm font-bold hover:bg-muted"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity + 1,
                                item.selectedVariant?.id
                              )
                            }
                          >
                            +
                          </button>
                        </div>

                        <span className="font-extrabold text-sm w-20 text-right">
                          ₹{(unitPrice * item.quantity).toLocaleString("en-IN")}
                        </span>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            removeFromCart(item.product.id, item.selectedVariant?.id)
                          }
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/products")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Continue Shopping</span>
          </Button>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20 shadow-md">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items Subtotal:</span>
                <span className="font-semibold">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Shipping:</span>
                <span className="font-semibold text-emerald-600">
                  {shippingFee === 0 ? "FREE" : `₹${shippingFee}`}
                </span>
              </div>

              {shippingFee > 0 && (
                <div className="text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 p-2 rounded">
                  Add ₹{(999 - subtotal).toLocaleString("en-IN")} more to unlock FREE Delivery!
                </div>
              )}

              <div className="border-t pt-3 flex justify-between items-baseline">
                <span className="font-bold text-base">Grand Total:</span>
                <span className="text-2xl font-black text-primary">
                  ₹{finalTotal.toLocaleString("en-IN")}
                </span>
              </div>

              <Button
                size="lg"
                className="w-full gap-2 mt-2 shadow-lg"
                onClick={() => navigate("/checkout")}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="text-[11px] text-center text-muted-foreground space-y-1 pt-1">
                <p>Supports UPI, Debit/Credit Cards & COD</p>
                <p className="text-[10px]">Encrypted & Secure 256-Bit Checkout</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
