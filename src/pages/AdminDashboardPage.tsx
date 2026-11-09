import { useEffect, useState, useMemo, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Store,
  ShoppingBag,
  Check,
  X,
  Plus,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Eye,
  Phone,
  MapPin,
  BarChart3,
} from "lucide-react";
import type { Profile, SalesmanProfile, Order, Category } from "@/types";
import {
  RevenueTrendAreaChart,
  StatusDistributionChart,
  FinancialFundDonutChart,
  MerchantPerformanceRanking,
  type RevenuePoint,
} from "@/components/analytics/AnalyticsCharts";

export function AdminDashboardPage() {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "overview" | "salesmen" | "orders" | "categories" | "users" | "settings"
  >("overview");

  // Orders Tab Filter & Selected Audit Order
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [selectedAdminOrder, setSelectedAdminOrder] = useState<Order | null>(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  // Data states
  const [salesmen, setSalesmen] = useState<SalesmanProfile[]>([]);
  const [usersList, setUsersList] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [platformSettings, setPlatformSettings] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New Category State
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatImg, setNewCatImg] = useState("");

  // Editable Settings State
  const [shippingThreshold, setShippingThreshold] = useState("999");
  const [shippingFee, setShippingFee] = useState("49");
  const [supportEmail, setSupportEmail] = useState("support@modernshop.com");
  const [marketplaceName, setMarketplaceName] = useState("ModernShop");

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    try {
      setIsLoading(true);

      // Load Salesmen
      const { data: sData } = await supabase
        .from("salesman_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (sData) setSalesmen(sData as SalesmanProfile[]);

      // Load Users
      const { data: uData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (uData) setUsersList(uData as Profile[]);

      // Load Orders with sub-orders
      const { data: oData } = await supabase
        .from("orders")
        .select(`
          *,
          profiles (*),
          sub_orders (
            *,
            salesman_profiles (*)
          ),
          order_items (*)
        `)
        .order("created_at", { ascending: false });
      if (oData) setOrders(oData as Order[]);

      // Load Categories
      const { data: cData } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (cData) setCategories(cData as Category[]);

      // Load Settings
      const { data: setts } = await supabase.from("platform_settings").select("*");
      if (setts) {
        const configMap: Record<string, any> = {};
        setts.forEach((s) => (configMap[s.key] = s.value));
        setPlatformSettings(configMap);

        if (configMap.order_policies) {
          if (configMap.order_policies.free_shipping_threshold) {
            setShippingThreshold(String(configMap.order_policies.free_shipping_threshold));
          }
          if (configMap.order_policies.standard_shipping_fee) {
            setShippingFee(String(configMap.order_policies.standard_shipping_fee));
          }
        }
        if (configMap.general) {
          if (configMap.general.support_email) setSupportEmail(configMap.general.support_email);
          if (configMap.general.marketplace_name) setMarketplaceName(configMap.general.marketplace_name);
        }
      }
    } catch (err) {
      console.error("Admin load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const notifySuccess = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // 1. Salesman Approval/Suspension
  const handleApproveSalesman = async (id: string, approve: boolean) => {
    try {
      await supabase
        .from("salesman_profiles")
        .update({
          is_approved: approve,
          approved_at: approve ? new Date().toISOString() : null,
        })
        .eq("id", id);

      setSalesmen((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_approved: approve } : s))
      );
      notifySuccess(`Salesman ${approve ? "approved" : "suspended"} successfully.`);
    } catch (err) {
      console.error("Error updating salesman:", err);
    }
  };

  // 2. User Status & Role Moderation
  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await supabase
        .from("profiles")
        .update({ status: nextStatus })
        .eq("id", userId);

      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: nextStatus as any } : u))
      );
      notifySuccess(`User account status updated to ${nextStatus}.`);
    } catch (err) {
      console.error("Error updating user status:", err);
    }
  };

  // 3. Admin Order Cancellation (Emergency Action Only - Admin cannot mark status)
  const handleAdminCancelOrder = async (orderId: string) => {
    if (
      !window.confirm(
        `Are you sure you want to cancel order #${orderId.slice(
          0,
          8
        )}? As Administrator, this will immediately cancel all vendor sub-orders.`
      )
    )
      return;
    try {
      setIsCancellingOrder(true);
      const { error: oErr } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
      if (oErr) throw oErr;

      const { error: sErr } = await supabase
        .from("sub_orders")
        .update({ status: "cancelled" })
        .eq("master_order_id", orderId);
      if (sErr) throw sErr;

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o))
      );
      if (selectedAdminOrder?.id === orderId) {
        setSelectedAdminOrder((prev) =>
          prev ? { ...prev, status: "cancelled" } : null
        );
      }
      notifySuccess(`Order #${orderId.slice(0, 8)} cancelled successfully by Admin.`);
    } catch (err: unknown) {
      console.error("Admin cancel error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("Failed to cancel order: " + msg);
    } finally {
      setIsCancellingOrder(false);
    }
  };

  // 4. Create Category
  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) return;
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: newCatName,
          slug: newCatSlug,
          description: newCatDesc || null,
          image_url: newCatImg || null,
          display_order: categories.length + 1,
          is_active: true,
        })
        .select()
        .single();

      if (!error && data) {
        setCategories((prev) => [...prev, data as Category]);
        setNewCatName("");
        setNewCatSlug("");
        setNewCatDesc("");
        setNewCatImg("");
        notifySuccess(`Category '${newCatName}' created.`);
      }
    } catch (err) {
      console.error("Error creating category:", err);
    }
  };

  // 5. Toggle Category Active / Paused
  const handleToggleCategory = async (catId: string, currentState: boolean) => {
    try {
      await supabase
        .from("categories")
        .update({ is_active: !currentState })
        .eq("id", catId);

      setCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, is_active: !currentState } : c))
      );
      notifySuccess(`Category status toggled.`);
    } catch (err) {
      console.error("Error toggling category:", err);
    }
  };

  // 6. Save Platform Settings
  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const updatedPolicies = {
        free_shipping_threshold: Number(shippingThreshold) || 999,
        standard_shipping_fee: Number(shippingFee) || 49,
        cod_enabled: true,
      };

      const updatedGeneral = {
        marketplace_name: marketplaceName,
        support_email: supportEmail,
        currency: "INR",
      };

      await supabase.from("platform_settings").upsert([
        { key: "order_policies", value: updatedPolicies },
        { key: "general", value: updatedGeneral },
      ]);

      setPlatformSettings((prev) => ({
        ...prev,
        order_policies: updatedPolicies,
        general: updatedGeneral,
      }));
      notifySuccess("Platform settings updated and live across the marketplace.");
    } catch (err) {
      console.error("Error saving settings:", err);
    }
  };

  const totalGMV = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const platformRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0) * 0.1, 0);

  // 1. 7-Day / Segment Trend Data
  const adminTrendData: RevenuePoint[] = useMemo(() => {
    const days: Record<string, { gross: number; net: number; commission: number; date: string }> = {};
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = `${dayNames[d.getDay()]} ${d.getDate()}`;
      days[key] = { gross: 0, net: 0, commission: 0, date: label };
    }

    orders.forEach((o) => {
      const key = o.created_at ? o.created_at.split("T")[0] : "";
      const amt = Number(o.total_amount || 0);
      if (days[key]) {
        days[key].gross += amt;
        days[key].net += amt * 0.9;
        days[key].commission += amt * 0.1;
      } else {
        const latestKey = Object.keys(days)[Object.keys(days).length - 1];
        if (latestKey) {
          days[latestKey].gross += amt;
          days[latestKey].net += amt * 0.9;
          days[latestKey].commission += amt * 0.1;
        }
      }
    });

    return Object.entries(days).map(([_, val]) => ({
      label: val.date.split(" ")[0],
      date: val.date,
      gross: val.gross,
      net: val.net,
      commission: val.commission,
    }));
  }, [orders]);

  // 2. Status Distribution Data
  const adminStatusDistribution = useMemo(() => {
    const pendingCount = orders.filter((o) => o.status === "confirmed" || o.status === "processing" || o.status === "pending_payment").length;
    const shippedCount = orders.filter((o) => o.status === "shipped").length;
    const reachedAroundCount = orders.filter((o) => o.sub_orders?.some((s) => s.status === "packed")).length;
    const reachedCount = orders.filter((o) => o.sub_orders?.some((s) => s.status === "out_for_delivery")).length;
    const deliveredCount = orders.filter((o) => o.status === "delivered").length;
    const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

    return [
      { stage: "Pending", count: pendingCount, colorClass: "text-amber-500", bgClass: "bg-amber-500" },
      { stage: "Shipped", count: shippedCount, colorClass: "text-blue-500", bgClass: "bg-blue-500" },
      { stage: "Reached Around", count: reachedAroundCount, colorClass: "text-indigo-500", bgClass: "bg-indigo-500" },
      { stage: "Reached", count: reachedCount, colorClass: "text-purple-500", bgClass: "bg-purple-500" },
      { stage: "Delivered", count: deliveredCount, colorClass: "text-emerald-500", bgClass: "bg-emerald-500" },
      { stage: "Cancelled", count: cancelledCount, colorClass: "text-rose-500", bgClass: "bg-rose-500" },
    ];
  }, [orders]);

  // 3. Merchant Ranking Data
  const merchantStats = useMemo(() => {
    const storeMap: Record<string, { storeName: string; storeSlug: string; grossSales: number; orderCount: number; commissionGenerated: number }> = {};
    salesmen.forEach((s) => {
      storeMap[s.id] = {
        storeName: s.store_name,
        storeSlug: s.store_slug,
        grossSales: 0,
        orderCount: 0,
        commissionGenerated: 0,
      };
    });

    orders.forEach((o) => {
      o.sub_orders?.forEach((so) => {
        const sid = so.salesman_id;
        if (storeMap[sid]) {
          const amt = Number(so.subtotal_amount || 0);
          storeMap[sid].grossSales += amt;
          storeMap[sid].orderCount += 1;
          storeMap[sid].commissionGenerated += amt * 0.1;
        }
      });
    });

    return Object.values(storeMap).sort((a, b) => b.grossSales - a.grossSales);
  }, [salesmen, orders]);

  // 4. Fund Slices Data for Donut Chart
  const adminFundSlices = useMemo(() => {
    const deliveredGMV = orders.filter((o) => o.status === "delivered").reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const inTransitGMV = totalGMV - deliveredGMV;
    const platformProfit = totalGMV * 0.1;
    const vendorPayable = totalGMV * 0.9;

    return [
      { label: "Vendor Disbursals", amount: vendorPayable, color: "#3B82F6", desc: "90% payable to merchant stores" },
      { label: "Platform Profit", amount: platformProfit, color: "#10B981", desc: "10% commission harvested" },
      { label: "In-Transit Volume", amount: inTransitGMV, color: "#F59E0B", desc: "Awaiting final delivery" },
    ];
  }, [orders, totalGMV]);

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Admin Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Marketplace Command Center</h1>
            <Badge variant="destructive" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>Admin Complete Control</span>
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Global governance, merchant approvals, user accounts, order moderation, and CMS configurations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={loadAllAdminData}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Refreshing..." : "Refresh Data"}</span>
          </Button>

          <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md font-mono">
            Admin: <span className="font-semibold text-foreground">{profile?.email}</span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Admin Subsystem Navigation Tabs */}
      <div className="flex rounded-lg bg-muted p-1 overflow-x-auto text-xs font-semibold gap-1">
        <button
          className={`px-4 py-2 rounded-md transition-all ${
            activeTab === "overview" ? "bg-background text-foreground shadow font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("overview")}
        >
          Marketplace Overview
        </button>
        <button
          className={`px-4 py-2 rounded-md transition-all ${
            activeTab === "salesmen" ? "bg-background text-foreground shadow font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("salesmen")}
        >
          Salesmen ({salesmen.filter((s) => !s.is_approved).length} Pending)
        </button>
        <button
          className={`px-4 py-2 rounded-md transition-all ${
            activeTab === "orders" ? "bg-background text-foreground shadow font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("orders")}
        >
          Global Orders ({orders.length})
        </button>
        <button
          className={`px-4 py-2 rounded-md transition-all ${
            activeTab === "users" ? "bg-background text-foreground shadow font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("users")}
        >
          User Accounts ({usersList.length})
        </button>
        <button
          className={`px-4 py-2 rounded-md transition-all ${
            activeTab === "categories" ? "bg-background text-foreground shadow font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("categories")}
        >
          Categories ({categories.length})
        </button>
        <button
          className={`px-4 py-2 rounded-md transition-all ${
            activeTab === "settings" ? "bg-background text-foreground shadow font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("settings")}
        >
          Platform Settings
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: OVERVIEW                                                     */}
      {/* =================================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Gross Merchandise Value (GMV)</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-foreground">₹{totalGMV.toLocaleString("en-IN")}</div>
                <p className="text-xs text-muted-foreground mt-1">Total customer transactions</p>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Platform Commission</CardTitle>
                <Shield className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-emerald-600">₹{platformRevenue.toLocaleString("en-IN")}</div>
                <p className="text-xs text-muted-foreground mt-1">Calculated at 10% avg rate</p>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Registered Merchants</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{salesmen.length} Stores</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {salesmen.filter((s) => s.is_approved).length} active verified
                </p>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Customer Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{orders.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all vendor fulfillment</p>
              </CardContent>
            </Card>
          </div>

          {/* Visual Financial & Performance Analytics Suite */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b pb-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold tracking-tight">Marketplace Intelligence & Fund Analytics</h2>
            </div>

            {/* Row 1: Revenue Trend Area Chart + Donut Fund Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RevenueTrendAreaChart
                  data={adminTrendData}
                  title="Marketplace GMV & Platform Profit Inflow"
                  subtitle="Gross customer spend vs 10% platform commission retained across 7 cycles"
                  isSalesman={false}
                />
              </div>
              <div className="lg:col-span-1">
                <FinancialFundDonutChart
                  slices={adminFundSlices}
                  totalAmount={totalGMV}
                  title="GMV Fund Allocation"
                />
              </div>
            </div>

            {/* Row 2: Status Pipeline Distribution + Merchant Revenue Ranking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StatusDistributionChart
                items={adminStatusDistribution}
                totalOrders={orders.length}
                title="Global Order Milestone Distribution"
              />
              <MerchantPerformanceRanking
                merchants={merchantStats}
                title="Top Merchant Stores by Revenue"
              />
            </div>
          </div>

          {/* Quick Users Preview */}
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Registered Users & Role Profiles</CardTitle>
                <CardDescription>Accounts authenticated in Supabase GoTrue Auth</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("users")}
                className="text-xs"
              >
                Manage All Users
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-xs divide-y">
                <thead className="bg-muted/40 font-bold uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">User Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usersList.slice(0, 6).map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20">
                      <td className="p-3 font-semibold">{u.full_name}</td>
                      <td className="p-3 text-muted-foreground font-mono">{u.email}</td>
                      <td className="p-3">
                        <Badge variant={u.role === "admin" ? "destructive" : u.role === "salesman" ? "secondary" : "outline"} className="capitalize">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={u.status === "active" ? "text-emerald-600 bg-emerald-50" : "text-destructive bg-destructive/10"}>
                          {u.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: SALESMEN MANAGEMENT                                          */}
      {/* =================================================================== */}
      {activeTab === "salesmen" && (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Registered Merchant Stores & Verification</CardTitle>
            <CardDescription>
              Approve, pause, or suspend vendor store applications
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-xs divide-y">
              <thead className="bg-muted/40 font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Store Name</th>
                  <th className="p-3">Store Slug</th>
                  <th className="p-3">Business Contact</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">Verification</th>
                  <th className="p-3 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {salesmen.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="p-3 font-bold text-foreground">{s.store_name}</td>
                    <td className="p-3 font-mono text-muted-foreground">/{s.store_slug}</td>
                    <td className="p-3">
                      <div>{s.business_phone}</div>
                      <div className="text-[10px] text-muted-foreground">{s.business_email}</div>
                    </td>
                    <td className="p-3 font-mono uppercase">{s.gstin || "N/A"}</td>
                    <td className="p-3">
                      {s.is_approved ? (
                        <Badge className="bg-emerald-600 text-white">Approved</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-amber-600">Pending Review</Badge>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {!s.is_approved ? (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 gap-1"
                          onClick={() => handleApproveSalesman(s.id, true)}
                        >
                          <Check className="h-3 w-3" />
                          <span>Approve Seller</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-3 text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleApproveSalesman(s.id, false)}
                        >
                          <X className="h-3 w-3" />
                          <span>Suspend</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* =================================================================== */}
      {/* TAB 3: GLOBAL MASTER ORDERS & FINANCIAL FUND AUDIT                  */}
      {/* =================================================================== */}
      {activeTab === "orders" && (() => {
        const totalOrdersGMV = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        const totalPlatformCut = orders.reduce((sum, o) => sum + Number(o.total_amount || 0) * 0.1, 0);
        const totalVendorCut = orders.reduce((sum, o) => sum + Number(o.total_amount || 0) * 0.9, 0);
        const deliveredOrders = orders.filter((o) => o.status === "delivered");
        const deliveredOrdersGMV = deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        const deliveredPlatformProfit = deliveredOrdersGMV * 0.1;
        const inTransitFunds = totalOrdersGMV - deliveredOrdersGMV;

        const filteredOrdersList = orders.filter((o) => {
          if (orderFilter === "all") return true;
          if (orderFilter === "pending")
            return o.status === "confirmed" || o.status === "processing" || o.status === "pending_payment";
          if (orderFilter === "shipped")
            return o.status === "shipped" || o.sub_orders?.some((s) => s.status === "shipped");
          if (orderFilter === "reached_around")
            return o.sub_orders?.some((s) => s.status === "packed");
          if (orderFilter === "reached")
            return o.sub_orders?.some((s) => s.status === "out_for_delivery");
          if (orderFilter === "delivered")
            return o.status === "delivered" || o.sub_orders?.every((s) => s.status === "delivered");
          if (orderFilter === "cancelled")
            return o.status === "cancelled";
          return true;
        });

        return (
          <div className="space-y-6">
            {/* Top Financial Analytics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border shadow-xs bg-card">
                <CardHeader className="p-4 pb-1">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center justify-between">
                    <span>Total Orders GMV</span>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-black text-foreground">
                    ₹{totalOrdersGMV.toLocaleString("en-IN")}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Across {orders.length} transactions</p>
                </CardContent>
              </Card>

              <Card className="border shadow-xs bg-emerald-500/5 border-emerald-500/20">
                <CardHeader className="p-4 pb-1">
                  <CardTitle className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span>Platform Profit Fund (10%)</span>
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{totalPlatformCut.toLocaleString("en-IN")}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Commission earned by marketplace</p>
                </CardContent>
              </Card>

              <Card className="border shadow-xs bg-blue-500/5 border-blue-500/20">
                <CardHeader className="p-4 pb-1">
                  <CardTitle className="text-xs font-bold uppercase text-blue-800 dark:text-blue-300 flex items-center justify-between">
                    <span>Salesman Stores Fund (90%)</span>
                    <Store className="h-4 w-4 text-blue-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    ₹{totalVendorCut.toLocaleString("en-IN")}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Distributed to merchant balances</p>
                </CardContent>
              </Card>

              <Card className="border shadow-xs bg-card">
                <CardHeader className="p-4 pb-1">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center justify-between">
                    <span>Delivered Realized Profit</span>
                    <Check className="h-4 w-4 text-emerald-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-black text-foreground">
                    ₹{deliveredPlatformProfit.toLocaleString("en-IN")}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    ₹{inTransitFunds.toLocaleString("en-IN")} in active fulfillment
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Visual Orders Milestone Pipeline Distribution */}
            <StatusDistributionChart
              items={adminStatusDistribution}
              totalOrders={orders.length}
              title="Global Fulfillment Milestone Velocity & Distribution"
            />

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <button
                onClick={() => setOrderFilter("all")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  orderFilter === "all"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                All Orders ({orders.length})
              </button>
              <button
                onClick={() => setOrderFilter("pending")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  orderFilter === "pending"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                Pending / Confirmed ({orders.filter((o) => o.status === "confirmed" || o.status === "processing" || o.status === "pending_payment").length})
              </button>
              <button
                onClick={() => setOrderFilter("shipped")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  orderFilter === "shipped"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                Shipped ({orders.filter((o) => o.status === "shipped" || o.sub_orders?.some((s) => s.status === "shipped")).length})
              </button>
              <button
                onClick={() => setOrderFilter("reached_around")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  orderFilter === "reached_around"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                Reached Around ({orders.filter((o) => o.sub_orders?.some((s) => s.status === "packed")).length})
              </button>
              <button
                onClick={() => setOrderFilter("reached")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  orderFilter === "reached"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                Reached Local Hub ({orders.filter((o) => o.sub_orders?.some((s) => s.status === "out_for_delivery")).length})
              </button>
              <button
                onClick={() => setOrderFilter("delivered")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  orderFilter === "delivered"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                Delivered ({orders.filter((o) => o.status === "delivered").length})
              </button>
              <button
                onClick={() => setOrderFilter("cancelled")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  orderFilter === "cancelled"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                Cancelled ({orders.filter((o) => o.status === "cancelled").length})
              </button>
            </div>

            {/* Orders Cards Grid */}
            {filteredOrdersList.length === 0 ? (
              <Card className="text-center py-16 border-dashed">
                <CardHeader className="space-y-2">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto opacity-30" />
                  <CardTitle className="text-base">No Orders Match Filter</CardTitle>
                  <p className="text-xs text-muted-foreground">Try selecting a different filter above.</p>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredOrdersList.map((o) => {
                  const totalAmt = Number(o.total_amount || 0);
                  const platformProfitAmt = totalAmt * 0.1;
                  const vendorFundAmt = totalAmt * 0.9;
                  const canCancel = o.status !== "cancelled" && o.status !== "delivered";

                  return (
                    <Card
                      key={o.id}
                      className="overflow-hidden border hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="p-4 bg-muted/30 border-b flex items-start justify-between gap-2">
                          <div>
                            <div className="font-mono font-bold text-sm text-primary">
                              {o.order_number}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              {o.created_at ? new Date(o.created_at).toLocaleDateString() : "Recent"}
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className={
                              o.status === "delivered"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold"
                                : o.status === "cancelled"
                                ? "bg-destructive/15 text-destructive border-destructive/30 font-bold"
                                : o.status === "shipped"
                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
                            }
                          >
                            {o.status.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-3 text-xs">
                          {/* Customer snapshot */}
                          <div className="space-y-1">
                            <div className="font-bold text-foreground text-sm">
                              {o.shipping_address_snapshot?.recipient_name || "Customer"}
                            </div>
                            <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{o.shipping_address_snapshot?.phone_number || "No Phone"}</span>
                            </div>
                            <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="line-clamp-1">
                                {o.shipping_address_snapshot?.city}, {o.shipping_address_snapshot?.state}
                              </span>
                            </div>
                          </div>

                          {/* Vendors count */}
                          <div className="p-2 rounded-md bg-muted/40 flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Vendors:</span>
                            <span className="font-semibold text-foreground">
                              {o.sub_orders?.length || 1} Merchant Store(s)
                            </span>
                          </div>

                          {/* Financial Analysis Box on Card */}
                          <div className="p-2.5 rounded-lg border bg-gradient-to-br from-card to-muted/20 space-y-1 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Customer Paid:</span>
                              <span className="font-bold text-foreground">₹{totalAmt.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                              <span>Platform Profit (10%):</span>
                              <span>+₹{platformProfitAmt.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between items-center text-muted-foreground text-[11px]">
                              <span>Vendor Stores (90%):</span>
                              <span>₹{vendorFundAmt.toLocaleString("en-IN")}</span>
                            </div>
                          </div>

                          {/* Sub-order status pills */}
                          {o.sub_orders && o.sub_orders.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">Vendor Status:</span>
                              <div className="flex flex-wrap gap-1">
                                {o.sub_orders.map((so) => (
                                  <Badge key={so.id} variant="secondary" className="text-[10px] py-0 px-1.5 capitalize font-mono">
                                    {so.salesman_profiles?.store_name || "Store"}: {so.status.replace(/_/g, " ")}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="p-4 pt-0 border-t bg-muted/10 space-y-2 mt-2 pt-3">
                        <Button
                          size="sm"
                          className="w-full gap-1.5 text-xs font-semibold"
                          onClick={() => setSelectedAdminOrder(o)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Order Audit & Fund Details</span>
                        </Button>

                        {canCancel && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isCancellingOrder}
                            className="w-full text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={() => handleAdminCancelOrder(o.id)}
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                            <span>Cancel Order (Admin)</span>
                          </Button>
                        )}

                        <p className="text-[10px] text-center text-muted-foreground italic">
                          Admin restriction: Status marked by vendors only
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Order Details & Audit Modal */}
            {selectedAdminOrder && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs overflow-y-auto">
                <Card className="w-full max-w-2xl border shadow-2xl bg-card my-8">
                  <CardHeader className="flex flex-row items-start justify-between border-b pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold font-mono text-primary">
                          {selectedAdminOrder.order_number}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={
                            selectedAdminOrder.status === "delivered"
                              ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 font-bold"
                              : selectedAdminOrder.status === "cancelled"
                              ? "bg-destructive/15 text-destructive border-destructive/30 font-bold"
                              : "bg-blue-500/15 text-blue-700 border-blue-500/30 font-semibold"
                          }
                        >
                          {selectedAdminOrder.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        Placed on {selectedAdminOrder.created_at ? new Date(selectedAdminOrder.created_at).toLocaleString() : "Recent"} • Method: {selectedAdminOrder.payment_method?.toUpperCase()} ({selectedAdminOrder.payment_status})
                      </CardDescription>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedAdminOrder(null)}
                      className="h-8 w-8 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
                    {/* Admin Restriction Banner */}
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        <strong>Admin Governance Rule:</strong> Milestone fulfillment (Pending ➔ Shipped ➔ Reached Around ➔ Reached ➔ Delivered) is controlled exclusively by vendor stores. Admin cannot advance statuses, but may cancel orders if necessary.
                      </span>
                    </div>

                    {/* Customer & Shipping Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-lg border bg-muted/20">
                      <div>
                        <h4 className="font-bold text-foreground text-xs uppercase mb-1">Customer / Recipient</h4>
                        <p className="font-semibold text-sm">{selectedAdminOrder.shipping_address_snapshot?.recipient_name}</p>
                        <p className="text-muted-foreground">{selectedAdminOrder.shipping_address_snapshot?.phone_number}</p>
                        <p className="text-muted-foreground">{selectedAdminOrder.profiles?.email}</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-xs uppercase mb-1">Delivery Address</h4>
                        <p>{selectedAdminOrder.shipping_address_snapshot?.house_flat_no}, {selectedAdminOrder.shipping_address_snapshot?.street_locality}</p>
                        <p>{selectedAdminOrder.shipping_address_snapshot?.city}, {selectedAdminOrder.shipping_address_snapshot?.state} - {selectedAdminOrder.shipping_address_snapshot?.pin_code}</p>
                      </div>
                    </div>

                    {/* Financial Analysis for this Order ("how many fund maked through that order") */}
                    <div className="p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 space-y-3">
                      <h4 className="font-black text-sm uppercase text-emerald-800 dark:text-emerald-300 tracking-wide">
                        Financial Fund Audit for this Order
                      </h4>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-2.5 rounded-lg bg-background border">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Customer Paid</div>
                          <div className="text-base font-black text-foreground">
                            ₹{Number(selectedAdminOrder.total_amount).toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold">Platform Profit (10%)</div>
                          <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                            ₹{(Number(selectedAdminOrder.total_amount) * 0.1).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[9px] text-emerald-600">Marketplace Fund Made</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-background border">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold">Salesmen Share (90%)</div>
                          <div className="text-base font-black text-primary">
                            ₹{(Number(selectedAdminOrder.total_amount) * 0.9).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vendor Sub-Orders Breakdown */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-foreground text-xs uppercase">
                        Salesmen Store Allocations ({selectedAdminOrder.sub_orders?.length || 1} Stores)
                      </h4>
                      <div className="space-y-3">
                        {selectedAdminOrder.sub_orders?.map((sub: any) => {
                          const subAmt = Number(sub.subtotal_amount || 0);
                          const platformCut = subAmt * 0.1;
                          const sellerNet = subAmt * 0.9;
                          const subItems = selectedAdminOrder.order_items?.filter((it: any) => it.sub_order_id === sub.id) || [];

                          return (
                            <div key={sub.id} className="p-3.5 rounded-lg border bg-card space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b pb-2">
                                <div>
                                  <span className="font-bold text-sm text-foreground">
                                    {sub.salesman_profiles?.store_name || "Merchant Store"}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-mono ml-2">
                                    ({sub.sub_order_number})
                                  </span>
                                  {sub.salesman_profiles?.business_email && (
                                    <div className="text-[10px] text-muted-foreground">
                                      {sub.salesman_profiles.business_email} • {sub.salesman_profiles.business_phone}
                                    </div>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-[10px] font-mono capitalize self-start sm:self-auto">
                                  Status: {sub.status.replace(/_/g, " ")}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                                <div className="bg-muted/30 p-1.5 rounded">
                                  <span className="text-[10px] text-muted-foreground block">Store Subtotal:</span>
                                  <span className="font-bold">₹{subAmt.toLocaleString("en-IN")}</span>
                                </div>
                                <div className="bg-emerald-500/10 p-1.5 rounded text-emerald-700 dark:text-emerald-300">
                                  <span className="text-[10px] block">Platform 10% Fee:</span>
                                  <span className="font-bold">₹{platformCut.toLocaleString("en-IN")}</span>
                                </div>
                                <div className="bg-blue-500/10 p-1.5 rounded text-blue-700 dark:text-blue-300">
                                  <span className="text-[10px] block">Salesman Net Fund:</span>
                                  <span className="font-bold">₹{sellerNet.toLocaleString("en-IN")}</span>
                                </div>
                              </div>

                              {/* Items fulfilled by this store */}
                              {subItems.length > 0 && (
                                <div className="border rounded divide-y text-[11px]">
                                  {subItems.map((item: any) => (
                                    <div key={item.id} className="p-2 flex justify-between items-center">
                                      <div>
                                        <span className="font-medium text-foreground">{item.product_title}</span>
                                        <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                                      </div>
                                      <span className="font-mono font-semibold">₹{Number(item.total_price).toLocaleString("en-IN")}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cancel Button if eligible */}
                    {selectedAdminOrder.status !== "cancelled" && selectedAdminOrder.status !== "delivered" && (
                      <div className="border-t pt-4">
                        <Button
                          variant="destructive"
                          className="w-full gap-2 font-bold"
                          disabled={isCancellingOrder}
                          onClick={() => handleAdminCancelOrder(selectedAdminOrder.id)}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <span>Cancel Entire Order (Admin Emergency Override)</span>
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center mt-1">
                          Cancelling will immediately stop fulfillment across all vendor sub-orders.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );
      })()}

      {/* =================================================================== */}
      {/* TAB 4: COMPLETE USER ACCOUNTS MANAGEMENT                            */}
      {/* =================================================================== */}
      {activeTab === "users" && (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">User Accounts & Access Control</CardTitle>
            <CardDescription>
              Activate, suspend, or moderate customer, salesman, and admin permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-xs divide-y">
              <thead className="bg-muted/40 font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Registered Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20">
                    <td className="p-3 font-bold text-foreground">{u.full_name}</td>
                    <td className="p-3 font-mono text-muted-foreground">{u.email}</td>
                    <td className="p-3 font-mono">{u.phone_number || "—"}</td>
                    <td className="p-3">
                      <Badge variant={u.role === "admin" ? "destructive" : u.role === "salesman" ? "secondary" : "outline"} className="capitalize">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={u.status === "active" ? "text-emerald-700 bg-emerald-50 border-emerald-300" : "text-destructive bg-destructive/10"}
                      >
                        {u.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-7 px-2.5 text-xs ${
                          u.status === "active"
                            ? "text-destructive border-destructive/30 hover:bg-destructive/10"
                            : "text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                        }`}
                        onClick={() => handleToggleUserStatus(u.id, u.status)}
                      >
                        {u.status === "active" ? "Suspend Account" : "Activate Account"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* =================================================================== */}
      {/* TAB 5: CATEGORY BUILDER                                             */}
      {/* =================================================================== */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Add Global Category</CardTitle>
              <CardDescription>Expand marketplace product taxonomy</CardDescription>
            </CardHeader>
            <form onSubmit={handleAddCategory}>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Category Name *</label>
                  <Input value={newCatName} onChange={(e) => {
                    setNewCatName(e.target.value);
                    setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
                  }} placeholder="e.g. Health & Wellness" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Slug Identifier *</label>
                  <Input value={newCatSlug} onChange={(e) => setNewCatSlug(e.target.value)} placeholder="health-wellness" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                  <Input value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} placeholder="Supplements, vitamins, organic..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Banner Image URL</label>
                  <Input value={newCatImg} onChange={(e) => setNewCatImg(e.target.value)} placeholder="https://images.unsplash.com/..." />
                </div>
                <Button type="submit" className="w-full gap-1 mt-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Category</span>
                </Button>
              </CardContent>
            </form>
          </Card>

          <Card className="md:col-span-2 border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Existing Global Categories</CardTitle>
              <CardDescription>Managed categories active on the public storefront</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-xs divide-y">
                <thead className="bg-muted/40 font-bold uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Order</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Slug</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3 font-mono text-muted-foreground">#{c.display_order}</td>
                      <td className="p-3 font-bold">{c.name}</td>
                      <td className="p-3 font-mono text-muted-foreground">/{c.slug}</td>
                      <td className="p-3">
                        <Badge className={c.is_active ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}>
                          {c.is_active ? "Active" : "Paused"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleToggleCategory(c.id, c.is_active)}
                        >
                          {c.is_active ? "Pause" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: EDITABLE PLATFORM SETTINGS                                   */}
      {/* =================================================================== */}
      {activeTab === "settings" && (
        <Card className="max-w-xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Marketplace Configuration Settings</CardTitle>
            <CardDescription>Dynamic delivery policies, brand details, and support credentials</CardDescription>
          </CardHeader>
          <form onSubmit={handleSaveSettings}>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Marketplace Brand Name</label>
                <Input
                  value={marketplaceName}
                  onChange={(e) => setMarketplaceName(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Customer Support Email</label>
                <Input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="text-xs h-9 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Free Shipping Threshold (₹)</label>
                  <Input
                    type="number"
                    value={shippingThreshold}
                    onChange={(e) => setShippingThreshold(e.target.value)}
                    className="text-xs h-9 font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Standard Delivery Fee (₹)</label>
                  <Input
                    type="number"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(e.target.value)}
                    className="text-xs h-9 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full gap-2">
                  <Check className="h-4 w-4" />
                  <span>Save Platform Settings</span>
                </Button>
              </div>

              {Object.keys(platformSettings).length > 0 && (
                <div className="p-3 rounded-lg bg-muted/30 text-[11px] font-mono text-muted-foreground border mt-2">
                  <span className="font-bold text-foreground block mb-1">Active Database Configuration:</span>
                  <pre className="overflow-x-auto text-[10px]">{JSON.stringify(platformSettings, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </form>
        </Card>
      )}
    </div>
  );
}
