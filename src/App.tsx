import { AuthProvider } from "@/context/AuthContext";
import { NavigationProvider, useNavigation } from "@/context/NavigationContext";
import { CartProvider } from "@/context/CartContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { CartPage } from "@/pages/CartPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { CustomerOrdersPage } from "@/pages/CustomerOrdersPage";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import { VendorDashboardPage } from "@/pages/VendorDashboardPage";
import { VendorProductsPage } from "@/pages/VendorProductsPage";
import { VendorOrdersPage } from "@/pages/VendorOrdersPage";
import { CustomerAccountPage } from "@/pages/CustomerAccountPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";

function AppRoutes() {
  const { currentPath, navigate } = useNavigation();

  const renderContent = () => {
    // Dynamic Product Detail: /products/:id
    if (currentPath.startsWith("/products/")) {
      const prodId = currentPath.replace("/products/", "");
      if (prodId) {
        return <ProductDetailPage productId={prodId} />;
      }
    }

    // Dynamic Customer Order Detail: /account/orders/:id
    if (currentPath.startsWith("/account/orders/")) {
      const ordId = currentPath.replace("/account/orders/", "");
      if (ordId) {
        return (
          <ProtectedRoute>
            <OrderDetailPage orderId={ordId} />
          </ProtectedRoute>
        );
      }
    }

    switch (currentPath) {
      case "/":
        return <HomePage />;
      case "/login":
        return <LoginPage />;
      case "/register":
        return <RegisterPage />;
      case "/products":
        return <CatalogPage />;
      case "/cart":
        return <CartPage />;
      case "/checkout":
        return (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        );
      case "/account/orders":
        return (
          <ProtectedRoute>
            <CustomerOrdersPage />
          </ProtectedRoute>
        );
      case "/admin":
        return (
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        );
      case "/vendor":
        return (
          <ProtectedRoute allowedRoles={["salesman"]}>
            <VendorDashboardPage />
          </ProtectedRoute>
        );
      case "/vendor/products":
        return (
          <ProtectedRoute allowedRoles={["salesman"]}>
            <VendorProductsPage />
          </ProtectedRoute>
        );
      case "/vendor/orders":
        return (
          <ProtectedRoute allowedRoles={["salesman"]}>
            <VendorOrdersPage />
          </ProtectedRoute>
        );
      case "/account":
        return (
          <ProtectedRoute>
            <CustomerAccountPage />
          </ProtectedRoute>
        );
      default:
        return (
          <div className="container mx-auto px-4 py-24 text-center space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight">404 - Page Not Found</h1>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              The page you are looking for does not exist or has been moved.
            </p>
            <Button onClick={() => navigate("/")}>Return to Storefront</Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      <Header />
      <main className="flex-1">{renderContent()}</main>
      <Footer />
    </div>
  );
}

import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <NavigationProvider>
        <AuthProvider>
          <NotificationProvider>
            <CartProvider>
              <AppRoutes />
            </CartProvider>
          </NotificationProvider>
        </AuthProvider>
      </NavigationProvider>
    </ErrorBoundary>
  );
}
