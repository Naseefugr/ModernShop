import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useNotifications } from "@/context/NotificationContext";
import { useNavigation } from "@/context/NavigationContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  CreditCard,
  QrCode,
  Banknote,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Tag,
  Check,
  Plus,
  Truck,
  CheckCircle2,
  Lock,
  ShoppingBag,
  Building,
  Phone,
  Printer,
  FileText,
} from "lucide-react";
import type { Address, PaymentMethod, Order } from "@/types";
import { DeliveryRouteTruckTracker } from "@/components/orders/DeliveryRouteTruckTracker";

type CheckoutStep = "address" | "payment" | "approved";

// User's exact 5 tracking stages:
export type TrackingStage = "Pending" | "Shipped" | "Reached Around" | "Reached" | "Delivered";

const TRACKING_STAGES: { stage: TrackingStage; description: string }[] = [
  { stage: "Pending", description: "Order Placed & Awaiting Seller Dispatch" },
  { stage: "Shipped", description: "Dispatched from Merchant Fulfillment Center" },
  { stage: "Reached Around", description: "In Transit - Arrived at Regional Sorting Hub" },
  { stage: "Reached", description: "Reached Local Distribution Hub - Out for Delivery" },
  { stage: "Delivered", description: "Package Delivered & Signed by Customer" },
];

