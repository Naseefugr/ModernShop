import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigation, Link } from "@/context/NavigationContext";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  ArrowRight,
  TrendingUp,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import type { Product, Category } from "@/types";

export function HomePage() {
  const { role, isAuthenticated } = useAuth();
  const { navigate } = useNavigation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        setIsLoading(true);

        // Fetch Categories
        const { data: catData } = await supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .limit(6);

        if (catData) setCategories(catData as Category[]);

        // Fetch Featured Products
        const { data: featData } = await supabase
          .from("products")
          .select(`
            *,
            categories (*),
            salesman_profiles (*),
            product_images (*),
            product_variants (*)
          `)
          .eq("status", "active")
          .eq("is_featured", true)
          .limit(4);

        if (featData) setFeaturedProducts(featData as Product[]);

        // Fetch Trending Products
        const { data: trendData } = await supabase
          .from("products")
          .select(`
            *,
            categories (*),
            salesman_profiles (*),
            product_images (*),
            product_variants (*)
          `)
          .eq("status", "active")
          .eq("is_trending", true)
          .limit(4);

        if (trendData) setTrendingProducts(trendData as Product[]);
      } catch (err) {
        console.error("Error loading home data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadHomeData();
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-8 relative z-10">
          <div className="max-w-2xl space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-slate-800 text-slate-200 border-slate-700">
                🛡️ 100% Genuine Guaranteed
              </Badge>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                ⚡ Express Doorstep Delivery
              </Badge>
              <Badge variant="outline" className="text-sky-400 border-sky-500/30">
                🚚 Highway Live Telemetry
              </Badge>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Curated Products from India&apos;s Independent Sellers
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Explore authentic gear, fashion, and home essentials. Multi-vendor order fulfillment, instant stock reservation, and nationwide express shipping.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Button
                size="lg"
                className="gap-2 bg-primary text-primary-foreground font-semibold shadow-lg hover:opacity-90"
                onClick={() => navigate("/products")}
              >
                <span>Browse All Products</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              {!isAuthenticated ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-slate-700 text-white hover:bg-slate-800/80 gap-2"
                  onClick={() => navigate("/register")}
                >
                  <Store className="h-4 w-4 text-emerald-400" />
                  <span>Register as Seller</span>
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-slate-700 text-white hover:bg-slate-800/80 gap-2"
                  onClick={() => {
                    if (role === "admin") navigate("/admin");
                    else if (role === "salesman") navigate("/vendor");
                    else navigate("/account");
                  }}
                >
                  <span>My Workspace</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category Section */}
      <section className="container mx-auto px-4 sm:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Shop by Category</h2>
          </div>
          <Link to="/products" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => navigate("/products")}
              className="group relative rounded-xl overflow-hidden border bg-card p-4 flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
            >
              <div className="h-24 w-24 rounded-full overflow-hidden mb-3 bg-muted">
                <img
                  src={cat.image_url || "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400"}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                />
              </div>
              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {cat.name}
              </h3>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="container mx-auto px-4 sm:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-2xl font-bold tracking-tight">Featured Products</h2>
          </div>
          <Link to="/products" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <span>Explore Catalog</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-xl bg-muted/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Trending Products Section */}
      <section className="container mx-auto px-4 sm:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <h2 className="text-2xl font-bold tracking-tight">Trending Now</h2>
          </div>
          <Link to="/products" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <span>See More</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-xl bg-muted/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
