import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { useNavigation } from "@/context/NavigationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Star,
  Store,
  Truck,
  ShieldCheck,
  RotateCcw,
  ShoppingCart,
  Check,
  ArrowLeft,
  Share2,
} from "lucide-react";
import type { Product, ProductVariant } from "@/types";

export function ProductDetailPage({ productId }: { productId: string }) {
  const { addToCart } = useCart();
  const { navigate } = useNavigation();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            categories (*),
            salesman_profiles (*),
            product_images (*),
            product_variants (*)
          `)
          .eq("id", productId)
          .single();

        if (error) throw error;
        if (data) {
          const prod = data as Product;
          setProduct(prod);

          // Default Image
          const primaryImg =
            prod.product_images?.find((img) => img.is_primary)?.image_url ||
            prod.product_images?.[0]?.image_url ||
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80";
          setSelectedImage(primaryImg);

          // Default Variant
          if (prod.product_variants && prod.product_variants.length > 0) {
            setSelectedVariant(prod.product_variants[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching product detail:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (productId) loadProduct();
  }, [productId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="text-2xl font-bold">Product Not Found</h2>
        <p className="text-muted-foreground text-sm">
          The requested product may have been removed or is temporarily unavailable.
        </p>
        <Button onClick={() => navigate("/products")}>Back to Catalog</Button>
      </div>
    );
  }

  const effectivePrice =
    Number(product.selling_price) + (selectedVariant?.additional_price || 0);

  const availableStock = selectedVariant
    ? selectedVariant.available_stock
    : product.available_stock;

  const discountPercentage =
    product.original_price && product.original_price > effectivePrice
      ? Math.round(((product.original_price - effectivePrice) / product.original_price) * 100)
      : null;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedVariant);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedVariant);
    navigate("/cart");
  };

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-6xl">
      {/* Breadcrumbs & Navigation */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/products")}
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Products</span>
          </button>
          <span>/</span>
          <span>{product.categories?.name}</span>
          <span>/</span>
          <span className="text-foreground truncate max-w-xs">{product.title}</span>
        </div>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: product.title, url: window.location.href });
            } else {
              navigator.clipboard.writeText(window.location.href);
              alert("Product link copied to clipboard!");
            }
          }}
          className="flex items-center gap-1.5 hover:text-primary transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Share</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
        {/* Left: Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square w-full rounded-2xl overflow-hidden bg-muted border shadow-sm">
            <img
              src={selectedImage}
              alt={product.title}
              className="h-full w-full object-cover object-center"
            />
          </div>

          {/* Thumbnails */}
          {product.product_images && product.product_images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.product_images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.image_url)}
                  className={`h-20 w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === img.image_url
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt={img.alt_text || "Thumbnail"}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Purchase Details */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="font-semibold text-primary">
                {product.brand || product.categories?.name}
              </Badge>

              {/* Star Rating */}
              <div className="flex items-center gap-1 text-sm font-semibold">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{product.average_rating ? Number(product.average_rating).toFixed(1) : "4.8"}</span>
                <span className="text-muted-foreground text-xs font-normal">
                  ({product.total_reviews_count || 12} reviews)
                </span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {product.title}
            </h1>

            {/* Merchant store info */}
            {product.salesman_profiles && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <Store className="h-4 w-4 text-primary" />
                <span>Sold by:</span>
                <span className="font-semibold text-foreground">
                  {product.salesman_profiles.store_name}
                </span>
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Verified Merchant
                </Badge>
              </div>
            )}
          </div>

          {/* Pricing Box */}
          <div className="p-4 rounded-xl bg-muted/40 border space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-foreground">
                ₹{effectivePrice.toLocaleString("en-IN")}
              </span>
              {product.original_price && product.original_price > effectivePrice && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    ₹{Number(product.original_price).toLocaleString("en-IN")}
                  </span>
                  <Badge variant="destructive" className="font-bold text-xs">
                    {discountPercentage}% OFF
                  </Badge>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Inclusive of all taxes. Free shipping on orders over ₹999.
            </p>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {product.description}
          </p>

          {/* Variants Selector */}
          {product.product_variants && product.product_variants.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select Option / Variant:
              </label>
              <div className="flex flex-wrap gap-2">
                {product.product_variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      selectedVariant?.id === variant.id
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-input bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    {variant.variant_name}
                    {variant.additional_price > 0 && ` (+₹${variant.additional_price})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock & Quantity */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Availability
              </span>
              {availableStock <= 0 ? (
                <Badge variant="destructive">Out of Stock</Badge>
              ) : availableStock <= product.low_stock_threshold ? (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  Only {availableStock} left in stock
                </Badge>
              ) : (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> In Stock ({availableStock} units)
                </span>
              )}
            </div>

            {availableStock > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground">Quantity:</span>
                <div className="flex items-center border rounded-md bg-background">
                  <button
                    className="px-3 py-1 text-sm font-bold hover:bg-muted"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-sm font-semibold">{quantity}</span>
                  <button
                    className="px-3 py-1 text-sm font-bold hover:bg-muted"
                    onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              size="lg"
              className="flex-1 gap-2"
              disabled={availableStock <= 0}
              variant={justAdded ? "secondary" : "default"}
              onClick={handleAddToCart}
            >
              {justAdded ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Added to Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  <span>Add to Cart</span>
                </>
              )}
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="flex-1 font-semibold border-primary text-primary hover:bg-primary/5"
              disabled={availableStock <= 0}
              onClick={handleBuyNow}
            >
              Buy Now
            </Button>
          </div>

          {/* Delivery & Trust Guarantee Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary shrink-0" />
              <span>{product.delivery_info || "Fast 3-5 day delivery"}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>100% Genuine Product</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary shrink-0" />
              <span>7-Day Easy Returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Features Detailed Table */}
      <div className="pt-8 border-t space-y-6">
        <h3 className="text-xl font-bold tracking-tight">Product Specifications & Features</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Features Bullets */}
          {product.features && product.features.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Key Features
                </h4>
                <ul className="space-y-2 text-sm text-foreground">
                  {product.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Technical Specs Table */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Technical Details
                </h4>
                <div className="divide-y text-xs">
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <div key={key} className="py-2 flex justify-between">
                      <span className="text-muted-foreground font-medium">{key}</span>
                      <span className="font-semibold text-foreground text-right">{val}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
