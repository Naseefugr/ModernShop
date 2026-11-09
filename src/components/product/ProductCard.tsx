import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { useNavigation } from "@/context/NavigationContext";
import { ShoppingCart, Star, Store, Check, AlertCircle } from "lucide-react";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { navigate } = useNavigation();
  const [justAdded, setJustAdded] = React.useState(false);

  const primaryImage =
    product.product_images?.find((img) => img.is_primary)?.image_url ||
    product.product_images?.[0]?.image_url ||
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80";

  const discountPercentage =
    product.original_price && product.original_price > product.selling_price
      ? Math.round(((product.original_price - product.selling_price) / product.original_price) * 100)
      : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <Card
      className="group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/40 cursor-pointer"
      onClick={() => navigate(`/products/${product.id}`)}
    >
      {/* Product Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={primaryImage}
          alt={product.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
          {discountPercentage && (
            <Badge variant="destructive" className="font-bold text-[10px] px-2 py-0.5 shadow-sm">
              {discountPercentage}% OFF
            </Badge>
          )}
          {product.is_featured && (
            <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600 font-semibold text-[10px] px-2 py-0.5 shadow-sm">
              Featured
            </Badge>
          )}
        </div>

        {/* Stock status indicator */}
        <div className="absolute bottom-2.5 right-2.5">
          {product.available_stock <= 0 ? (
            <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>
          ) : product.available_stock <= product.low_stock_threshold ? (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-[10px]">
              Only {product.available_stock} left
            </Badge>
          ) : (
            <span className="text-[11px] font-medium bg-background/80 backdrop-blur px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400">
              In Stock
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <CardHeader className="p-4 space-y-1.5 flex-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold text-primary/80 uppercase tracking-wider text-[11px]">
            {product.brand || product.categories?.name || "General"}
          </span>

          {/* Rating */}
          <div className="flex items-center gap-1 font-medium text-foreground">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{product.average_rating ? Number(product.average_rating).toFixed(1) : "4.5"}</span>
            <span className="text-muted-foreground text-[11px]">({product.total_reviews_count || 0})</span>
          </div>
        </div>

        <CardTitle className="text-base line-clamp-2 leading-snug font-semibold transition-colors group-hover:text-primary">
          {product.title}
        </CardTitle>

        {/* Salesman store info */}
        {product.salesman_profiles && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
            <Store className="h-3 w-3 text-muted-foreground/70" />
            <span className="truncate">{product.salesman_profiles.store_name}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-3 pt-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-foreground">
            ₹{Number(product.selling_price).toLocaleString("en-IN")}
          </span>
          {product.original_price && product.original_price > product.selling_price && (
            <span className="text-xs text-muted-foreground line-through">
              ₹{Number(product.original_price).toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full gap-2 transition-all"
          variant={justAdded ? "secondary" : "default"}
          disabled={product.available_stock <= 0}
          onClick={handleAddToCart}
        >
          {justAdded ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Added to Cart</span>
            </>
          ) : product.available_stock <= 0 ? (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>Out of Stock</span>
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              <span>Add to Cart</span>
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
