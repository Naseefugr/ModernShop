import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Plus,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  X,
  RefreshCw,
  Boxes,
  AlertTriangle,
  Search,
} from "lucide-react";
import type { Product, Category, Subcategory } from "@/types";

export function VendorProductsPage() {
  const { salesmanProfile } = useAuth();
  const { navigate } = useNavigation();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Restock Inventory State
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState("25");
  const [restockMode, setRestockMode] = useState<"add" | "set">("add");
  const [isRestocking, setIsRestocking] = useState(false);
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [availableStock, setAvailableStock] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [sku, setSku] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [feature1, setFeature1] = useState("");
  const [feature2, setFeature2] = useState("");
  const [specKey1, setSpecKey1] = useState("");
  const [specVal1, setSpecVal1] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (salesmanProfile?.id) {
      loadVendorCatalog();
    }
  }, [salesmanProfile?.id]);

  const loadVendorCatalog = async () => {
    try {
      setIsLoading(true);

      // Load Categories
      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (cats) {
        setCategories(cats as Category[]);
        if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
      }

      // Load Subcategories
      const { data: subcats } = await supabase
        .from("subcategories")
        .select("*")
        .eq("is_active", true);

      if (subcats) setSubcategories(subcats as Subcategory[]);

      // Load Salesman Products
      if (salesmanProfile?.id) {
        const { data: prods, error: pErr } = await supabase
          .from("products")
          .select(`
            *,
            categories (*),
            product_images (*)
          `)
          .eq("salesman_id", salesmanProfile.id)
          .order("created_at", { ascending: false });

        if (!pErr && prods) {
          setProducts(prods as Product[]);
        }
      }
    } catch (err) {
      console.error("Error loading vendor catalog:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "paused" : "active";
    try {
      const { error } = await supabase
        .from("products")
        .update({ status: nextStatus })
        .eq("id", productId);

      if (!error) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, status: nextStatus as any } : p))
        );
      }
    } catch (err) {
      console.error("Error toggling product status:", err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (!error) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      }
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  // RESTOCK INVENTORY HANDLER
  const handleConfirmRestock = async () => {
    if (!restockProduct) return;
    const qtyNum = parseInt(String(restockQty), 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      alert("Please enter a valid restocking quantity.");
      return;
    }

    const newStock =
      restockMode === "add"
        ? Number(restockProduct.available_stock || 0) + qtyNum
        : qtyNum;

    setIsRestocking(true);
    try {
      // Auto-reactivate to active if product was out_of_stock and is now restocked
      const nextStatus =
        newStock > 0 &&
        (restockProduct.status === "out_of_stock" ||
          restockProduct.status === "paused")
          ? "active"
          : restockProduct.status;

      const { error } = await supabase
        .from("products")
        .update({
          available_stock: newStock,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", restockProduct.id);

      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) =>
          p.id === restockProduct.id
            ? { ...p, available_stock: newStock, status: nextStatus }
            : p
        )
      );

      setSuccessMessage(
        `Restocked "${restockProduct.title}" successfully! New inventory: ${newStock} units.`
      );
      setTimeout(() => setSuccessMessage(null), 4500);
      setRestockProduct(null);
      setRestockQty("25");
    } catch (err: unknown) {
      console.error("Restock error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("Failed to restock: " + msg);
    } finally {
      setIsRestocking(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!salesmanProfile?.id) {
      setErrorMessage("No active salesman profile found.");
      return;
    }

    if (!title || !sellingPrice || !availableStock || !categoryId) {
      setErrorMessage("Please fill in all mandatory fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const slug =
        title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") +
        "-" +
        Math.floor(Math.random() * 10000);

      const features = [feature1, feature2].filter(Boolean);
      const specifications: Record<string, string> = {};
      if (specKey1 && specVal1) specifications[specKey1] = specVal1;

      const { data: newProd, error: prodErr } = await supabase
        .from("products")
        .insert({
          salesman_id: salesmanProfile.id,
          category_id: categoryId,
          subcategory_id: subcategoryId || null,
          title,
          slug,
          brand: brand || null,
          description: description || title,
          selling_price: parseFloat(sellingPrice),
          original_price: originalPrice ? parseFloat(originalPrice) : null,
          available_stock: parseInt(availableStock),
          low_stock_threshold: parseInt(lowStockThreshold) || 5,
          sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
          features,
          specifications,
          status: "active",
        })
        .select()
        .single();

      if (prodErr) throw prodErr;

      if (newProd && imageUrl) {
        await supabase.from("product_images").insert({
          product_id: newProd.id,
          image_url: imageUrl,
          alt_text: title,
          is_primary: true,
          display_order: 1,
        });
      }

      setSuccessMessage("Product published successfully to marketplace!");
      setShowAddWizard(false);
      setTitle("");
      setBrand("");
      setDescription("");
      setSellingPrice("");
      setOriginalPrice("");
      setAvailableStock("");
      setLowStockThreshold("5");
      setSku("");
      setImageUrl("");
      setFeature1("");
      setFeature2("");
      setSpecKey1("");
      setSpecVal1("");

      await loadVendorCatalog();
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setErrorMessage(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSubcategories = subcategories.filter(
    (s) => s.category_id === categoryId
  );

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <button
            onClick={() => navigate("/vendor")}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">My Product Catalog</h1>
            <Badge variant="secondary" className="font-semibold">
              {products.length} Products
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Create, edit, pause, and monitor stock availability for your products.
          </p>
        </div>

        {!showAddWizard && (
          <Button onClick={() => setShowAddWizard(true)} className="gap-2 shadow">
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </Button>
        )}
      </div>

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Add Product Wizard Modal/Card */}
      {showAddWizard && (
        <Card className="border-primary/40 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-lg">Add New Product</CardTitle>
              <CardDescription>
                Publish a new item to the public marketplace
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowAddWizard(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <form onSubmit={handleCreateProduct}>
            <CardContent className="space-y-5 pt-6">
              {errorMessage && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Product Title *</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Wireless Pro ANC Earbuds" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Brand Name</label>
                  <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. SoundCraft" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Subcategory</label>
                  <select
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">General / None</option>
                    {filteredSubcategories.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Detailed Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Comprehensive overview of materials, specifications, and benefits..."
                  className="w-full min-h-[90px] rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Selling Price (₹) *</label>
                  <Input type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="1999" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Original MSRP (₹)</label>
                  <Input type="number" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="2999" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Available Stock *</label>
                  <Input type="number" value={availableStock} onChange={(e) => setAvailableStock(e.target.value)} placeholder="25" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Low Stock Alert</label>
                  <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} placeholder="5" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Custom SKU Code</label>
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. AUD-EAR-001" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Product Image URL</label>
                  <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://images.unsplash.com/photo-..." />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Key Feature 1</label>
                  <Input value={feature1} onChange={(e) => setFeature1(e.target.value)} placeholder="e.g. Active Noise Cancellation 30dB" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Key Feature 2</label>
                  <Input value={feature2} onChange={(e) => setFeature2(e.target.value)} placeholder="e.g. 24-hour battery with quick charge" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Technical Specification Key</label>
                  <Input value={specKey1} onChange={(e) => setSpecKey1(e.target.value)} placeholder="e.g. Warranty" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Specification Value</label>
                  <Input value={specVal1} onChange={(e) => setSpecVal1(e.target.value)} placeholder="e.g. 1 Year Brand Warranty" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Saving to Database..." : "Publish Product"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddWizard(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Low Stock Warning Banner */}
      {(() => {
        const lowStockCount = products.filter(
          (p) => p.available_stock <= (p.low_stock_threshold || 5)
        ).length;
        if (lowStockCount === 0) return null;

        return (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-sm">
                  Restock Required: {lowStockCount} product(s) are low or out of stock!
                </span>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Restock units immediately to prevent customer order drop-offs.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 h-8 text-xs font-semibold gap-1.5 self-start sm:self-auto"
              onClick={() => setStockFilter("low_stock")}
            >
              <Boxes className="h-3.5 w-3.5" />
              <span>Review Low Stock Items ({lowStockCount})</span>
            </Button>
          </div>
        );
      })()}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Stock Filter Pills */}
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setStockFilter("all")}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              stockFilter === "all"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            onClick={() => setStockFilter("in_stock")}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              stockFilter === "in_stock"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            }`}
          >
            In Stock ({products.filter((p) => p.available_stock > (p.low_stock_threshold || 5)).length})
          </button>
          <button
            onClick={() => setStockFilter("low_stock")}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              stockFilter === "low_stock"
                ? "bg-amber-600 text-white font-bold shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            }`}
          >
            Low Stock ({products.filter((p) => p.available_stock > 0 && p.available_stock <= (p.low_stock_threshold || 5)).length})
          </button>
          <button
            onClick={() => setStockFilter("out_of_stock")}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              stockFilter === "out_of_stock"
                ? "bg-destructive text-destructive-foreground font-bold shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            }`}
          >
            Out of Stock ({products.filter((p) => p.available_stock === 0).length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or SKU..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Product Table / Listing */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your product catalogue...</p>
      ) : products.length === 0 && !showAddWizard ? (
        <Card className="text-center py-16 border-dashed">
          <CardHeader className="space-y-2">
            <Package className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
            <CardTitle className="text-lg">No Products Added Yet</CardTitle>
            <CardDescription className="max-w-sm mx-auto">
              You haven&apos;t added any products to your storefront. Start adding your catalogue to receive customer orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowAddWizard(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Add Your First Product</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b text-xs uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Stock & Restock</th>
                  <th className="p-4">Sold</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products
                  .filter((p) => {
                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase();
                      const matchTitle = p.title.toLowerCase().includes(q);
                      const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
                      if (!matchTitle && !matchSku) return false;
                    }
                    const threshold = p.low_stock_threshold || 5;
                    if (stockFilter === "in_stock") return p.available_stock > threshold;
                    if (stockFilter === "low_stock") return p.available_stock > 0 && p.available_stock <= threshold;
                    if (stockFilter === "out_of_stock") return p.available_stock === 0;
                    return true;
                  })
                  .map((prod) => {
                    const thumb =
                      prod.product_images?.[0]?.image_url ||
                      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80";
                    const isOutOfStock = prod.available_stock === 0;
                    const isLowStock = prod.available_stock > 0 && prod.available_stock <= (prod.low_stock_threshold || 5);

                    return (
                      <tr key={prod.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <img src={thumb} alt={prod.title} className="h-12 w-12 rounded-lg object-cover bg-muted shrink-0" />
                          <div>
                            <div className="font-semibold text-foreground line-clamp-1">{prod.title}</div>
                            <div className="text-xs text-muted-foreground">SKU: {prod.sku || "N/A"}</div>
                          </div>
                        </td>

                        <td className="p-4 text-xs font-medium text-muted-foreground">
                          {prod.categories?.name || "General"}
                        </td>

                        <td className="p-4 font-bold text-foreground">
                          ₹{Number(prod.selling_price).toLocaleString("en-IN")}
                        </td>

                        {/* STOCK & RESTOCKING OPTION */}
                        <td className="p-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono font-black text-sm ${
                                  isOutOfStock
                                    ? "text-rose-600"
                                    : isLowStock
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                {prod.available_stock} units
                              </span>

                              {isOutOfStock ? (
                                <Badge variant="destructive" className="text-[9px] py-0 px-1 font-bold">
                                  Out of Stock
                                </Badge>
                              ) : isLowStock ? (
                                <Badge className="text-[9px] py-0 px-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold" variant="outline">
                                  Low Stock
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                  In Stock
                                </Badge>
                              )}
                            </div>

                            {/* Restock Trigger Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[11px] px-2 gap-1 border-primary/30 text-primary hover:bg-primary/10 font-bold"
                              onClick={() => {
                                setRestockProduct(prod);
                                setRestockQty("25");
                                setRestockMode("add");
                              }}
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>+ Restock</span>
                            </Button>
                          </div>
                        </td>

                        <td className="p-4 text-xs font-medium">
                          {prod.total_sold_count || 0}
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => handleToggleStatus(prod.id, prod.status)}
                            title="Click to toggle status"
                          >
                            <Badge
                              variant={prod.status === "active" ? "default" : "secondary"}
                              className={`cursor-pointer capitalize text-[11px] ${
                                prod.status === "active"
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                              }`}
                            >
                              {prod.status}
                            </Badge>
                          </button>
                        </td>

                        <td className="p-4 text-right space-x-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/5"
                            onClick={() => {
                              setRestockProduct(prod);
                              setRestockQty("25");
                              setRestockMode("add");
                            }}
                            title="Restock this product"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Restock</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/products/${prod.id}`)}
                            title="View on storefront"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="text-muted-foreground hover:text-destructive"
                            title="Delete product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* RESTOCK PRODUCT INVENTORY MODAL DIALOG                              */}
      {/* =================================================================== */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-lg border shadow-2xl bg-card my-8">
            <CardHeader className="flex flex-row items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Boxes className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Restock Product Inventory</CardTitle>
                  <CardDescription className="text-xs">
                    Replenish stock for live customer ordering
                  </CardDescription>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRestockProduct(null)}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-5 text-xs">
              {/* Product Info Bar */}
              <div className="p-3.5 rounded-lg border bg-muted/20 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-foreground">{restockProduct.title}</h4>
                  <div className="flex items-center gap-2 text-muted-foreground text-[11px] mt-0.5">
                    <span>SKU: {restockProduct.sku || "N/A"}</span>
                    <span>•</span>
                    <span>₹{Number(restockProduct.selling_price).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Current Stock</span>
                  <Badge
                    variant="outline"
                    className={`font-mono text-xs font-bold ${
                      restockProduct.available_stock === 0
                        ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                        : restockProduct.available_stock <= 5
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    }`}
                  >
                    {restockProduct.available_stock} Units
                  </Badge>
                </div>
              </div>

              {/* Restock Mode Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Restock Adjustment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestockMode("add")}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      restockMode === "add"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    + Add to Current Stock
                  </button>

                  <button
                    type="button"
                    onClick={() => setRestockMode("set")}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      restockMode === "set"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    = Set Exact Total Stock
                  </button>
                </div>
              </div>

              {/* Quick Restock Amount Chips */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Quick Amount Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[5, 10, 25, 50, 100, 250, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRestockQty(String(amt))}
                      className={`px-3 py-1.5 rounded-md border text-xs font-mono font-bold transition-all ${
                        restockQty === String(amt)
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  {restockMode === "add" ? "Units to Add" : "New Total Stock Count"} *
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-base"
                    onClick={() => setRestockQty((prev) => String(Math.max(0, (parseInt(prev) || 0) - 5)))}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="h-10 text-center font-mono font-black text-base"
                    placeholder="25"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-base"
                    onClick={() => setRestockQty((prev) => String((parseInt(prev) || 0) + 5))}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Live Preview Calculation Box */}
              {(() => {
                const addNum = parseInt(restockQty) || 0;
                const calculatedNewTotal =
                  restockMode === "add"
                    ? Number(restockProduct.available_stock || 0) + addNum
                    : addNum;

                return (
                  <div className="p-3.5 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Current Available:</span>
                      <span className="font-mono font-bold text-foreground">
                        {restockProduct.available_stock} Units
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                      <span>Restock Adjustment:</span>
                      <span className="font-mono">
                        {restockMode === "add" ? `+${addNum}` : `Set to ${addNum}`} Units
                      </span>
                    </div>

                    <div className="border-t border-emerald-500/30 pt-2 flex items-center justify-between text-sm font-black text-foreground">
                      <span>New Total Live Stock:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                        {calculatedNewTotal} Units
                      </span>
                    </div>

                    {calculatedNewTotal > 0 && restockProduct.status === "out_of_stock" && (
                      <p className="text-[10px] text-emerald-600 font-medium">
                        ✓ Product will automatically return to Active status on the marketplace.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Modal Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isRestocking}
                  onClick={handleConfirmRestock}
                >
                  <RefreshCw className={`h-4 w-4 ${isRestocking ? "animate-spin" : ""}`} />
                  <span>{isRestocking ? "Updating Stock..." : "Confirm & Restock Stock"}</span>
                </Button>

                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  disabled={isRestocking}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
