import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useNotifications } from "@/context/NotificationContext";
import { useNavigation, Link } from "@/context/NavigationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  ShoppingCart,
  User as UserIcon,
  LogOut,
  Shield,
  Briefcase,
  Menu,
  X,
  Search,
  Bell,
  Check,
  Truck,
} from "lucide-react";
import type { UserRole } from "@/types";

export function Header() {
  const { profile, role, isAuthenticated, signOut } = useAuth();
  const { itemCount } = useCart();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { navigate, currentPath } = useNavigation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const getRoleBadgeVariant = (userRole?: UserRole | string | null) => {
    switch (userRole) {
      case "admin":
        return "destructive";
      case "salesman":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-xs">
      {/* Top Professional Announcement & Trust Ribbon */}
      <div className="bg-slate-900 text-slate-200 text-[11px] py-1.5 px-4 sm:px-8 border-b border-slate-800">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-1">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-emerald-400">⚡ FREE Express Delivery on orders over ₹999</span>
            <span className="hidden md:inline text-slate-500">•</span>
            <span className="hidden md:inline text-slate-300">🛡️ 100% Verified Marketplace Guarantee</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-[10px]">
            <span>🚚 Real-Time Highway Tracking</span>
            <span>•</span>
            <span>India 🇮🇳 (INR ₹)</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
              <Store className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">ModernShop</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <Link
              to="/"
              className={`transition-colors hover:text-primary ${
                currentPath === "/" ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              Home
            </Link>
            <Link
              to="/products"
              className={`transition-colors hover:text-primary ${
                currentPath === "/products" ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              Browse Catalog
            </Link>
          </nav>
        </div>

        {/* Global Search Bar (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-sm mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search products, brands, categories..."
              className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-muted/40 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate("/products");
                }
              }}
            />
          </div>
        </div>

        {/* Right Section / Auth Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cart Icon with Live Item Count */}
          <Button
            variant="outline"
            size="default"
            className="relative gap-2"
            onClick={() => navigate("/cart")}
            title="Shopping Cart"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline text-xs font-semibold">Cart</span>
            {itemCount > 0 && (
              <Badge variant="default" className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full text-[11px] font-bold">
                {itemCount}
              </Badge>
            )}
          </Button>

          {/* In-App Notifications Bell */}
          {isAuthenticated && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                )}
              </Button>

              {/* Notification Flyout Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border bg-card shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">Notifications</span>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                          {unreadCount} new
                        </Badge>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y text-xs">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-muted-foreground">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 space-y-1 transition-colors ${
                            !n.is_read ? "bg-primary/5 font-semibold" : "text-muted-foreground"
                          }`}
                          onClick={() => {
                            markAsRead(n.id);
                            if (n.action_url) {
                              navigate(n.action_url);
                              setNotificationsOpen(false);
                            }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-foreground">{n.title}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(n.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Authenticated Workspace Links */}
          {isAuthenticated && (
            <>
              {role === "admin" && (
                <Button
                  variant="default"
                  size="sm"
                  className="hidden sm:inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => navigate("/admin")}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Admin</span>
                </Button>
              )}

              {role === "salesman" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => navigate("/vendor")}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Vendor Hub</span>
                </Button>
              )}

              {/* Profile dropdown trigger or account button */}
              <div className="flex items-center gap-2 pl-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex items-center gap-2"
                  onClick={() => navigate("/account")}
                >
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {profile?.full_name?.split(" ")[0] || "Account"}
                  </span>
                  <Badge variant={getRoleBadgeVariant(role)} className="capitalize text-[10px] px-1.5 py-0 h-4">
                    {role || "Customer"}
                  </Badge>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  title="Sign Out"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* Guest Links */}
          {!isAuthenticated && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                Sign In
              </Button>
              <Button size="sm" onClick={() => navigate("/register")}>
                Sign Up
              </Button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Category Quick Navigation Bar (Desktop) */}
      <div className="border-t bg-muted/25 px-4 sm:px-8 hidden md:block">
        <div className="container mx-auto flex items-center gap-6 py-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => navigate("/products")}
            className="text-foreground hover:text-primary transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Menu className="h-3.5 w-3.5" />
            <span>All Categories</span>
          </button>
          <button
            onClick={() => navigate("/products")}
            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            Electronics & Gadgets
          </button>
          <button
            onClick={() => navigate("/products")}
            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            Fashion & Apparel
          </button>
          <button
            onClick={() => navigate("/products")}
            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            Home & Kitchen
          </button>
          <button
            onClick={() => navigate("/products")}
            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            Health & Grooming
          </button>
          <button
            onClick={() => navigate("/account")}
            className="text-muted-foreground hover:text-primary transition-colors shrink-0 ml-auto flex items-center gap-1.5 font-bold"
          >
            <Truck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Track Order & Live Telemetry</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-2 text-sm font-medium">
            <Link
              to="/"
              className="px-2 py-1.5 rounded-md hover:bg-muted"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/products"
              className="px-2 py-1.5 rounded-md hover:bg-muted"
              onClick={() => setMobileMenuOpen(false)}
            >
              All Products
            </Link>
            <Link
              to="/cart"
              className="px-2 py-1.5 rounded-md hover:bg-muted flex items-center justify-between"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Shopping Cart</span>
              {itemCount > 0 && <Badge variant="default">{itemCount}</Badge>}
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  to="/account"
                  className="px-2 py-1.5 rounded-md hover:bg-muted flex items-center justify-between"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>My Account</span>
                  <Badge variant={getRoleBadgeVariant(role)} className="capitalize text-xs">
                    {role}
                  </Badge>
                </Link>
                <Link
                  to="/account/orders"
                  className="px-2 py-1.5 rounded-md hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Purchase Orders
                </Link>
                {role === "admin" && (
                  <Link
                    to="/admin"
                    className="px-2 py-1.5 rounded-md bg-destructive/10 text-destructive font-semibold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Control Center
                  </Link>
                )}
                {role === "salesman" && (
                  <>
                    <Link
                      to="/vendor"
                      className="px-2 py-1.5 rounded-md bg-primary/10 text-primary font-semibold"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Vendor Workspace
                    </Link>
                    <Link
                      to="/vendor/products"
                      className="px-2 py-1.5 rounded-md hover:bg-muted"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Products
                    </Link>
                    <Link
                      to="/vendor/orders"
                      className="px-2 py-1.5 rounded-md hover:bg-muted"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Fulfillment Orders
                    </Link>
                  </>
                )}
                <button
                  className="px-2 py-1.5 text-left rounded-md text-destructive hover:bg-destructive/10 flex items-center gap-2"
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    navigate("/login");
                    setMobileMenuOpen(false);
                  }}
                >
                  Sign In
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigate("/register");
                    setMobileMenuOpen(false);
                  }}
                >
                  Register Account
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
