import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useNavigation } from "@/context/NavigationContext";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag,
  Truck,
  Package,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  Phone,
  Calendar,
  X,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { SubOrder, SubOrderStatus } from "@/types";
import { StatusDistributionChart } from "@/components/analytics/AnalyticsCharts";

export function VendorOrdersPage() {
  const { salesmanProfile } = useAuth();
  const { createNotification } = useNotifications();
  const { navigate } = useNavigation();

  const [subOrders, setSubOrders] = useState<SubOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubOrder, setSelectedSubOrder] = useState<any | null>(null);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAnalyticsGraph, setShowAnalyticsGraph] = useState(true);

  // Status Distribution for Analytics
  const statusDistribution = useMemo(() => {
    const pending = subOrders.filter((s) => s.status === "confirmed" || s.status === "processing").length;
    const shipped = subOrders.filter((s) => s.status === "shipped").length;
    const reachedAround = subOrders.filter((s) => s.status === "packed").length;
    const reached = subOrders.filter((s) => s.status === "out_for_delivery").length;
    const delivered = subOrders.filter((s) => s.status === "delivered").length;
    const cancelled = subOrders.filter((s) => s.status === "cancelled").length;

    return [
      { stage: "Pending", count: pending, colorClass: "text-amber-500", bgClass: "bg-amber-500" },
      { stage: "Shipped", count: shipped, colorClass: "text-blue-500", bgClass: "bg-blue-500" },
      { stage: "Reached Around", count: reachedAround, colorClass: "text-indigo-500", bgClass: "bg-indigo-500" },
      { stage: "Reached", count: reached, colorClass: "text-purple-500", bgClass: "bg-purple-500" },
      { stage: "Delivered", count: delivered, colorClass: "text-emerald-500", bgClass: "bg-emerald-500" },
      { stage: "Cancelled", count: cancelled, colorClass: "text-rose-500", bgClass: "bg-rose-500" },
    ];
  }, [subOrders]);

  // Courier Inputs
  const [courierInput, setCourierInput] = useState<Record<string, string>>({});
  const [trackingInput, setTrackingInput] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (salesmanProfile?.id) {
      loadVendorOrders();
    }
  }, [salesmanProfile?.id]);

  const loadVendorOrders = async () => {
    try {
      setIsLoading(true);
      if (!salesmanProfile?.id) return;

      const { data, error } = await supabase
        .from("sub_orders")
        .select(`
          *,
          salesman_profiles (*),
          order_items (*),
          orders (
            id,
            order_number,
            customer_id,
            shipping_address_snapshot
          )
        `)
        .eq("salesman_id", salesmanProfile.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setSubOrders(data as any[]);
        if (selectedSubOrder) {
          const updatedSelected = data.find((d: any) => d.id === selectedSubOrder.id);
          if (updatedSelected) setSelectedSubOrder(updatedSelected);
        }
      }
    } catch (err) {
      console.error("Error loading vendor sub-orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Status Advancement & Customer Notification
  const handleUpdateStatus = async (
    subOrderId: string,
    newStatus: SubOrderStatus,
    customerId?: string
  ) => {
    setIsUpdating(true);
    try {
      const courier = courierInput[subOrderId] || "Standard BlueDart Express";
      const tracking = trackingInput[subOrderId] || `TRK-${Date.now().toString().slice(-6)}`;

      const updateData: Partial<SubOrder> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "shipped") {
        updateData.courier_partner = courier;
        updateData.tracking_number = tracking;
      }

      const { error } = await supabase
        .from("sub_orders")
        .update(updateData)
        .eq("id", subOrderId);

      if (error) throw error;

      // Status labels for tracking
      const stageNameMap: Record<string, string> = {
        confirmed: "Pending",
        processing: "Processing",
        shipped: "Shipped",
        packed: "Reached Around (Regional Sorting Hub)",
        out_for_delivery: "Reached Local Hub (Out for Delivery)",
        delivered: "Delivered",
      };

      // Add to status history
      await supabase.from("order_status_history").insert({
        sub_order_id: subOrderId,
        new_status: newStatus,
        notes: `Vendor advanced package milestone to ${stageNameMap[newStatus] || newStatus}.`,
      });

      // Send Instant Notification to Customer
      if (customerId) {
        const notifTitle =
          newStatus === "shipped"
            ? "Your Package Has Been Shipped!"
            : newStatus === "packed"
            ? "Package In Transit: Reached Around Regional Hub"
            : newStatus === "out_for_delivery"
            ? "Package Reached Local Facility - Out for Delivery!"
            : newStatus === "delivered"
            ? "Package Delivered Successfully!"
            : `Order Status: ${newStatus.toUpperCase()}`;

        const notifMsg =
          newStatus === "shipped"
            ? `Your order items have dispatched via ${courier}. Tracking ID: ${tracking}.`
            : newStatus === "delivered"
            ? "Your package has been delivered to your doorstep. Thank you for shopping!"
            : `Your order tracking has advanced to: ${stageNameMap[newStatus] || newStatus}.`;

        await createNotification(
          customerId,
          notifTitle,
          notifMsg,
          "order",
          "/account"
        );
      }

      await loadVendorOrders();
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Financial Analysis Calculations
  const totalGrossFund = subOrders.reduce((sum, so) => sum + Number(so.subtotal_amount || 0), 0);
  const totalCommission = subOrders.reduce((sum, so) => sum + Number(so.commission_amount || 0), 0);
  const totalNetEarnings = subOrders.reduce((sum, so) => sum + Number(so.vendor_net_earnings || 0), 0);
  const deliveredFunds = subOrders
    .filter((so) => so.status === "delivered")
    .reduce((sum, so) => sum + Number(so.vendor_net_earnings || 0), 0);
  const pendingFunds = totalNetEarnings - deliveredFunds;

  // Filtered Orders
  const filteredSubOrders = subOrders.filter((so) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return so.status === "confirmed" || so.status === "processing";
    if (statusFilter === "shipped") return so.status === "shipped";
    if (statusFilter === "reached_around") return so.status === "packed";
    if (statusFilter === "reached") return so.status === "out_for_delivery";
    if (statusFilter === "delivered") return so.status === "delivered";
    if (statusFilter === "cancelled") return so.status === "cancelled";
    return true;
  });

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vendor")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Salesman Order Control & Fulfillment Hub</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review order cards, update milestone tracking, and audit complete sales financials.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="font-mono text-xs bg-muted py-1 px-3">
          Merchant: {salesmanProfile?.store_name}
        </Badge>
      </div>

      {/* =================================================================== */}
      {/* FINANCIAL ANALYSIS SUMMARY CARDS                                    */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Gross Fund */}
        <Card className="border shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Gross Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-black text-foreground">
              ₹{totalGrossFund.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{subOrders.length} total orders</p>
          </CardContent>
        </Card>

        {/* Platform Commission Fund */}
        <Card className="border shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Platform Fee (10%)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-black text-amber-600">
              ₹{totalCommission.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Retained platform commission</p>
          </CardContent>
        </Card>

        {/* Net Earnings Fund */}
        <Card className="border shadow-xs bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300">Net Earnings Fund</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              ₹{totalNetEarnings.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">After 10% commission fee</p>
          </CardContent>
        </Card>

        {/* Realized / Delivered Funds */}
        <Card className="border shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Delivered / Realized</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-black text-primary">
              ₹{deliveredFunds.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Completed customer deliveries</p>
          </CardContent>
        </Card>

        {/* Pending Payout Funds */}
        <Card className="border shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">In-Transit / Pending</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-black text-foreground">
              ₹{pendingFunds.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting final delivery</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Chart Toggle & Graph */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">
              Fulfillment Pipeline Analysis Graph
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAnalyticsGraph(!showAnalyticsGraph)}
            className="text-xs h-7 px-2 gap-1 text-muted-foreground"
          >
            {showAnalyticsGraph ? (
              <>
                <span>Hide Graph</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>Show Graph</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>

        {showAnalyticsGraph && (
          <StatusDistributionChart
            items={statusDistribution}
            totalOrders={subOrders.length}
            title="Active Fulfillment Pipeline Distribution"
          />
        )}
      </div>

      {/* =================================================================== */}
      {/* STATUS FILTER BUTTONS                                               */}
      {/* =================================================================== */}
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-lg border transition-all ${
            statusFilter === "all"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          All Orders ({subOrders.length})
        </button>

        <button
          onClick={() => setStatusFilter("pending")}
          className={`px-3 py-1.5 rounded-lg border transition-all ${
            statusFilter === "pending"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          Pending / Confirmed ({subOrders.filter((s) => s.status === "confirmed" || s.status === "processing").length})
        </button>

        <button
          onClick={() => setStatusFilter("shipped")}
          className={`px-3 py-1.5 rounded-lg border transition-all ${
            statusFilter === "shipped"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          Shipped ({subOrders.filter((s) => s.status === "shipped").length})
        </button>

        <button
          onClick={() => setStatusFilter("reached_around")}
          className={`px-3 py-1.5 rounded-lg border transition-all ${
            statusFilter === "reached_around"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          Reached Around ({subOrders.filter((s) => s.status === "packed").length})
        </button>

        <button
          onClick={() => setStatusFilter("reached")}
          className={`px-3 py-1.5 rounded-lg border transition-all ${
            statusFilter === "reached"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          Reached Local Hub ({subOrders.filter((s) => s.status === "out_for_delivery").length})
        </button>

        <button
          onClick={() => setStatusFilter("delivered")}
          className={`px-3 py-1.5 rounded-lg border transition-all ${
            statusFilter === "delivered"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          Delivered ({subOrders.filter((s) => s.status === "delivered").length})
        </button>
      </div>

      {/* =================================================================== */}
      {/* ORDER CARDS GRID                                                    */}
      {/* =================================================================== */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-muted/60 animate-pulse border" />
          ))}
        </div>
      ) : filteredSubOrders.length === 0 ? (
        <Card className="text-center py-16 border-dashed">
          <CardHeader className="space-y-2">
            <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto opacity-30" />
            <CardTitle className="text-base">No Orders Found</CardTitle>
            <p className="text-xs text-muted-foreground">
              No orders match the selected status filter.
            </p>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSubOrders.map((so: any) => {
            const customerAddr = so.orders?.shipping_address_snapshot;

            // Mapping 5 human-readable stage tags
            const displayStage =
              so.status === "confirmed" || so.status === "processing"
                ? "1. Pending"
                : so.status === "shipped"
                ? "2. Shipped"
                : so.status === "packed"
                ? "3. Reached Around"
                : so.status === "out_for_delivery"
                ? "4. Reached"
                : so.status === "delivered"
                ? "5. Delivered"
                : so.status;

            return (
              <Card
                key={so.id}
                className="hover:border-primary/50 transition-all shadow-xs cursor-pointer border overflow-hidden flex flex-col justify-between"
                onClick={() => setSelectedSubOrder(so)}
              >
                <CardHeader className="p-4 bg-muted/30 border-b flex flex-row items-center justify-between pb-3">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-sm text-primary">
                      {so.sub_order_number}
                    </span>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(so.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-xs font-bold px-2.5 py-0.5 capitalize ${
                      so.status === "delivered"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : so.status === "shipped"
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : "bg-amber-50 text-amber-700 border-amber-300"
                    }`}
                  >
                    {displayStage}
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs flex-1">
                  {/* Customer and Contact Details */}
                  {customerAddr && (
                    <div className="p-2.5 rounded-lg bg-background border space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-sm">
                          {customerAddr.recipient_name}
                        </span>
                        <span className="font-mono text-primary font-bold flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customerAddr.phone_number}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-1">
                        {customerAddr.house_flat_no}, {customerAddr.street_locality}, {customerAddr.city} ({customerAddr.pin_code})
                      </p>
                    </div>
                  )}

                  {/* Items Summary */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase block">
                      Ordered Products ({so.order_items?.length || 1}):
                    </span>
                    {so.order_items?.slice(0, 2).map((it: any) => (
                      <div key={it.id} className="flex justify-between items-center text-foreground font-medium">
                        <span className="line-clamp-1 flex-1 pr-2">
                          • {it.product_title} × {it.quantity}
                        </span>
                        <span className="font-mono font-bold">₹{Number(it.total_price).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                    {(so.order_items?.length || 0) > 2 && (
                      <span className="text-[10px] text-muted-foreground">
                        + {(so.order_items?.length || 0) - 2} more item(s)...
                      </span>
                    )}
                  </div>

                  {/* Financial Breakdown for this Order Card */}
                  <div className="pt-2 border-t grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Gross Sale</span>
                      <span className="font-bold text-foreground">
                        ₹{Number(so.subtotal_amount).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-muted-foreground text-[10px] block">Net Salesman Payout</span>
                      <span className="font-black text-sm text-emerald-600">
                        ₹{Number(so.vendor_net_earnings).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </CardContent>

                {/* Card Action Footer */}
                <div className="p-3 bg-muted/20 border-t flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {so.courier_partner ? `Courier: ${so.courier_partner}` : "Awaiting Dispatch"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-primary/30 text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSubOrder(so);
                    }}
                  >
                    <span>View & Update Status</span>
                    <ArrowLeft className="h-3 w-3 rotate-180" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* =================================================================== */}
      {/* DETAILS & STATUS CONTROLS MODAL / DRAWER                            */}
      {/* =================================================================== */}
      {selectedSubOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-xl shadow-2xl border max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="bg-primary text-primary-foreground p-5 flex flex-row items-center justify-between">
              <div>
                <span className="text-xs font-mono text-primary-foreground/70 uppercase block">
                  Sub-Order Fulfillment Controls
                </span>
                <CardTitle className="text-lg font-bold text-white mt-0.5">
                  {selectedSubOrder.sub_order_number}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setSelectedSubOrder(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-6 text-xs">
              {/* Customer Delivery Snapshot */}
              <div className="p-4 rounded-xl border bg-muted/30 space-y-1.5">
                <span className="font-bold text-primary text-xs uppercase flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>Customer Destination & Contact</span>
                </span>
                <div className="pl-5 space-y-0.5 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {selectedSubOrder.orders?.shipping_address_snapshot?.recipient_name}
                    </span>
                    <span className="font-mono text-primary font-bold bg-background px-2 py-0.5 rounded border">
                      📞 {selectedSubOrder.orders?.shipping_address_snapshot?.phone_number}
                    </span>
                  </div>
                  <p className="text-foreground">
                    {selectedSubOrder.orders?.shipping_address_snapshot?.house_flat_no},{" "}
                    {selectedSubOrder.orders?.shipping_address_snapshot?.street_locality}
                  </p>
                  <p className="font-semibold text-foreground">
                    {selectedSubOrder.orders?.shipping_address_snapshot?.city},{" "}
                    {selectedSubOrder.orders?.shipping_address_snapshot?.state} -{" "}
                    {selectedSubOrder.orders?.shipping_address_snapshot?.pin_code}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="font-bold text-foreground text-xs uppercase">Items in this Package:</span>
                <div className="border rounded-lg divide-y bg-background">
                  {selectedSubOrder.order_items?.map((it: any) => (
                    <div key={it.id} className="p-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <p className="font-semibold text-foreground">{it.product_title}</p>
                          <span className="text-[11px] text-muted-foreground">Qty: {it.quantity}</span>
                        </div>
                      </div>
                      <span className="font-black text-sm text-foreground">
                        ₹{Number(it.total_price).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 rounded-xl bg-muted/20 border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal Gross Sale:</span>
                  <span className="font-bold text-foreground">
                    ₹{Number(selectedSubOrder.subtotal_amount).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>Platform Commission (10%):</span>
                  <span>-₹{Number(selectedSubOrder.commission_amount).toLocaleString("en-IN")}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm font-black text-emerald-600">
                  <span>Salesman Net Earnings:</span>
                  <span>₹{Number(selectedSubOrder.vendor_net_earnings).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Milestone Status Advance Controls */}
              <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs">
                    Current Milestone:{" "}
                    <span className="font-mono text-primary font-bold uppercase">
                      {selectedSubOrder.status.replace(/_/g, " ")}
                    </span>
                  </span>
                  <Badge variant="outline" className="bg-background text-[10px]">
                    Customer sync active
                  </Badge>
                </div>

                <div className="space-y-2 pt-2">
                  {/* Step 1: Pending -> Shipped */}
                  {(selectedSubOrder.status === "confirmed" || selectedSubOrder.status === "processing") && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Courier Partner (e.g. BlueDart)"
                          className="h-8 text-xs bg-background"
                          value={courierInput[selectedSubOrder.id] || ""}
                          onChange={(e) =>
                            setCourierInput((prev) => ({
                              ...prev,
                              [selectedSubOrder.id]: e.target.value,
                            }))
                          }
                        />
                        <Input
                          placeholder="Tracking # (e.g. BD-849201)"
                          className="h-8 text-xs font-mono bg-background"
                          value={trackingInput[selectedSubOrder.id] || ""}
                          onChange={(e) =>
                            setTrackingInput((prev) => ({
                              ...prev,
                              [selectedSubOrder.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <Button
                        className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        disabled={isUpdating}
                        onClick={() =>
                          handleUpdateStatus(
                            selectedSubOrder.id,
                            "shipped",
                            selectedSubOrder.orders?.customer_id
                          )
                        }
                      >
                        <Truck className="h-4 w-4" />
                        <span>Dispatch & Mark Shipped ➔</span>
                      </Button>
                    </div>
                  )}

                  {/* Step 2: Shipped -> Reached Around */}
                  {selectedSubOrder.status === "shipped" && (
                    <Button
                      className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                      disabled={isUpdating}
                      onClick={() =>
                        handleUpdateStatus(
                          selectedSubOrder.id,
                          "packed", // Maps to 'Reached Around'
                          selectedSubOrder.orders?.customer_id
                        )
                      }
                    >
                      <MapPin className="h-4 w-4" />
                      <span>Mark Reached Around (Regional Sorting Hub) ➔</span>
                    </Button>
                  )}

                  {/* Step 3: Reached Around -> Reached */}
                  {selectedSubOrder.status === "packed" && (
                    <Button
                      className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                      disabled={isUpdating}
                      onClick={() =>
                        handleUpdateStatus(
                          selectedSubOrder.id,
                          "out_for_delivery", // Maps to 'Reached'
                          selectedSubOrder.orders?.customer_id
                        )
                      }
                    >
                      <Truck className="h-4 w-4" />
                      <span>Mark Reached Local Facility (Out for Delivery) ➔</span>
                    </Button>
                  )}

                  {/* Step 4: Reached -> Delivered */}
                  {selectedSubOrder.status === "out_for_delivery" && (
                    <Button
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      disabled={isUpdating}
                      onClick={() =>
                        handleUpdateStatus(
                          selectedSubOrder.id,
                          "delivered",
                          selectedSubOrder.orders?.customer_id
                        )
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm Delivered to Customer ✓</span>
                    </Button>
                  )}

                  {/* Step 5: Completed */}
                  {selectedSubOrder.status === "delivered" && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Package Delivered & Fulfillment Completed</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSubOrder(null)}
                >
                  Close Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
