import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, RotateCcw, Package } from "lucide-react";
import type { Product, Category } from "@/types";

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number>(20000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"featured" | "price_asc" | "price_desc" | "rating">("featured");

  useEffect(() => {
    async function loadCatalogData() {
      try {
        setIsLoading(true);

        // Fetch active categories
        const { data: catData } = await supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (catData) setCategories(catData as Category[]);

        // Fetch active products with images, variants, category, and seller info
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .select(`
            *,
            categories (id, name, slug),
            salesman_profiles (id, store_name, store_slug),
            product_images (*),
            product_variants (*)
          `)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (prodErr) {
          console.error("Error loading products:", prodErr);
        } else if (prodData) {
          setProducts(prodData as Product[]);
        }
      } catch (err) {
        console.error("Catalog fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCatalogData();
  }, []);

  // Filter and Sort Pipeline
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search Filter
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          !query ||
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.brand?.toLowerCase().includes(query) ||
          p.tags?.some((t) => t.toLowerCase().includes(query));

        // Category Filter
        const matchesCategory =
          selectedCategory === "all" || p.categories?.slug === selectedCategory;

        // Price Filter
        const matchesPrice = Number(p.selling_price) <= maxPrice;

        // Stock Filter
        const matchesStock = !inStockOnly || p.available_stock > 0;

        return matchesSearch && matchesCategory && matchesPrice && matchesStock;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") return Number(a.selling_price) - Number(b.selling_price);
        if (sortBy === "price_desc") return Number(b.selling_price) - Number(a.selling_price);
        if (sortBy === "rating") return Number(b.average_rating) - Number(a.average_rating);
        return 0; // default featured
      });
  }, [products, searchTerm, selectedCategory, maxPrice, inStockOnly, sortBy]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setMaxPrice(20000);
    setInStockOnly(false);
    setSortBy("featured");
  };

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Page Title & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Marketplace Catalog</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Discover authentic products from independent sellers across India.
          </p>
        </div>

        {/* Global Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products or brands..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 border rounded-xl p-5 bg-card space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span>Filter Products</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Categories
            </label>
            <div className="space-y-1">
              <button
                type="button"
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md transition-colors flex justify-between items-center ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-muted text-foreground"
                }`}
                onClick={() => setSelectedCategory("all")}
              >
                <span>All Categories</span>
                <span>{products.length}</span>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md transition-colors flex justify-between items-center ${
                    selectedCategory === cat.slug
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-muted text-foreground"
                  }`}
                  onClick={() => setSelectedCategory(cat.slug)}
                >
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Max Price
              </label>
              <span className="text-xs font-semibold text-foreground">
                ₹{maxPrice.toLocaleString("en-IN")}
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="20000"
              step="500"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>₹500</span>
              <span>₹20,000+</span>
            </div>
          </div>

          {/* In-Stock Filter */}
          <div className="pt-2 border-t flex items-center justify-between">
            <label htmlFor="inStock" className="text-xs font-semibold cursor-pointer">
              In Stock Only
            </label>
            <input
              type="checkbox"
              id="inStock"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-muted/40 p-3 rounded-lg border">
            <span className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredProducts.length}</span> of {products.length} products
            </span>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "featured" | "price_asc" | "price_desc" | "rating")}
                className="text-xs bg-background border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="featured">Featured First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Grid Output */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-xl border bg-card p-4 space-y-3 animate-pulse">
                  <div className="aspect-[4/3] bg-muted rounded-lg" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 border rounded-xl bg-card space-y-4">
              <Package className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold">No products match your criteria</h3>
                <p className="text-xs text-muted-foreground">
                  Try adjusting or clearing your search and category filters.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
