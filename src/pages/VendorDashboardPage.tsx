import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Store,
  Package,
  ShoppingBag,
  TrendingUp,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  Truck,
  MapPin,
  Calendar,
  BarChart3,
} from "lucide-react";
import {
  RevenueTrendAreaChart,
  StatusDistributionChart,
  FinancialFundDonutChart,
  type RevenuePoint,
} from "@/components/analytics/AnalyticsCharts";

export function VendorDashboardPage() {
  const { profile, salesmanProfile } = useAuth();
  const { navigate } = useNavigation();

  const [productCount, setProductCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [pausedCount, setPausedCount] = useState(0);
  const [totalUnits, setTotalUnits] = useState(0);

  // Dynamic Orders & Earnings
  const [vendorOrdersCount, setVendorOrdersCount] = useState(0);
  const [netEarnings, setNetEarnings] = useState(0);
  const [grossSales, setGrossSales] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [deliveredOrdersCount, setDeliveredOrdersCount] = useState(0);
  const [allSubOrders, setAllSubOrders] = useState<any[]>([]);
  const [recentSubOrders, setRecentSubOrders] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!salesmanProfile?.id) return;
      try {
        setIsLoading(true);

        // 1. Fetch Products
        const { data: prods } = await supabase
          .from("products")
          .select("id, status, available_stock")
          .eq("salesman_id", salesmanProfile.id);

        if (prods) {
          setProductCount(prods.length);
          setActiveCount(prods.filter((p) => p.status === "active").length);
          setPausedCount(prods.filter((p) => p.status === "paused").length);
          setTotalUnits(prods.reduce((sum, p) => sum + (p.available_stock || 0), 0));
        }

        // 2. Fetch Live Sub-orders & Earnings for this Salesman
        const { data: subOrders, error: subErr } = await supabase
          .from("sub_orders")
          .select(`
            *,
            orders (
              id,
              order_number,
              customer_id,
              shipping_address_snapshot
            ),
            order_items (*)
          `)
          .eq("salesman_id", salesmanProfile.id)
          .order("created_at", { ascending: false });

        if (!subErr && subOrders) {
          setAllSubOrders(subOrders);
          setVendorOrdersCount(subOrders.length);
          const totalEarned = subOrders.reduce(
            (sum, so) => sum + Number(so.vendor_net_earnings || 0),
            0
          );
          const totalGross = subOrders.reduce(
            (sum, so) => sum + Number(so.subtotal_amount || 0),
            0
          );
          setNetEarnings(totalEarned);
          setGrossSales(totalGross);

          setPendingOrdersCount(
            subOrders.filter(
              (so) => so.status === "confirmed" || so.status === "processing"
            ).length
          );
          setDeliveredOrdersCount(
            subOrders.filter((so) => so.status === "delivered").length
          );

          setRecentSubOrders(subOrders.slice(0, 5));
        }
      } catch (err) {
        console.error("Error loading vendor stats:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [salesmanProfile?.id]);

  // 1. Salesman Trend Area Chart Data
  const salesmanTrendData: RevenuePoint[] = useMemo(() => {
    const days: Record<string, { gross: number; net: number; commission: number; date: string }> = {};
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = `${dayNames[d.getDay()]} ${d.getDate()}`;
      days[key] = { gross: 0, net: 0, commission: 0, date: label };
    }

    allSubOrders.forEach((so) => {
      const key = so.created_at ? so.created_at.split("T")[0] : "";
      const amt = Number(so.subtotal_amount || 0);
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
  }, [allSubOrders]);

  // 2. Salesman Status Pipeline Distribution
  const salesmanStatusDistribution = useMemo(() => {
    const pending = allSubOrders.filter((s) => s.status === "confirmed" || s.status === "processing").length;
    const shipped = allSubOrders.filter((s) => s.status === "shipped").length;
    const reachedAround = allSubOrders.filter((s) => s.status === "packed").length;
    const reached = allSubOrders.filter((s) => s.status === "out_for_delivery").length;
    const delivered = allSubOrders.filter((s) => s.status === "delivered").length;
    const cancelled = allSubOrders.filter((s) => s.status === "cancelled").length;

    return [
      { stage: "Pending", count: pending, colorClass: "text-amber-500", bgClass: "bg-amber-500" },
      { stage: "Shipped", count: shipped, colorClass: "text-blue-500", bgClass: "bg-blue-500" },
      { stage: "Reached Around", count: reachedAround, colorClass: "text-indigo-500", bgClass: "bg-indigo-500" },
      { stage: "Reached", count: reached, colorClass: "text-purple-500", bgClass: "bg-purple-500" },
      { stage: "Delivered", count: delivered, colorClass: "text-emerald-500", bgClass: "bg-emerald-500" },
      { stage: "Cancelled", count: cancelled, colorClass: "text-rose-500", bgClass: "bg-rose-500" },
    ];
  }, [allSubOrders]);

  // 3. Salesman Fund Realization Slices
  const salesmanFundSlices = useMemo(() => {
    const deliveredEarnings = allSubOrders
      .filter((s) => s.status === "delivered")
      .reduce((sum, s) => sum + Number(s.vendor_net_earnings || 0), 0);
    const inTransitEarnings = netEarnings - deliveredEarnings;
    const platformCommission = grossSales * 0.1;

    return [
      { label: "Delivered Realized", amount: deliveredEarnings, color: "#10B981", desc: "Settled order earnings" },
      { label: "In-Transit Pending", amount: Math.max(inTransitEarnings, 0), color: "#3B82F6", desc: "Awaiting final delivery" },
      { label: "Platform Fee (10%)", amount: platformCommission, color: "#F59E0B", desc: "Retained marketplace fee" },
    ];
  }, [allSubOrders, netEarnings, grossSales]);

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              {salesmanProfile?.store_name || "Vendor Hub"}
            </h1>
            {salesmanProfile?.is_approved ? (
              <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>Verified Seller</span>
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1 text-amber-600">
                <Clock className="h-3 w-3" />
                <span>Pending Approval</span>
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Store URL identifier: <span className="font-mono text-xs text-foreground">/{salesmanProfile?.store_slug}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/vendor/orders")}
            className="gap-2 shadow-sm border-primary/40 text-primary hover:bg-primary/5"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Fulfillment Orders ({vendorOrdersCount})</span>
          </Button>

          <Button onClick={() => navigate("/vendor/products")} className="gap-2 shadow">
            <Plus className="h-4 w-4" />
            <span>Manage Products</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: My Products */}
        <Card
          className="cursor-pointer hover:border-primary/50 transition-all shadow-sm"
          onClick={() => navigate("/vendor/products")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Products</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : productCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeCount} Active | {pausedCount} Paused
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Inventory Stock */}
        <Card
          className="cursor-pointer hover:border-primary/50 transition-all shadow-sm"
          onClick={() => navigate("/vendor/products")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Stock</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">{isLoading ? "..." : totalUnits}</div>
              <span className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                + Restock Options
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total physical units in stock</p>
          </CardContent>
        </Card>

        {/* Card 3: Vendor Orders (Dynamic Live Sub-orders) */}
        <Card
          className="cursor-pointer hover:border-primary/50 transition-all shadow-sm bg-primary/5 border-primary/20"
          onClick={() => navigate("/vendor/orders")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Vendor Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? "..." : vendorOrdersCount}
            </div>
            <p className="text-xs text-primary font-semibold mt-1 flex items-center gap-1">
              <span>{pendingOrdersCount} Pending</span>
              <span>•</span>
              <span>{deliveredOrdersCount} Delivered</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Net Earnings (Dynamic Live Payout) */}
        <Card
          className="cursor-pointer hover:border-emerald-500/50 transition-all shadow-sm bg-emerald-500/5 border-emerald-500/20"
          onClick={() => navigate("/vendor/orders")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Net Earnings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {isLoading ? "..." : `₹${netEarnings.toLocaleString("en-IN")}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gross Sales: ₹{grossSales.toLocaleString("en-IN")} (Net of 10% Fee)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Salesman Interactive Analytics Charts Suite */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Merchant Performance & Revenue Analytics</h2>
        </div>

        {/* Row 1: Sales & Earnings Trend Chart + Donut Fund Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueTrendAreaChart
              data={salesmanTrendData}
              title="Store Revenue & Net Earnings Inflow"
              subtitle="Daily gross revenue vs 90% merchant payout after 10% marketplace fee"
              isSalesman={true}
            />
          </div>
          <div className="lg:col-span-1">
            <FinancialFundDonutChart
              slices={salesmanFundSlices}
              totalAmount={grossSales}
              title="Store Fund Realization"
            />
          </div>
        </div>

        {/* Row 2: Status Pipeline Distribution */}
        <StatusDistributionChart
          items={salesmanStatusDistribution}
          totalOrders={vendorOrdersCount}
          title="Fulfillment Order Velocity & Pipeline"
        />
      </div>

      {/* Recent Orders Section */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <span>Recent Customer Orders & Sales</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Live orders routed directly to your store for packing and dispatch
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => navigate("/vendor/orders")}
          >
            <span>View All ({vendorOrdersCount})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {recentSubOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
              <ShoppingBag className="h-8 w-8 mx-auto opacity-30" />
              <p>No orders received yet. Once customers checkout, sales appear here.</p>
            </div>
          ) : (
            <div className="divide-y text-xs">
              {recentSubOrders.map((so) => {
                const addr = so.orders?.shipping_address_snapshot;
                return (
                  <div
                    key={so.id}
                    className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate("/vendor/orders")}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground font-mono">
                          {so.sub_order_number}
                        </span>
                        <Badge
                          variant="outline"
                          className="capitalize text-[10px] font-semibold bg-background"
                        >
                          {so.status.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                        {addr && (
                          <span className="flex items-center gap-1 text-foreground font-medium">
                            <MapPin className="h-3 w-3 text-primary" />
                            {addr.recipient_name} ({addr.city})
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(so.created_at).toLocaleDateString()}
                        </span>
                        <span>{so.order_items?.length || 1} item(s)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Net Payout</span>
                        <span className="font-bold text-sm text-emerald-600">
                          ₹{Number(so.vendor_net_earnings).toLocaleString("en-IN")}
                        </span>
                      </div>

                      <Button variant="ghost" size="sm" className="h-8 px-2 text-primary gap-1">
                        <span>Details</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Store Profile & Product Management Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Store Profile Details</CardTitle>
            <CardDescription>Your registered merchant information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Registered Merchant:</span>
              <span className="font-medium">{profile?.full_name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Business Email:</span>
              <span className="font-medium">{salesmanProfile?.business_email}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">GSTIN / Tax ID:</span>
              <span className="font-mono text-xs">{salesmanProfile?.gstin || "29ABCDE1234F1Z5"}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground">Operating Address:</span>
              <span className="font-medium text-right max-w-xs">{salesmanProfile?.business_address}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted/30">
          <CardHeader>
            <CardTitle className="text-base">Product Management Hub</CardTitle>
            <CardDescription>Add new products or manage existing inventory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create product listings with rich descriptions, pricing, multiple images, and variants. Control which products are active or paused on the marketplace.
            </p>
            <Button className="w-full gap-2 shadow" onClick={() => navigate("/vendor/products")}>
              <span>Open Product Catalogue Manager</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
