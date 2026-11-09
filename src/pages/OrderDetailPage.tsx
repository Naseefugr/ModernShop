import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigation } from "@/context/NavigationContext";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Store,
  ArrowLeft,
  Printer,
  FileText,
} from "lucide-react";
import { DeliveryRouteTruckTracker } from "@/components/orders/DeliveryRouteTruckTracker";
import type { Order } from "@/types";

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const { navigate } = useNavigation();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvoice, setShowInvoice] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            sub_orders (
              *,
              salesman_profiles (*),
              order_status_history (*)
            ),
            order_items (*)
          `)
          .eq("id", orderId)
          .single();

        if (error) throw error;
        if (data) setOrder(data as Order);
      } catch (err) {
        console.error("Error loading order detail:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (orderId) {
      loadOrder();

      const channel = supabase
        .channel(`order-detail-${orderId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sub_orders", filter: `master_order_id=eq.${orderId}` },
          () => {
            loadOrder();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you wish to cancel this order?")) return;
    setIsCancelling(true);
    try {
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
      await supabase.from("sub_orders").update({ status: "cancelled" }).eq("master_order_id", orderId);

      setOrder((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
      alert("Order cancelled successfully.");
    } catch (err) {
      console.error("Cancellation error:", err);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Retrieving order details and tracking timeline...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold">Order Not Found</h2>
        <Button onClick={() => navigate("/account/orders")}>Back to My Orders</Button>
      </div>
    );
  }

  const addr = order.shipping_address_snapshot;

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/account/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight">{order.order_number}</h1>
              <Badge variant={order.status === "cancelled" ? "destructive" : "default"} className="capitalize">
                {order.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Placed on {order.created_at ? new Date(order.created_at).toLocaleString() : "Recently"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowInvoice(!showInvoice)}
          >
            <FileText className="h-4 w-4" />
            <span>{showInvoice ? "Hide Invoice" : "View GST Invoice"}</span>
          </Button>

          {order.status !== "cancelled" && order.status !== "delivered" && (
            <Button
              variant="destructive"
              size="sm"
              disabled={isCancelling}
              onClick={handleCancelOrder}
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* GST Printable Invoice View Modal / Box */}
      {showInvoice && (
        <Card className="border-2 border-primary/40 bg-card p-6 shadow-xl space-y-6 print:border-none print:shadow-none">
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h2 className="text-xl font-bold">TAX INVOICE</h2>
              <p className="text-xs text-muted-foreground font-mono">Invoice Ref: INV-{order.order_number}</p>
              <p className="text-xs text-muted-foreground">Original for Recipient</p>
            </div>
            <div className="text-right text-xs space-y-1">
              <div className="font-bold text-sm text-primary">ModernShop Marketplace</div>
              <p className="text-muted-foreground">GSTIN: 29AAACM1234F1Z8</p>
              <p className="text-muted-foreground">Bengaluru, Karnataka, India</p>
              <Button size="sm" variant="ghost" className="gap-1 print:hidden" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" />
                <span>Print PDF</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-xs">
            <div>
              <h4 className="font-bold uppercase text-muted-foreground mb-1">Billed & Shipped To:</h4>
              <p className="font-bold text-sm">{addr.recipient_name}</p>
              <p>{addr.house_flat_no}, {addr.street_locality}</p>
              <p>{addr.city}, {addr.state} - {addr.pin_code}</p>
              <p>Phone: {addr.phone_number}</p>
            </div>
            <div className="text-right">
              <h4 className="font-bold uppercase text-muted-foreground mb-1">Payment & Order Details:</h4>
              <p>Date: {new Date(order.created_at || "").toLocaleDateString()}</p>
              <p className="capitalize">Method: {order.payment_method} ({order.payment_status})</p>
              <p className="font-bold text-foreground">Status: {order.status}</p>
            </div>
          </div>

          {/* Invoice Table */}
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted font-bold">
                <tr>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Unit Price</th>
                  <th className="p-2.5 text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.order_items?.map((item) => (
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
                  <td className="p-2.5 text-right">₹{Number(order.subtotal_amount).toLocaleString("en-IN")}</td>
                </tr>
                {order.discount_amount > 0 && (
                  <tr className="text-emerald-600">
                    <td colSpan={3} className="p-2.5 text-right">Coupon Discount:</td>
                    <td className="p-2.5 text-right">-₹{Number(order.discount_amount).toLocaleString("en-IN")}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} className="p-2.5 text-right">Shipping:</td>
                  <td className="p-2.5 text-right">{order.shipping_fee === 0 ? "FREE" : `₹${order.shipping_fee}`}</td>
                </tr>
                <tr className="text-sm font-extrabold text-foreground border-t">
                  <td colSpan={3} className="p-2.5 text-right">Grand Total:</td>
                  <td className="p-2.5 text-right text-primary">₹{Number(order.total_amount).toLocaleString("en-IN")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Sub-Orders Fulfillment Sections with Visual Timeline Tracking */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold tracking-tight">Fulfillment Breakdown by Seller</h2>

        {order.sub_orders?.map((subOrder) => {
          const subItems = order.order_items?.filter((it) => it.sub_order_id === subOrder.id);

          return (
            <Card key={subOrder.id} className="overflow-hidden border">
              <CardHeader className="py-3 px-5 bg-muted/40 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Store className="h-4 w-4 text-primary" />
                  <span className="font-bold text-foreground">
                    {subOrder.salesman_profiles?.store_name || "Vendor Hub"}
                  </span>
                  <span className="text-muted-foreground font-mono">({subOrder.sub_order_number})</span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-xs font-semibold">
                    {subOrder.status.replace(/_/g, " ")}
                  </Badge>
                  {subOrder.tracking_number && (
                    <span className="text-xs text-muted-foreground font-mono">
                      Tracking: {subOrder.courier_partner} ({subOrder.tracking_number})
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Visual Route Driving Delivery Truck Tracker */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Live Route & Delivery Truck Telemetry
                  </div>
                  <DeliveryRouteTruckTracker
                    status={subOrder.status}
                    courierPartner={subOrder.courier_partner}
                    trackingNumber={subOrder.tracking_number}
                  />
                </div>

                {/* Items in this sub-order */}
                <div className="border rounded-lg divide-y">
                  {subItems?.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <div className="font-semibold text-sm text-foreground">{item.product_title}</div>
                          {item.variant_name && <div className="text-muted-foreground">{item.variant_name}</div>}
                          <div className="text-muted-foreground">Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString("en-IN")}</div>
                        </div>
                      </div>
                      <div className="font-bold text-sm">
                        ₹{Number(item.total_price).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
