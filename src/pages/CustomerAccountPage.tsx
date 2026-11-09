import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useNavigation } from "@/context/NavigationContext";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  User,
  MapPin,
  Plus,
  Check,
  Trash2,
  AlertCircle,
  ShoppingBag,
  ArrowRight,
  Clock,
  Package,
  Store,
  CheckCircle2,
  Truck,
  Printer,
  FileText,
  Bell,
  RefreshCw,
  Phone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Address, Order } from "@/types";
import { DeliveryRouteTruckTracker } from "@/components/orders/DeliveryRouteTruckTracker";

export function CustomerAccountPage() {
  const { user, profile, role, signOut } = useAuth();
  const { cart } = useCart();
  const { navigate } = useNavigation();

  // Active Account Tab
  const [activeTab, setActiveTab] = useState<"orders" | "addresses">("orders");

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "delivered" | "cancelled">("all");
  const [liveNotification, setLiveNotification] = useState<string | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Address Form State
  const [recipientName, setRecipientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [houseFlatNo, setHouseFlatNo] = useState("");
  const [streetLocality, setStreetLocality] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAddresses();
    if (user?.id) {
      fetchCustomerOrders();
    }
  }, [user?.id]);

  // Real-time listener for sub_orders milestone updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("customer-orders-live-tracker")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sub_orders",
        },
        (payload: any) => {
          fetchCustomerOrders();
          if (payload.new && payload.new.status) {
            const prettyStatus = payload.new.status.replace(/_/g, " ").toUpperCase();
            setLiveNotification(
              `🔔 Order Tracking Live Update: Package #${payload.new.sub_order_number || ""} status changed to "${prettyStatus}"!`
            );
            setTimeout(() => setLiveNotification(null), 7000);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchCustomerOrders();
        }
      )
      .subscribe();

    // Polling fallback every 10 seconds for smooth live updates
    const interval = setInterval(() => {
      fetchCustomerOrders(false);
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id]);

  const fetchCustomerOrders = async (showLoadingState = true) => {
    if (!user?.id) return;
    try {
      if (showLoadingState) setIsLoadingOrders(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          sub_orders (
            *,
            salesman_profiles (*)
          ),
          order_items (*)
        `)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data as Order[]);
        // Auto-expand all active orders initially
        setExpandedOrders((prev) => {
          const updated = { ...prev };
          data.forEach((o: any) => {
            if (updated[o.id] === undefined) {
              updated[o.id] = true;
            }
          });
          return updated;
        });
      }
    } catch (err) {
      console.error("Error fetching customer orders:", err);
    } finally {
      if (showLoadingState) setIsLoadingOrders(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      setIsLoadingAddresses(true);
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false });

      if (!error && data) {
        setAddresses(data as Address[]);
      }
    } catch (err) {
      console.error("Error fetching addresses:", err);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you wish to cancel this order? This cannot be undone.")) return;
    setIsCancelling(true);
    try {
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
      setLiveNotification("Order cancelled successfully.");
      setTimeout(() => setLiveNotification(null), 4000);
    } catch (err: unknown) {
      console.error("Cancellation error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("Failed to cancel order: " + msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!recipientName || !phoneNumber || !houseFlatNo || !streetLocality || !city || !state || !pinCode) {
      setErrorMsg("Please complete all required address fields.");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session expired");

      const { error } = await supabase.from("addresses").insert({
        user_id: user.id,
        recipient_name: recipientName,
        phone_number: phoneNumber,
        house_flat_no: houseFlatNo,
        street_locality: streetLocality,
        landmark: landmark || null,
        city,
        district: district || city,
        state,
        pin_code: pinCode,
        is_default: isDefault,
      });

      if (error) throw error;

      setShowAddAddress(false);
      setRecipientName("");
      setPhoneNumber("");
      setHouseFlatNo("");
      setStreetLocality("");
      setLandmark("");
      setCity("");
      setDistrict("");
      setState("");
      setPinCode("");
      setIsDefault(false);
      await fetchAddresses();
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setErrorMsg(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (!error) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Error deleting address:", err);
    }
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "all") return true;
    if (orderFilter === "active") return o.status !== "delivered" && o.status !== "cancelled";
    if (orderFilter === "delivered") return o.status === "delivered";
    if (orderFilter === "cancelled") return o.status === "cancelled";
    return true;
  });

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-6 max-w-5xl">
      {/* Account Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Customer Portal</h1>
            <Badge variant="outline" className="capitalize text-xs font-semibold">
              {role || "Customer"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time package tracking, order management, credentials, and delivery addresses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {cart.length > 0 && (
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              onClick={() => navigate("/checkout")}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Checkout ({cart.length})</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => signOut()}
            className="text-destructive hover:bg-destructive/10"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Real-Time Status Notification Toast */}
      {liveNotification && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between gap-3 shadow-md animate-pulse">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{liveNotification}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px]"
            onClick={() => setLiveNotification(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Tab Switcher */}
      <div className="flex rounded-lg bg-muted p-1 text-xs font-semibold gap-1">
        <button
          className={`flex items-center gap-2 px-5 py-2.5 rounded-md transition-all ${
            activeTab === "orders"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("orders")}
        >
          <Truck className="h-4 w-4 text-primary" />
          <span>My Orders & Live Tracking ({orders.length})</span>
        </button>

        <button
          className={`flex items-center gap-2 px-5 py-2.5 rounded-md transition-all ${
            activeTab === "addresses"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("addresses")}
        >
          <MapPin className="h-4 w-4 text-primary" />
          <span>Delivery Addresses & Profile</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* SECTION 1: MY ORDERS & REAL-TIME 5-STAGE LIVE TRACKING              */}
      {/* =================================================================== */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          {/* Order Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3">
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
                onClick={() => setOrderFilter("active")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  orderFilter === "active"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                Active In-Transit ({orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length})
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

            <Button
              variant="outline"
              size="sm"
              disabled={isLoadingOrders}
              onClick={() => fetchCustomerOrders(true)}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingOrders ? "animate-spin" : ""}`} />
              <span>Refresh Orders</span>
            </Button>
          </div>

          {/* Orders Listing */}
          {isLoadingOrders ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-xl bg-muted/60 animate-pulse border" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="text-center py-16 border-dashed">
              <CardHeader className="space-y-2">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
                <CardTitle className="text-lg">No Orders Found</CardTitle>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {orderFilter === "all"
                    ? "You haven't placed any orders yet. Discover high-quality products across our marketplace."
                    : "No orders match this status filter."}
                </p>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/products")}>Browse Products</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => {
                const addr = order.shipping_address_snapshot;
                const isExpanded = !!expandedOrders[order.id];
                const canCancel = order.status !== "delivered" && order.status !== "cancelled";

                return (
                  <Card
                    key={order.id}
                    className="border shadow-xs overflow-hidden hover:border-primary/40 transition-all"
                  >
                    {/* Order Card Header */}
                    <div className="p-4 sm:p-5 bg-muted/30 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-base text-primary">
                            {order.order_number}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              order.status === "delivered"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold"
                                : order.status === "cancelled"
                                ? "bg-destructive/15 text-destructive border-destructive/30 font-bold"
                                : "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold"
                            }
                          >
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {order.created_at ? new Date(order.created_at).toLocaleString() : "Recent"}
                          </span>
                          <span>•</span>
                          <span>
                            Payment: <strong className="uppercase text-foreground">{order.payment_method}</strong> ({order.payment_status})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <div className="text-[11px] text-muted-foreground">Total Paid</div>
                          <div className="text-lg font-black text-foreground">
                            ₹{Number(order.total_amount).toLocaleString("en-IN")}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleOrderExpand(order.id)}
                          className="gap-1 text-xs"
                        >
                          {isExpanded ? (
                            <>
                              <span>Hide Tracking</span>
                              <ChevronUp className="h-4 w-4" />
                            </>
                          ) : (
                            <>
                              <span>Live Tracking</span>
                              <ChevronDown className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Order Details Body */}
                    {isExpanded && (
                      <CardContent className="p-4 sm:p-6 space-y-6">
                        {/* Delivery Address Snapshot */}
                        <div className="p-3.5 rounded-lg border bg-muted/20 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground uppercase tracking-wide text-[10px]">
                              Shipping Delivery Destination
                            </span>
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Address Verified
                            </span>
                          </div>
                          <div className="font-bold text-sm text-foreground">
                            {addr?.recipient_name}
                          </div>
                          <div className="text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3 w-3" />
                            <span>Phone: {addr?.phone_number}</span>
                          </div>
                          <div className="text-muted-foreground flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {addr?.house_flat_no}, {addr?.street_locality}, {addr?.city}, {addr?.state} - {addr?.pin_code}
                            </span>
                          </div>
                        </div>

                        {/* Packages Fulfilled by Vendors with 5-Stage Live Stepper */}
                        <div className="space-y-6">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Package Milestone Status ({order.sub_orders?.length || 1} Merchant Package{order.sub_orders?.length === 1 ? "" : "s"})
                          </h4>

                          {order.sub_orders?.map((subOrder) => {
                            const subItems = order.order_items?.filter((it) => it.sub_order_id === subOrder.id) || [];

                            return (
                              <div
                                key={subOrder.id}
                                className="border rounded-xl p-4 sm:p-5 bg-card space-y-5 shadow-xs"
                              >
                                {/* Sub-Order Vendor Info Header */}
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-3">
                                  <div className="flex items-center gap-2 text-xs">
                                    <Store className="h-4 w-4 text-primary" />
                                    <span className="font-bold text-sm text-foreground">
                                      {subOrder.salesman_profiles?.store_name || "Merchant Store"}
                                    </span>
                                    <span className="font-mono text-muted-foreground">({subOrder.sub_order_number})</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs font-semibold capitalize">
                                      {subOrder.status.replace(/_/g, " ")}
                                    </Badge>
                                    {subOrder.tracking_number && (
                                      <span className="text-[11px] font-mono text-muted-foreground">
                                        {subOrder.courier_partner}: {subOrder.tracking_number}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* ROUTE DRIVING DELIVERY TRUCK TRACKER */}
                                <DeliveryRouteTruckTracker
                                  status={subOrder.status}
                                  courierPartner={subOrder.courier_partner}
                                  trackingNumber={subOrder.tracking_number}
                                />

                                {/* Ordered items in this sub-order */}
                                <div className="border rounded-lg divide-y text-xs">
                                  {subItems.map((item) => (
                                    <div
                                      key={item.id}
                                      className="p-3 flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div>
                                          <div className="font-semibold text-foreground">
                                            {item.product_title}
                                          </div>
                                          {item.variant_name && (
                                            <div className="text-[10px] text-muted-foreground">
                                              {item.variant_name}
                                            </div>
                                          )}
                                          <div className="text-[11px] text-muted-foreground">
                                            Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString("en-IN")}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="font-bold text-foreground">
                                        ₹{Number(item.total_price).toLocaleString("en-IN")}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Order Footer Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-xs"
                            onClick={() => setInvoiceOrder(order)}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>View / Print GST Invoice</span>
                          </Button>

                          {canCancel && (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isCancelling}
                              className="text-xs"
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              Cancel Order
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION 2: SAVED ADDRESSES & PROFILE DETAILS                        */}
      {/* =================================================================== */}
      {activeTab === "addresses" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Details Card */}
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-8 w-8" />
                </div>
                <CardTitle className="text-lg mt-3">{profile?.full_name}</CardTitle>
                <CardDescription className="text-xs">{profile?.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mobile:</span>
                  <span className="font-medium">{profile?.phone_number || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Status:</span>
                  <span className="capitalize font-semibold text-emerald-600">{profile?.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registered:</span>
                  <span className="text-xs text-muted-foreground">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "Active"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Orders shortcut card */}
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors bg-gradient-to-br from-card to-muted/20"
              onClick={() => setActiveTab("orders")}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-bold text-sm">My Purchases & Live Tracking</div>
                    <p className="text-xs text-muted-foreground">{orders.length} orders recorded</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          {/* Saved Addresses Section */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Delivery Addresses</h2>
              </div>
              {!showAddAddress && (
                <Button size="sm" onClick={() => setShowAddAddress(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span>Add Address</span>
                </Button>
              )}
            </div>

            {/* Add Address Form */}
            {showAddAddress && (
              <Card className="border-primary/30 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">Add New Delivery Address</CardTitle>
                  <CardDescription>Enter recipient contact & delivery information</CardDescription>
                </CardHeader>
                <form onSubmit={handleAddAddress}>
                  <CardContent className="space-y-4">
                    {errorMsg && (
                      <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Recipient Full Name *</label>
                        <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Full Name" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">10-Digit Mobile Number *</label>
                        <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone" required />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Flat, House no., Building *</label>
                      <Input value={houseFlatNo} onChange={(e) => setHouseFlatNo(e.target.value)} placeholder="House / Flat No." required />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Area, Street, Sector *</label>
                      <Input value={streetLocality} onChange={(e) => setStreetLocality(e.target.value)} placeholder="Street / Locality" required />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Landmark (Optional)</label>
                        <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near Park" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Town / City *</label>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">PIN Code *</label>
                        <Input value={pinCode} onChange={(e) => setPinCode(e.target.value)} placeholder="6-digit PIN" maxLength={6} required />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">District</label>
                        <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">State *</label>
                        <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" required />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="default_addr"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="default_addr" className="text-xs text-muted-foreground">
                        Make this my default delivery address
                      </label>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save Address"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowAddAddress(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </form>
              </Card>
            )}

            {/* List of Saved Addresses */}
            {isLoadingAddresses ? (
              <p className="text-sm text-muted-foreground">Loading addresses...</p>
            ) : addresses.length === 0 && !showAddAddress ? (
              <div className="text-center py-10 border rounded-xl bg-card text-muted-foreground space-y-2">
                <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-medium">No saved delivery addresses found.</p>
                <p className="text-xs">Add an address now for quick one-click checkout.</p>
                <Button size="sm" variant="outline" onClick={() => setShowAddAddress(true)}>
                  Add First Address
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((addr) => (
                  <Card key={addr.id} className="relative">
                    <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{addr.recipient_name}</span>
                          {addr.is_default && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                              <Check className="h-3 w-3 text-emerald-600" /> Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {addr.house_flat_no}, {addr.street_locality}
                          {addr.landmark ? `, Near ${addr.landmark}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {addr.city}, {addr.state} - {addr.pin_code}
                        </p>
                        <p className="text-xs text-muted-foreground">Phone: {addr.phone_number}</p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive self-end sm:self-center"
                        onClick={() => handleDeleteAddress(addr.id)}
                        title="Delete Address"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable GST Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-2xl border shadow-2xl bg-card my-8 p-6 space-y-6">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h2 className="text-xl font-bold">TAX INVOICE</h2>
                <p className="text-xs text-muted-foreground font-mono">
                  Ref: INV-{invoiceOrder.order_number}
                </p>
                <p className="text-xs text-muted-foreground">Original for Recipient</p>
              </div>
              <div className="text-right text-xs space-y-1">
                <div className="font-bold text-sm text-primary">ModernShop Marketplace</div>
                <p className="text-muted-foreground">GSTIN: 29AAACM1234F1Z8</p>
                <p className="text-muted-foreground">Bengaluru, Karnataka, India</p>
                <div className="flex items-center gap-2 justify-end pt-1">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}>
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print PDF</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setInvoiceOrder(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <h4 className="font-bold uppercase text-muted-foreground mb-1">Billed & Shipped To:</h4>
                <p className="font-bold text-sm">{invoiceOrder.shipping_address_snapshot?.recipient_name}</p>
                <p>{invoiceOrder.shipping_address_snapshot?.house_flat_no}, {invoiceOrder.shipping_address_snapshot?.street_locality}</p>
                <p>{invoiceOrder.shipping_address_snapshot?.city}, {invoiceOrder.shipping_address_snapshot?.state} - {invoiceOrder.shipping_address_snapshot?.pin_code}</p>
                <p>Phone: {invoiceOrder.shipping_address_snapshot?.phone_number}</p>
              </div>
              <div className="text-right">
                <h4 className="font-bold uppercase text-muted-foreground mb-1">Order Details:</h4>
                <p>Date: {new Date(invoiceOrder.created_at || "").toLocaleDateString()}</p>
                <p className="capitalize">Method: {invoiceOrder.payment_method} ({invoiceOrder.payment_status})</p>
                <p className="font-bold text-foreground">Status: {invoiceOrder.status}</p>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="border rounded-md overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted font-bold">
                  <tr>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Total (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoiceOrder.order_items?.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2.5">
                        <div className="font-medium text-foreground">{item.product_title}</div>
                        {item.variant_name && <div className="text-[10px] text-muted-foreground">{item.variant_name}</div>}
                      </td>
                      <td className="p-2.5 text-center">{item.quantity}</td>
                      <td className="p-2.5 text-right">₹{Number(item.unit_price).toLocaleString("en-IN")}</td>
                      <td className="p-2.5 text-right font-semibold">₹{Number(item.total_price).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/20 font-bold">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-right">Subtotal:</td>
                    <td className="p-2.5 text-right">₹{Number(invoiceOrder.subtotal_amount).toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-2.5 text-right">Shipping:</td>
                    <td className="p-2.5 text-right">{invoiceOrder.shipping_fee === 0 ? "FREE" : `₹${invoiceOrder.shipping_fee}`}</td>
                  </tr>
                  <tr className="text-sm font-extrabold text-foreground border-t">
                    <td colSpan={3} className="p-2.5 text-right">Grand Total:</td>
                    <td className="p-2.5 text-right text-primary">₹{Number(invoiceOrder.total_amount).toLocaleString("en-IN")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
