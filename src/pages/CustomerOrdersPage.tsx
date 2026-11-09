import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ChevronRight, ArrowLeft, Clock } from "lucide-react";
import type { Order } from "@/types";

export function CustomerOrdersPage() {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/login");
      return;
    }

    const currentUserId = user.id;

    async function loadOrders() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            sub_orders (*),
            order_items (*)
          `)
          .eq("customer_id", currentUserId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setOrders(data as Order[]);
        }
      } catch (err) {
        console.error("Error loading orders:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
  }, [isAuthenticated, user, navigate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Delivered</Badge>;
      case "shipped":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Shipped</Badge>;
      case "processing":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Processing</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="capitalize">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/account")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">My Purchase Orders</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track past deliveries, inspect invoices, and monitor fulfillment milestones.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/60 animate-pulse border" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="text-center py-16 border-dashed">
          <CardHeader className="space-y-2">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
            <CardTitle className="text-lg">No Orders Placed Yet</CardTitle>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You haven&apos;t placed any orders on the marketplace. Explore our catalog to buy your first product.
            </p>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/products")}>Browse Products</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
              onClick={() => navigate(`/account/orders/${order.id}`)}
            >
              <CardContent className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-foreground">{order.order_number}</span>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : "Recent"}
                    </span>
                    <span>•</span>
                    <span>Payment: <strong className="uppercase text-foreground">{order.payment_method}</strong> ({order.payment_status})</span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {order.order_items?.length || 0} items fulfilled by {order.sub_orders?.length || 1} independent vendor(s)
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <div className="text-xs text-muted-foreground">Total Amount</div>
                    <div className="text-lg font-black text-primary">
                      ₹{Number(order.total_amount).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
