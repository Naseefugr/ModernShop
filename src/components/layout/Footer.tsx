import { Store, ShieldCheck, Truck, Headphones } from "lucide-react";
import { Link } from "@/context/NavigationContext";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      {/* Feature Highlights Bar */}
      <div className="border-b bg-card py-6">
        <div className="container mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Fast Nationwide Dispatch</h4>
              <p className="text-xs text-muted-foreground">Standard 3-5 day delivery across India</p>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">100% Secure Payments</h4>
              <p className="text-xs text-muted-foreground">Encrypted UPI, Cards, NetBanking & COD</p>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Dedicated Buyer Support</h4>
              <p className="text-xs text-muted-foreground">Support via email & ticket resolution</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="container mx-auto px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Store className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight">ModernShop</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              India&apos;s advanced multi-vendor marketplace connecting verified independent merchants with shoppers nationwide.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Marketplace</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">Home Storefront</Link></li>
              <li><Link to="/products" className="hover:text-primary transition-colors">All Products</Link></li>
              <li><Link to="/register" className="hover:text-primary transition-colors">Become a Seller</Link></li>
            </ul>
          </div>

          {/* Account & Policies */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Customer Care</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/account" className="hover:text-primary transition-colors">My Profile & Orders</Link></li>
              <li><Link to="/login" className="hover:text-primary transition-colors">Sign In</Link></li>
              <li><span className="cursor-pointer hover:text-primary">Returns & Refund Policy</span></li>
            </ul>
          </div>

          {/* System & Architecture Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Phase 1 Architecture</h4>
            <p className="text-xs text-muted-foreground">
              Powered by Vite, React 18, Supabase PostgreSQL with Row-Level Security, and Tailwind CSS.
            </p>
            <div className="text-[11px] text-muted-foreground pt-1">
              Role-Based Access: Admin | Salesman | Customer
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ModernShop Multi-Vendor Marketplace. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="cursor-pointer hover:text-primary">Privacy Policy</span>
            <span className="cursor-pointer hover:text-primary">Terms of Service</span>
            <span className="cursor-pointer hover:text-primary">Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