export function CheckoutPage() {
  const { user, isAuthenticated } = useAuth();
  const { cart, subtotal, clearCart } = useCart();
  const { createNotification } = useNotifications();
  const { navigate } = useNavigation();

  // Workflow Steps
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("address");

  // Address State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({
    recipient_name: "",
    phone_number: "",
    house_flat_no: "",
    street_locality: "",
    landmark: "",
    city: "",
    district: "",
    state: "",
    pin_code: "",
    is_default: false,
  });

  // Payment State: "cod" (Cash on Delivery) vs "ebanking" (E-Banking)
  const [paymentChoice, setPaymentChoice] = useState<"cod" | "ebanking">("ebanking");
  // E-Banking 4 Demo Sub-Options: Net Banking, UPI, Credit Card, Debit Card
  const [ebankingSubMethod, setEbankingSubMethod] = useState<"net_banking" | "upi" | "credit_card" | "debit_card">("upi");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [isGatewaySimulating, setIsGatewaySimulating] = useState(false);

  // Coupons
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Order Placement & Live Tracking
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [activeTrackingIndex, setActiveTrackingIndex] = useState(0);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    async function loadAddresses() {
      try {
        const { data } = await supabase
          .from("addresses")
          .select("*")
          .order("is_default", { ascending: false });

        if (data && data.length > 0) {
          setAddresses(data as Address[]);
          const defaultAddr = data.find((a) => a.is_default) || data[0];
          setSelectedAddressId(defaultAddr.id);
        }
      } catch (err) {
        console.error("Error loading addresses for checkout:", err);
      }
    }

    loadAddresses();
  }, [isAuthenticated, navigate]);

  const shippingFee = subtotal >= 999 || subtotal === 0 ? 0 : 49;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const selectedAddr = addresses.find((a) => a.id === selectedAddressId);

  // Handle Add New Address Inline and Auto-Select
  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingAddress(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from("addresses")
        .insert({
          user_id: user.id,
          recipient_name: newAddr.recipient_name,
          phone_number: newAddr.phone_number,
          house_flat_no: newAddr.house_flat_no,
          street_locality: newAddr.street_locality,
          landmark: newAddr.landmark || null,
          city: newAddr.city,
          district: newAddr.district || newAddr.city,
          state: newAddr.state,
          pin_code: newAddr.pin_code,
          is_default: newAddr.is_default || addresses.length === 0,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setAddresses((prev) => [data as Address, ...prev]);
        setSelectedAddressId(data.id);
        setIsAddingAddress(false);
        setNewAddr({
          recipient_name: "",
          phone_number: "",
          house_flat_no: "",
          street_locality: "",
          landmark: "",
          city: "",
          district: "",
          state: "",
          pin_code: "",
          is_default: false,
        });
      }
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setErrorMessage(e.message || "Failed to save address.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleApplyCoupon = async () => {
    setCouponError(null);
    if (!couponCode.trim()) return;

    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.trim().toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        setCouponError("Invalid or expired coupon code.");
        return;
      }

      if (subtotal < data.minimum_order_amount) {
        setCouponError(`Minimum order amount of ₹${data.minimum_order_amount} required.`);
        return;
      }

      let discount = 0;
      if (data.discount_percentage) {
        discount = (subtotal * data.discount_percentage) / 100;
        if (data.max_discount_amount) {
          discount = Math.min(discount, data.max_discount_amount);
        }
      } else if (data.flat_discount_amount) {
        discount = data.flat_discount_amount;
      }

      setDiscountAmount(discount);
      setCouponApplied(data.code);
      setCouponCode("");
    } catch {
      setCouponError("Failed to apply coupon.");
    }
  };

  // Place Order Engine (Multi-vendor Split)
  const executePlaceOrder = async (
    method: PaymentMethod,
    paymentStatus: "pending" | "captured"
  ) => {
    setErrorMessage(null);

    if (cart.length === 0) {
      setErrorMessage("Your shopping cart is empty.");
      return;
    }

    if (!selectedAddr) {
      setErrorMessage("Please select or add a delivery address to proceed.");
      setCurrentStep("address");
      return;
    }

    setIsProcessing(true);
    try {
      if (!user) throw new Error("Authentication required");

      const orderNumber =
        "ORD-" +
        new Date().toISOString().slice(0, 10).replace(/-/g, "") +
        "-" +
        Math.floor(1000 + Math.random() * 9000);

      // 1. Create Master Order in PostgreSQL
      const { data: masterOrder, error: orderErr } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_id: user.id,
          shipping_address_id: selectedAddr.id,
          shipping_address_snapshot: selectedAddr,
          subtotal_amount: subtotal,
          discount_amount: discountAmount,
          shipping_fee: shippingFee,
          total_amount: grandTotal,
          payment_method: method,
          payment_status: paymentStatus,
          status: "confirmed",
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. Multi-Vendor Order Splitting: Partition cart items by salesman_id
      const vendorSplits: Record<string, typeof cart> = {};
      cart.forEach((item) => {
        const vId = item.product.salesman_id;
        if (!vendorSplits[vId]) vendorSplits[vId] = [];
        vendorSplits[vId].push(item);
      });

      let splitIndex = 1;
      for (const [vendorId, items] of Object.entries(vendorSplits)) {
        const subOrderSubtotal = items.reduce((sum, item) => {
          const unitPrice =
            Number(item.product.selling_price) + (item.selectedVariant?.additional_price || 0);
          return sum + unitPrice * item.quantity;
        }, 0);

        const commissionPercentage = 10.0;
        const commissionAmount = (subOrderSubtotal * commissionPercentage) / 100;
        const vendorNet = subOrderSubtotal - commissionAmount;

        const charSuffix = String.fromCharCode(64 + splitIndex);
        const subOrderNumber = `${orderNumber}-${charSuffix}`;

        // Create Sub-Order
        const { data: subOrder, error: subErr } = await supabase
          .from("sub_orders")
          .insert({
            sub_order_number: subOrderNumber,
            master_order_id: masterOrder.id,
            salesman_id: vendorId,
            subtotal_amount: subOrderSubtotal,
            commission_percentage: commissionPercentage,
            commission_amount: commissionAmount,
            vendor_net_earnings: vendorNet,
            status: "confirmed",
          })
          .select()
          .single();

        if (subErr) throw subErr;

        // Insert Order Items
        for (const item of items) {
          const unitPrice =
            Number(item.product.selling_price) + (item.selectedVariant?.additional_price || 0);

          await supabase.from("order_items").insert({
            master_order_id: masterOrder.id,
            sub_order_id: subOrder.id,
            product_id: item.product.id,
            variant_id: item.selectedVariant?.id || null,
            salesman_id: vendorId,
            product_title: item.product.title,
            product_sku: item.selectedVariant?.sku || item.product.sku,
            variant_name: item.selectedVariant?.variant_name || null,
            product_image_url:
              item.product.product_images?.[0]?.image_url || null,
            unit_price: unitPrice,
            quantity: item.quantity,
            total_price: unitPrice * item.quantity,
          });

          // Decrement product inventory atomically via RPC or update
          try {
            await supabase.rpc("decrement_product_stock", {
              p_product_id: item.product.id,
              p_quantity: item.quantity,
            });
          } catch {
            await supabase
              .from("products")
              .update({
                available_stock: Math.max(0, item.product.available_stock - item.quantity),
                total_sold_count: (item.product.total_sold_count || 0) + item.quantity,
              })
              .eq("id", item.product.id);
          }
        }

        // Add initial status history milestone: Pending
        await supabase.from("order_status_history").insert({
          sub_order_id: subOrder.id,
          new_status: "confirmed",
          notes:
            method === "cod"
              ? "Order placed via Cash on Delivery. Status: Pending."
              : `Order placed via E-Banking (${ebankingSubMethod.toUpperCase()}). Status: Pending.`,
          updated_by: user.id,
        });

        // Notify Salesman
        const { data: sProf } = await supabase
          .from("salesman_profiles")
          .select("user_id, store_name")
          .eq("id", vendorId)
          .single();

        if (sProf && sProf.user_id) {
          await createNotification(
            sProf.user_id,
            "New Order Received!",
            `Order #${subOrderNumber} placed with ${items.length} items. Total: ₹${subOrderSubtotal}.`,
            "order",
            "/vendor/orders"
          );
        }

        splitIndex++;
      }

      // Notify Customer
      await createNotification(
        user.id,
        "Order Confirmed & Approved!",
        `Your order #${orderNumber} of ₹${grandTotal.toLocaleString("en-IN")} has been placed successfully.`,
        "order",
        `/account/orders/${masterOrder.id}`
      );

      // Snapshot order, clear cart and switch to Step 3
      setConfirmedOrder(masterOrder as Order);
      setActiveTrackingIndex(0); // Starts at 'Pending'
      clearCart();
      setIsGatewayModalOpen(false);
      setCurrentStep("approved");
    } catch (err: unknown) {
      console.error("Checkout failure:", err);
      const msg =
        (err as any)?.message ||
        (err as any)?.error_description ||
        (err as any)?.details ||
        (err instanceof Error
          ? err.message
          : typeof err === "object"
          ? JSON.stringify(err)
          : String(err));
      setErrorMessage(msg || "Failed to process order.");
    } finally {
      setIsProcessing(false);
    }
  };

  // E-Banking Demo Payment Simulation
  const handleApproveEbankingPayment = async () => {
    setIsGatewaySimulating(true);
    setTimeout(async () => {
      // Map ebanking sub-method to database payment_method enum ('upi' | 'card' | 'net_banking')
      const mappedMethod: PaymentMethod =
        ebankingSubMethod === "net_banking"
          ? "net_banking"
          : ebankingSubMethod === "upi"
          ? "upi"
          : "card";

      await executePlaceOrder(mappedMethod, "captured");
      setIsGatewaySimulating(false);
    }, 1200);
  };

  // =========================================================================
  // STEP 3: ANIMATED TICK APPROVED PAGE + LIVE PRODUCT TRACKING
  // (Pending -> Shipped -> Reached Around -> Reached -> Delivered)
  // =========================================================================
  if (currentStep === "approved" && confirmedOrder) {
    const activeStage = TRACKING_STAGES[activeTrackingIndex];

    return (
      <div className="container mx-auto px-4 sm:px-8 py-10 max-w-4xl space-y-8">
        {/* Approved Celebration Card with Animated Tick */}
        <Card className="border-border/80 shadow-2xl overflow-hidden">
          <div className="bg-emerald-500/10 py-10 px-6 border-b border-emerald-500/20 text-center">
            {/* Animated Checkmark Tick */}
            <div className="flex justify-center mb-4 animate-checkmark-scale">
              <svg className="w-24 h-24" viewBox="0 0 52 52">
                <circle
                  className="animate-checkmark-circle"
                  cx="26"
                  cy="26"
                  r="25"
                />
                <path
                  className="animate-checkmark-check"
                  d="M14 27l8 8 16-16"
                />
              </svg>
            </div>

            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 mb-2 px-3.5 py-1 text-xs font-bold tracking-wide">
              ORDER APPROVED & CONFIRMED
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Thank You! Your Order is Approved
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
              Your order <span className="font-mono font-bold text-foreground">#{confirmedOrder.order_number}</span> has been verified and registered. Live tracking has started below.
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-8">
            {/* Quick Order Snapshot Info Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/30 border text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Order Number</span>
                <span className="font-bold font-mono text-sm text-primary">
                  {confirmedOrder.order_number}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Payment Mode</span>
                <span className="font-semibold text-foreground capitalize">
                  {confirmedOrder.payment_method === "cod"
                    ? "Cash on Delivery"
                    : `E-Banking (${confirmedOrder.payment_method.replace(/_/g, " ").toUpperCase()})`}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Payment Status</span>
                <Badge
                  variant="outline"
                  className={
                    confirmedOrder.payment_status === "captured"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
                      : "bg-amber-50 text-amber-700 border-amber-200 font-semibold"
                  }
                >
                  {confirmedOrder.payment_status === "captured" ? "Paid (Authorized)" : "Pay at Doorstep"}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Payable Amount</span>
                <span className="font-black text-sm text-primary">
                  ₹{Number(confirmedOrder.total_amount).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Recipient Address and Phone (Prominently Highlighted) */}
            {selectedAddr && (
              <div className="p-4 rounded-xl border bg-background space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                    <MapPin className="h-4 w-4" />
                    <span>Delivery Address & Contact Number</span>
                  </div>
                  <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-[10px]">
                    Verified Destination
                  </Badge>
                </div>

                <div className="text-xs space-y-1 text-muted-foreground pl-6">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-foreground">
                      {selectedAddr.recipient_name}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-sm text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                      <Phone className="h-3.5 w-3.5" />
                      {selectedAddr.phone_number}
                    </span>
                  </div>
                  <p className="text-foreground">
                    {selectedAddr.house_flat_no}, {selectedAddr.street_locality}
                    {selectedAddr.landmark ? `, Near ${selectedAddr.landmark}` : ""}
                  </p>
                  <p className="font-semibold text-foreground">
                    {selectedAddr.city}, {selectedAddr.state} - {selectedAddr.pin_code}
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* PRODUCT LIVE TRACKING (5 STAGES: Pending, Shipped, Reached Around, Reached, Delivered) */}
            {/* ============================================================= */}
            <div className="p-6 rounded-xl border-2 border-primary/20 bg-muted/10 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-4 border-b">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-bold text-foreground">
                      Track of Product (Live Milestone Tracking)
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Current Status: <span className="font-bold text-primary font-mono">{activeStage.stage}</span> — {activeStage.description}
                  </p>
                </div>

                <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 text-xs px-2.5 py-1 font-semibold flex items-center gap-1 self-start sm:self-auto">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Seller Fulfillment Sync Active</span>
                </Badge>
              </div>

              {/* Driving Delivery Truck Route Tracker */}
              <DeliveryRouteTruckTracker
                status="confirmed"
                courierPartner="Express BlueDart Surface"
                trackingNumber={`TRK-${confirmedOrder.order_number?.slice(-6) || "98214"}`}
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  size="lg"
                  className="gap-2 shadow-md"
                  onClick={() => navigate(`/account/orders/${confirmedOrder.id}`)}
                >
                  <Truck className="h-4 w-4" />
                  <span>View Full Order Details</span>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-primary/40 text-primary"
                  onClick={() => setShowInvoiceModal(!showInvoiceModal)}
                >
                  <FileText className="h-4 w-4" />
                  <span>{showInvoiceModal ? "Hide GST Invoice" : "View GST Invoice"}</span>
                </Button>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/account/orders")}
                  className="text-xs"
                >
                  View All Orders
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/catalog")}
                  className="text-xs"
                >
                  Continue Shopping
                </Button>
              </div>
            </div>

            {/* In-Line GST Tax Invoice Preview */}
            {showInvoiceModal && (
              <Card className="border border-border p-6 shadow-md space-y-4 bg-background">
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <h4 className="font-bold text-sm">TAX INVOICE (DEMO)</h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      REF: INV-{confirmedOrder.order_number}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1 text-xs">
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print PDF</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-muted-foreground block text-[11px]">Billed & Shipped To:</span>
                    <p className="font-bold text-foreground">{selectedAddr?.recipient_name}</p>
                    <p className="font-mono text-primary font-bold">Ph: {selectedAddr?.phone_number}</p>
                    <p>{selectedAddr?.house_flat_no}, {selectedAddr?.street_locality}</p>
                    <p>{selectedAddr?.city}, {selectedAddr?.state} - {selectedAddr?.pin_code}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-muted-foreground block text-[11px]">Order Financials:</span>
                    <p>Total: ₹{Number(confirmedOrder.total_amount).toLocaleString("en-IN")}</p>
                    <p className="capitalize">Method: {confirmedOrder.payment_method}</p>
                    <p className="capitalize">Status: {confirmedOrder.payment_status}</p>
                  </div>
                </div>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // MAIN CHECKOUT CONTAINER: STEP 1 (ADDRESS) & STEP 2 (PAYMENT)
  // =========================================================================
  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-5xl">
      {/* Header with Visual Progress Tabs */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Select delivery address, choose payment mode, and complete your purchase.
        </p>

        {/* Stepper Tabs */}
        <div className="flex items-center justify-between max-w-md mt-6 text-xs font-semibold">
          {/* Step 1 Pill */}
          <button
            type="button"
            onClick={() => setCurrentStep("address")}
            className={`flex items-center gap-2 ${
              currentStep === "address"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                currentStep === "address"
                  ? "bg-primary text-primary-foreground font-bold"
                  : selectedAddressId
                  ? "bg-emerald-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {selectedAddressId && currentStep === "payment" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                "1"
              )}
            </span>
            <span>1. Delivery Address</span>
          </button>

          <div className="h-0.5 w-12 bg-border mx-2" />

          {/* Step 2 Pill */}
          <button
            type="button"
            disabled={!selectedAddressId}
            onClick={() => selectedAddressId && setCurrentStep("payment")}
            className={`flex items-center gap-2 ${
              currentStep === "payment"
                ? "text-primary font-bold"
                : "text-muted-foreground"
            }`}
          >
            <span
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                currentStep === "payment"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </span>
            <span>2. Payment (COD / E-Banking)</span>
          </button>

          <div className="h-0.5 w-12 bg-border mx-2" />

          {/* Step 3 Pill */}
          <div className="flex items-center gap-2 text-muted-foreground opacity-50">
            <span className="h-6 w-6 rounded-full flex items-center justify-center text-xs bg-muted">
              3
            </span>
            <span>3. Approved & Track</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Active Step Workflow (Address or Payment) */}
        <div className="lg:col-span-2 space-y-6">
          {/* =============================================================== */}
          {/* STEP 1: SELECT EXISTING ADDRESS OR ADD NEW ADDRESS             */}
          {/* =============================================================== */}
          {currentStep === "address" && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Select Delivery Address</CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Address and contact number are verified before dispatch
                  </CardDescription>
                </div>
                {!isAddingAddress && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs border-primary/40 text-primary"
                    onClick={() => setIsAddingAddress(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add New Address</span>
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Inline Add New Address Form */}
                {isAddingAddress && (
                  <form onSubmit={handleSaveNewAddress} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5 text-primary" />
                        <span>Add New Delivery Address</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2 text-muted-foreground"
                        onClick={() => setIsAddingAddress(false)}
                      >
                        Cancel
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-foreground">
                          Recipient Full Name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          required
                          value={newAddr.recipient_name}
                          onChange={(e) => setNewAddr({ ...newAddr, recipient_name: e.target.value })}
                          placeholder="e.g. Muhammad Naseef"
                          className="text-xs h-9 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-foreground">
                          Mobile Contact Number <span className="text-destructive">*</span>
                        </label>
                        <Input
                          required
                          value={newAddr.phone_number}
                          onChange={(e) => setNewAddr({ ...newAddr, phone_number: e.target.value })}
                          placeholder="e.g. 08086636371"
                          className="text-xs h-9 mt-1 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-foreground">
                          House / Flat / Building No. <span className="text-destructive">*</span>
                        </label>
                        <Input
                          required
                          value={newAddr.house_flat_no}
                          onChange={(e) => setNewAddr({ ...newAddr, house_flat_no: e.target.value })}
                          placeholder="5252, Kannancheri (H)"
                          className="text-xs h-9 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-foreground">
                          Street / Locality / PO <span className="text-destructive">*</span>
                        </label>
                        <Input
                          required
                          value={newAddr.street_locality}
                          onChange={(e) => setNewAddr({ ...newAddr, street_locality: e.target.value })}
                          placeholder="Ugrapuram (PO), Kariparambu"
                          className="text-xs h-9 mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-foreground">
                          City / Town <span className="text-destructive">*</span>
                        </label>
                        <Input
                          required
                          value={newAddr.city}
                          onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                          placeholder="Areekode"
                          className="text-xs h-9 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-foreground">
                          State <span className="text-destructive">*</span>
                        </label>
                        <Input
                          required
                          value={newAddr.state}
                          onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                          placeholder="Kerala"
                          className="text-xs h-9 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-foreground">
                          PIN Code <span className="text-destructive">*</span>
                        </label>
                        <Input
                          required
                          maxLength={6}
                          value={newAddr.pin_code}
                          onChange={(e) => setNewAddr({ ...newAddr, pin_code: e.target.value })}
                          placeholder="673639"
                          className="text-xs h-9 mt-1 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="default_check"
                        checked={newAddr.is_default}
                        onChange={(e) => setNewAddr({ ...newAddr, is_default: e.target.checked })}
                        className="accent-primary"
                      />
                      <label htmlFor="default_check" className="text-xs text-muted-foreground cursor-pointer">
                        Set as my default delivery address
                      </label>
                    </div>

                    <div className="pt-2 flex justify-end gap-2 border-t">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingAddress(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={isSavingAddress} className="gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        <span>{isSavingAddress ? "Saving..." : "Save & Select This Address"}</span>
                      </Button>
                    </div>
                  </form>
                )}

                {/* List of Existing Addresses */}
                {addresses.length === 0 && !isAddingAddress ? (
                  <div className="text-center py-8 border rounded-xl bg-muted/20 space-y-3">
                    <p className="text-sm text-muted-foreground">No saved delivery address found.</p>
                    <Button size="sm" onClick={() => setIsAddingAddress(true)} className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      <span>Add New Delivery Address</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Choose an address below (Address and phone number are verified):
                    </div>

                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="addressSelection"
                                value={addr.id}
                                checked={isSelected}
                                onChange={() => setSelectedAddressId(addr.id)}
                                className="mt-1 accent-primary h-4 w-4"
                              />
                              <div className="space-y-1.5 text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-sm text-foreground">
                                    {addr.recipient_name}
                                  </span>
                                  {addr.is_default && (
                                    <Badge variant="outline" className="text-[10px] bg-background">
                                      Default
                                    </Badge>
                                  )}
                                  {/* Important Phone Number Display */}
                                  <span className="flex items-center gap-1 font-bold text-xs bg-muted/80 text-foreground px-2 py-0.5 rounded font-mono border">
                                    <Phone className="h-3 w-3 text-primary" />
                                    {addr.phone_number}
                                  </span>
                                </div>
                                <p className="text-muted-foreground">
                                  {addr.house_flat_no}, {addr.street_locality}
                                  {addr.landmark ? `, Near ${addr.landmark}` : ""}
                                </p>
                                <p className="font-semibold text-foreground">
                                  {addr.city}, {addr.state} - {addr.pin_code}
                                </p>
                              </div>
                            </div>

                            {isSelected ? (
                              <Badge className="bg-primary text-primary-foreground text-xs gap-1">
                                <Check className="h-3 w-3" />
                                <span>Selected</span>
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 px-2 text-muted-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAddressId(addr.id);
                                }}
                              >
                                Select
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Next Step Button (Address -> Payment) */}
                <div className="pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/cart")}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Return to Cart</span>
                  </Button>

                  <Button
                    size="lg"
                    disabled={!selectedAddressId}
                    onClick={() => {
                      if (!selectedAddressId) {
                        setErrorMessage("Please select or add a delivery address to proceed.");
                        return;
                      }
                      setErrorMessage(null);
                      setCurrentStep("payment");
                    }}
                    className="w-full sm:w-auto gap-2 shadow-md bg-primary text-primary-foreground font-bold px-6"
                  >
                    <span>Next: Proceed to Payment</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* =============================================================== */}
          {/* STEP 2: PAYMENT METHOD (CASH ON DELIVERY & E-BANKING DEMO)      */}
          {/* =============================================================== */}
          {currentStep === "payment" && (
            <Card className="border-border/80 shadow-sm space-y-4">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Select Payment Method</CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Choose Cash on Delivery or digital E-Banking demo payment
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-primary"
                  onClick={() => setCurrentStep("address")}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Change Address</span>
                </Button>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                {/* Selected Address Summary Banner */}
                {selectedAddr && (
                  <div className="p-3.5 rounded-xl bg-muted/40 border flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-bold text-foreground">
                          Delivering To: {selectedAddr.recipient_name}
                        </span>
                        <span className="font-mono text-primary font-bold">
                          📞 {selectedAddr.phone_number}
                        </span>
                      </div>
                      <p className="text-muted-foreground pl-6">
                        {selectedAddr.house_flat_no}, {selectedAddr.street_locality}, {selectedAddr.city} - {selectedAddr.pin_code}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2.5"
                      onClick={() => setCurrentStep("address")}
                    >
                      Change
                    </Button>
                  </div>
                )}

                {/* The 2 Payment Choices: Cash on Delivery & E-Banking */}
                <div className="space-y-3">
                  {/* OPTION 1: CASH ON DELIVERY (COD) */}
                  <div
                    onClick={() => setPaymentChoice("cod")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentChoice === "cod"
                        ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="paymentChoice"
                          value="cod"
                          checked={paymentChoice === "cod"}
                          onChange={() => setPaymentChoice("cod")}
                          className="mt-1 accent-primary h-4 w-4"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              Cash on Delivery (COD)
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-background">
                              Pay at Doorstep
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Pay with cash or UPI directly to the courier partner upon physical delivery.
                          </p>
                        </div>
                      </div>
                      <Banknote className="h-5 w-5 text-emerald-600 shrink-0" />
                    </div>
                  </div>

                  {/* OPTION 2: E-BANKING (DEMO SIMULATION) */}
                  <div
                    onClick={() => setPaymentChoice("ebanking")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentChoice === "ebanking"
                        ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="paymentChoice"
                          value="ebanking"
                          checked={paymentChoice === "ebanking"}
                          onChange={() => setPaymentChoice("ebanking")}
                          className="mt-1 accent-primary h-4 w-4"
                        />
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              E-Banking (Demo Simulation)
                            </span>
                            <Badge className="bg-emerald-600 text-white text-[10px]">
                              Instant Authorization
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Choose between Net Banking, UPI, Credit Card, or Debit Card demo gateways.
                          </p>

                          {/* 4 E-Banking Sub-options */}
                          {paymentChoice === "ebanking" && (
                            <div className="pt-3 space-y-3">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase block">
                                Select E-Banking Method:
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {/* Net Banking */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEbankingSubMethod("net_banking");
                                  }}
                                  className={`p-2.5 rounded-lg border text-xs flex flex-col items-center gap-1.5 text-center font-medium transition-all ${
                                    ebankingSubMethod === "net_banking"
                                      ? "border-primary bg-background shadow-xs font-bold text-primary ring-1 ring-primary"
                                      : "border-border bg-muted/30 hover:bg-muted/60"
                                  }`}
                                >
                                  <Building className="h-4 w-4" />
                                  <span>Net Banking</span>
                                </button>

                                {/* UPI */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEbankingSubMethod("upi");
                                  }}
                                  className={`p-2.5 rounded-lg border text-xs flex flex-col items-center gap-1.5 text-center font-medium transition-all ${
                                    ebankingSubMethod === "upi"
                                      ? "border-primary bg-background shadow-xs font-bold text-primary ring-1 ring-primary"
                                      : "border-border bg-muted/30 hover:bg-muted/60"
                                  }`}
                                >
                                  <QrCode className="h-4 w-4" />
                                  <span>UPI</span>
                                </button>

                                {/* Credit Card */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEbankingSubMethod("credit_card");
                                  }}
                                  className={`p-2.5 rounded-lg border text-xs flex flex-col items-center gap-1.5 text-center font-medium transition-all ${
                                    ebankingSubMethod === "credit_card"
                                      ? "border-primary bg-background shadow-xs font-bold text-primary ring-1 ring-primary"
                                      : "border-border bg-muted/30 hover:bg-muted/60"
                                  }`}
                                >
                                  <CreditCard className="h-4 w-4" />
                                  <span>Credit Card</span>
                                </button>

                                {/* Debit Card */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEbankingSubMethod("debit_card");
                                  }}
                                  className={`p-2.5 rounded-lg border text-xs flex flex-col items-center gap-1.5 text-center font-medium transition-all ${
                                    ebankingSubMethod === "debit_card"
                                      ? "border-primary bg-background shadow-xs font-bold text-primary ring-1 ring-primary"
                                      : "border-border bg-muted/30 hover:bg-muted/60"
                                  }`}
                                >
                                  <CreditCard className="h-4 w-4" />
                                  <span>Debit Card</span>
                                </button>
                              </div>

                              {/* Net Banking Bank Selector */}
                              {ebankingSubMethod === "net_banking" && (
                                <div className="p-3 rounded-lg bg-background border space-y-1.5 text-xs">
                                  <label className="font-semibold text-foreground">Select Bank (Demo):</label>
                                  <select
                                    value={selectedBank}
                                    onChange={(e) => setSelectedBank(e.target.value)}
                                    className="w-full p-2 border rounded text-xs bg-card"
                                  >
                                    <option value="HDFC Bank">HDFC Bank</option>
                                    <option value="State Bank of India">State Bank of India (SBI)</option>
                                    <option value="ICICI Bank">ICICI Bank</option>
                                    <option value="Axis Bank">Axis Bank</option>
                                    <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Step 2 Action Buttons */}
                <div className="pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep("address")}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Address</span>
                  </Button>

                  {paymentChoice === "ebanking" ? (
                    <Button
                      size="lg"
                      className="w-full sm:w-auto gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
                      onClick={() => setIsGatewayModalOpen(true)}
                      disabled={isProcessing}
                    >
                      <Lock className="h-4 w-4" />
                      <span>Approve & Pay ₹{grandTotal.toLocaleString("en-IN")} (E-Banking)</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full sm:w-auto gap-2 shadow-md bg-primary text-primary-foreground font-bold px-6"
                      onClick={() => executePlaceOrder("cod", "pending")}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        "Placing COD Order..."
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Approve & Place Order (Cash on Delivery)</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar: Order Summary & Review */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="shadow-md border-border/80 sticky top-20">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span>Order Summary</span>
                </CardTitle>
                <span className="text-xs text-muted-foreground">{cart.length} items</span>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-sm">
              {/* Promo Coupon Form */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Coupon (e.g. WELCOME100)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="text-xs uppercase"
                  />
                  <Button size="sm" variant="outline" onClick={handleApplyCoupon}>
                    Apply
                  </Button>
                </div>
                {couponError && <p className="text-[11px] text-destructive">{couponError}</p>}
                {couponApplied && (
                  <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                    <Tag className="h-3 w-3" />
                    <span>Coupon &apos;{couponApplied}&apos; applied (-₹{discountAmount})</span>
                  </div>
                )}
              </div>

              {/* Price Calculations */}
              <div className="space-y-2 pt-2 border-t text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items Subtotal:</span>
                  <span className="font-medium text-foreground">₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping Delivery:</span>
                  <span className="font-semibold text-emerald-600">
                    {shippingFee === 0 ? "FREE" : `₹${shippingFee}`}
                  </span>
                </div>

                <div className="border-t pt-3 flex justify-between items-baseline text-sm">
                  <span className="font-bold text-foreground">Total Payable:</span>
                  <span className="text-2xl font-black text-primary">
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Contextual Action Button based on Current Step */}
              {currentStep === "address" ? (
                <Button
                  size="lg"
                  disabled={!selectedAddressId}
                  onClick={() => {
                    if (!selectedAddressId) {
                      setErrorMessage("Please select or add a delivery address to proceed.");
                      return;
                    }
                    setErrorMessage(null);
                    setCurrentStep("payment");
                  }}
                  className="w-full gap-2 shadow-md bg-primary text-primary-foreground font-bold"
                >
                  <span>Next: Proceed to Payment</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  disabled={isProcessing}
                  onClick={() => {
                    if (paymentChoice === "ebanking") {
                      setIsGatewayModalOpen(true);
                    } else {
                      executePlaceOrder("cod", "pending");
                    }
                  }}
                  className={`w-full gap-2 shadow-md font-bold ${
                    paymentChoice === "ebanking"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {isProcessing ? (
                    "Processing..."
                  ) : paymentChoice === "ebanking" ? (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Approve & Pay (E-Banking)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approve & Place Order (COD)</span>
                    </>
                  )}
                </Button>
              )}

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-1 border-t">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>PCI-DSS 256-bit Encrypted Checkout</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* =================================================================== */}
      {/* E-BANKING DEMO PAYMENT GATEWAY MODAL                                */}
      {/* =================================================================== */}
      {isGatewayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md shadow-2xl border-primary/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-primary text-primary-foreground p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-300">
                    E-Banking Demo Gateway
                  </span>
                </div>
                <h3 className="text-lg font-bold mt-1">ModernShop Pay</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-primary-foreground/70 block">Total Payable</span>
                <span className="text-xl font-extrabold text-white">
                  ₹{grandTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              {/* Method-Specific Demo Display */}
              {ebankingSubMethod === "net_banking" && (
                <div className="space-y-3 text-center">
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                    <Building className="h-8 w-8 text-primary mx-auto" />
                    <p className="text-sm font-bold text-foreground">{selectedBank}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Net Banking Gateway Redirect Simulator
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click Approve below to simulate logging into your {selectedBank} Net Banking portal and authorizing payment.
                  </p>
                </div>
              )}

              {ebankingSubMethod === "upi" && (
                <div className="space-y-4 text-center">
                  <div className="p-4 rounded-xl border bg-muted/20 flex flex-col items-center justify-center space-y-2">
                    <QrCode className="h-24 w-24 text-foreground" />
                    <span className="text-[11px] font-mono text-muted-foreground">
                      UPI VPA: modernshop.pay@hdfcbank
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Simulate scanning with Google Pay, PhonePe, Paytm, or BHIM.
                  </p>
                </div>
              )}

              {(ebankingSubMethod === "credit_card" || ebankingSubMethod === "debit_card") && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white shadow-md space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono tracking-widest text-slate-300">
                        {ebankingSubMethod === "credit_card" ? "DEMO CREDIT CARD" : "DEMO DEBIT CARD"}
                      </span>
                      <CreditCard className="h-5 w-5 text-slate-300" />
                    </div>
                    <div className="font-mono text-base tracking-widest text-center py-1">
                      {ebankingSubMethod === "credit_card" ? "4532 •••• •••• 8892" : "5241 •••• •••• 1024"}
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-300">
                      <span>EXP: 12/29</span>
                      <span>CVV: 789</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Simulating 3D-Secure 2.0 biometric and OTP verification.
                  </p>
                </div>
              )}

              {/* Approve Payment Button */}
              <div className="space-y-2 pt-2">
                <Button
                  size="lg"
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  disabled={isGatewaySimulating}
                  onClick={handleApproveEbankingPayment}
                >
                  {isGatewaySimulating ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                      <span>Authorizing with Bank Gateway...</span>
                    </div>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      <span>Approve & Authorize Payment (₹{grandTotal.toLocaleString("en-IN")})</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  disabled={isGatewaySimulating}
                  onClick={() => setIsGatewayModalOpen(false)}
                >
                  Cancel & Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
