# E-COMMERCE MULTI-VENDOR MARKETPLACE
## Phase-by-Phase Development & Execution Framework

---

### Document Control
- **Document Version:** 1.0.0
- **Structure:** 7 Phased Execution Roadmap
- **Lifecycle:** Total 12 Weeks (Agile Sprints)

---

## Phase Breakdown Matrix

| Phase | Title | Primary Focus | Key Deliverables | Duration |
| :---: | :--- | :--- | :--- | :---: |
| **Phase 1** | **Foundation & Core Architecture** | Auth, RBAC, Database Init, Layouts | Database Migrations, Auth System, Route Guards | Weeks 1–2 |
| **Phase 2** | **Marketplace & Discovery** | Public Catalog, Search, Categories | Hero Banner, Product Cards, Faceted Filters | Weeks 3–4 |
| **Phase 3** | **Salesman / Vendor Portal** | Storefront, Product CRUD, Stock | Vendor Dashboard, Product Form, Sub-Orders | Weeks 5–6 |
| **Phase 4** | **Customer Experience & Checkout** | Cart, Multi-Vendor Checkout, Orders | Cart Engine, Razorpay Integration, Tracking Timeline | Weeks 7–8 |
| **Phase 5** | **Admin Command Center** | Platform Governance, Moderation | Admin Analytics, User/Vendor Approvals, Settings | Week 9 |
| **Phase 6** | **Integrations & Advanced Features** | Notifications, Invoices, Reviews | Real-time Bell Notifications, PDF Invoices, Reviews | Week 10 |
| **Phase 7** | **Hardening, Testing & Deployment** | Security Audit, Concurrency, Launch | RLS Penetration Testing, E2E Verification, Vercel Deploy | Weeks 11–12 |

---

## Detailed Phase Execution Plans

### Phase 1: Foundation & Core Architecture (Weeks 1–2)

#### Objectives
Establish the baseline infrastructure, database schema, user authentication lifecycles, and role-based route protection.

#### Tasks & Work Breakdown
1. **Repository & Framework Configuration:**
   - Configure Next.js / Vite with React 18, TypeScript, Tailwind CSS, and shadcn/ui.
   - Configure path aliases (`@/components`, `@/lib`, `@/types`, `@/hooks`).
2. **Supabase Database Provisioning:**
   - Apply base migrations: `profiles`, `salesman_profiles`, `customer_profiles`, and platform configuration tables.
   - Configure PostgreSQL extensions (`uuid-ossp`, `pgcrypto`).
   - Create automatic triggers synchronizing `auth.users` with `public.profiles`.
3. **Authentication & Session Lifecycle:**
   - Implement Customer Registration (Full Name, Email, Mobile, Password).
   - Implement Salesman Registration (Business Name, Store Slug, GSTIN, Contact).
   - Implement Secure Login, Logout, and Session Refresh handlers.
   - Configure password reset with email verification tokens.
4. **Role-Based Routing Middleware:**
   - Implement Next.js / React Router route guards:
     - `/admin/*` $\rightarrow$ Restricted strictly to `role === 'admin'`.
     - `/vendor/*` $\rightarrow$ Restricted strictly to approved `role === 'salesman'`.
     - `/account/*` $\rightarrow$ Restricted to authenticated users (`customer` or `salesman`).
     - Public routes (`/`, `/products`, `/categories`) accessible to guests (`anon`).
5. **Base Design System & Shared Layouts:**
   - Configure shadcn/ui base theme, dark/light CSS variables, and typography.
   - Construct responsive public Header, Footer, and Dashboard Sidebar layouts.

#### Acceptance Criteria
- [x] Users can register as Customer or Salesman.
- [x] Supabase Auth issues JWT containing user role claim.
- [x] Unauthorized access to `/admin` or `/vendor` redirects to appropriate unauthorized or login views.
- [x] Base database schema deploys with zero migration errors.

---

### Phase 2: Marketplace & Product Discovery (Weeks 3–4)

#### Objectives
Deliver a fast, responsive public shopping experience allowing shoppers to explore products without forced authentication.

#### Tasks & Work Breakdown
1. **Dynamic Customer Homepage:**
   - **Hero Banner Carousel:** Configurable banner slides with promotional text, background image, and CTA links.
   - **Shop by Category Grid:** Visual category cards linking to filtered catalog views.
   - **Trending Products Section:** High-engagement products dynamically calculated by recent purchase frequency.
   - **Featured Products Section:** Curated products selected by Admin.
   - **Latest Arrivals Grid:** Chronologically recent product uploads.
2. **Global Product Catalogue (`/products`):**
   - Responsive multi-column grid featuring high-performance product cards.
   - Display: Product thumbnail, title, category badge, vendor name, current price, strikethrough original price, discount percentage tag, and stock status.
3. **Search & Multi-Faceted Filter Sidebar:**
   - Text search input with debounced keyword matching against product title, brand, and description.
   - Multi-select Category and Subcategory tree.
   - Price range dual-slider (minimum and maximum bounds).
   - Brand filter checklist and "In Stock Only" toggle.
   - Sort dropdown: *Price: Low to High*, *Price: High to Low*, *Newest*, *Rating*, *Popularity*.
4. **Product Details Page (`/products/[id]`):**
   - High-resolution multi-image gallery with thumbnail switcher and interactive zoom.
   - Product title, brand badge, verified seller store badge.
   - Dynamic variant picker (e.g., Size, Color) adjusting price and stock indicators.
   - Stock indicator: `In Stock`, `Only X units remaining`, or `Out of Stock`.
   - Technical specifications key-value table and bulleted feature highlights.
   - Primary action buttons: `Add to Cart` and `Buy Now`.

#### Acceptance Criteria
- [x] Public users can browse all active products without logging in.
- [x] Search queries return instant, accurate matching records.
- [x] Filtering by price, category, and availability updates the product grid reactively.
- [x] Product detail pages display all images, variants, specs, and vendor store information.

---

### Phase 3: Salesman / Vendor Workspace (Weeks 5–6)

#### Objectives
Provide salesmen with an autonomous, isolated management dashboard for products, stock, incoming orders, and performance analytics.

#### Tasks & Work Breakdown
1. **Vendor Onboarding & Approval Queue:**
   - Salesman registration wizard capturing business credentials and bank information.
   - Restrict new salesmen to a "Pending Admin Approval" state until verified.
2. **Salesman Dashboard Overview (`/vendor`):**
   - Metric cards: Total Products, Active vs. Paused Products, Total Orders, Pending Dispatch, Completed Orders, Gross Revenue.
   - Revenue trend charts (Daily, Weekly, Monthly) via SVG charting library.
3. **Product Management System (`/vendor/products`):**
   - Comprehensive CRUD interface for seller's own products.
   - Multi-step **Add/Edit Product Wizard**:
     - Basic info: Title, Category, Subcategory, Brand, Tags.
     - Pricing: Selling Price, MSRP / Original Price, Discount auto-calc.
     - Media: Multiple image uploader with Supabase Storage integration.
     - Specifications: Dynamic key-value pairs (e.g., Material, Weight, Warranty).
     - Inventory: Available stock count, low-stock alert threshold.
     - Variants: Matrix builder for Size, Color, SKU, and Variant-specific pricing.
   - Status switcher: One-click toggle between `active` and `paused`.
4. **Vendor Order & Sub-Order Fulfillment (`/vendor/orders`):**
   - Filterable table displaying sub-orders assigned to the logged-in salesman.
   - Order detail view: Buyer name, shipping address, ordered SKUs, variant details.
   - Status progression dropdown:
     $$\text{Confirmed} \longrightarrow \text{Processing} \longrightarrow \text{Packed} \longrightarrow \text{Shipped (Tracking Number + Courier)} \longrightarrow \text{Delivered}$$
   - Return / Cancellation approval actions.
5. **Vendor Sales Analytics:**
   - Top-selling products ranking.
   - Repeat customer breakdown and average order value (AOV).
   - CSV export of sales transactions.

#### Acceptance Criteria
- [x] Salesmen cannot view or modify products belonging to other sellers.
- [x] Adding a product handles multiple image uploads to Supabase Storage.
- [x] Salesmen can update fulfillment statuses for their own sub-orders only.
- [x] Dashboard analytics accurately reflect the salesman's order items.

---

### Phase 4: Customer Experience, Cart & Multi-Vendor Checkout (Weeks 7–8)

#### Objectives
Implement an atomic shopping cart, address book, multi-vendor order splitting engine, Indian payment gateway integration, and visual order tracking.

#### Tasks & Work Breakdown
1. **Shopping Cart Engine:**
   - Slide-over drawer and dedicated `/cart` page.
   - Quantity selector (+ / -) with automatic stock boundary limits.
   - Live price computation: Subtotal, Estimated Taxes, Shipping fees, and Net Total.
   - Out-of-stock warning banners if an item in the cart becomes unavailable.
2. **Multi-Address Management:**
   - Customer profile address book supporting multiple addresses.
   - Structured Indian address form: House/Flat, Street, Landmark, City, District, State, and 6-digit PIN code.
   - Default address selector.
3. **Multi-Vendor Checkout Flow (`/checkout`):**
   - Single unified checkout page displaying aggregated items from multiple vendors.
   - Itemized order breakdown showing individual vendor item groupings.
   - Payment method selector: UPI, Credit/Debit Card, NetBanking, and Cash on Delivery (COD).
4. **Razorpay Payment Gateway Integration:**
   - Server Action creating Razorpay Order ID with total amount in paise (INR).
   - Client-side Razorpay Checkout modal triggering UPI, Card, or NetBanking.
   - Server-side cryptographic HMAC SHA-256 signature verification upon payment completion.
   - Webhook endpoint for asynchronous payment capture confirmation.
5. **Atomic Order Splitting Transaction:**
   - PostgreSQL stored procedure creating one `orders` record (Master Order) and multiple `sub_orders` records partitioned by `salesman_id`.
   - Inventory decremented atomically using row-level locking.
   - `order_items` snapshotting immutable price, title, and vendor metadata.
6. **Customer Visual Order Tracking (`/account/orders/[id]`):**
   - Interactive milestone tracker:
     $$\text{Order Placed} \longrightarrow \text{Confirmed} \longrightarrow \text{Processing} \longrightarrow \text{Packed} \longrightarrow \text{Shipped} \longrightarrow \text{Out for Delivery} \longrightarrow \text{Delivered}$$
   - Displays courier name, tracking number, and live status notes.
   - Order cancellation request button (available prior to `Shipped` status).

#### Acceptance Criteria
- [x] Cart preserves state across page reloads and authentications.
- [x] Multi-vendor cart splits into correct vendor sub-orders upon checkout.
- [x] Stock decrements atomically; concurrent checkouts cannot oversell inventory.
- [x] Razorpay payments verify securely via server-side HMAC validation.
- [x] Visual order timeline updates in real-time when the vendor updates status.

---

### Phase 5: Admin Command Center & Governance (Week 9)

#### Objectives
Deliver a centralized marketplace governance portal enabling administrators to oversee users, vendors, catalog moderation, orders, and dynamic site configurations.

#### Tasks & Work Breakdown
1. **Marketplace Command Dashboard (`/admin`):**
   - Aggregate KPI counters: Gross Merchandise Value (GMV), Total Commission Earned, Active Users, Verified Vendors, Total Master Orders.
   - Platform-wide sales comparison charts (Year-over-Year, Month-over-Month).
   - Top-performing vendors and high-demand product categories.
2. **User & Vendor Management Center:**
   - Searchable, filterable list of all registered buyers and salesmen.
   - Vendor verification pipeline: Review business documents, GSTIN, and Approve or Reject accounts.
   - One-click account actions: Activate, Suspend, Ban, or Delete with confirmation modals.
   - Full audit trail of user purchases and vendor sales volume.
3. **Global Product Catalog Governance:**
   - Central moderation queue for vendor-submitted products.
   - Ability to feature products on homepage carousels or trending sections.
   - Ability to force-pause or delete inappropriate or infringing items.
4. **Global Category & Subcategory Builder:**
   - Add, edit, reorder, and toggle categories (e.g., Electronics, Fashion, Home & Living).
   - Assign category banner imagery and icons.
5. **Dynamic Site Settings & CMS Module:**
   - Manage homepage hero banners, promotional announcement bars, and seasonal campaigns.
   - Configure global commission rates per category.
   - Configure shipping rules (free shipping threshold, standard rates).
   - Configure payment settings (COD enablement toggle, maximum COD order limit).

#### Acceptance Criteria
- [x] Admin can approve, reject, or suspend any salesman or customer.
- [x] Admin can moderate products and toggle featured status on the storefront.
- [x] Dynamic category and banner modifications reflect immediately on public pages.
- [x] Financial analytics aggregate all transactions accurately.

---

### Phase 6: Integrations & Advanced Features (Week 10)

#### Objectives
Incorporate real-time notifications, automated PDF invoice generation, verified customer reviews, and promotional coupon engines.

#### Tasks & Work Breakdown
1. **In-App Notification Center:**
   - Notification bell in header with dynamic unread badge count.
   - Event triggers via Supabase Realtime:
     - Admin: New vendor registration, new order placed, dispute raised.
     - Vendor: New sub-order received, low-stock warning, return requested.
     - Customer: Payment confirmed, order shipped, delivered, refund issued.
   - Notification flyout with "Mark as Read" and "Mark All as Read" capabilities.
2. **Automated PDF Invoice Generation:**
   - Server-side PDF generation engine formatted according to Indian GST standards.
   - Displays: Order ID, Invoice Number, Invoice Date, Buyer Details, Seller GSTIN & Address, Itemized Table (SKU, Qty, Unit Price, Tax/GST, Subtotal), Payment Reference.
   - Direct download button on Customer Order Detail page and Vendor Portal.
3. **Verified Purchaser Reviews & Ratings:**
   - 5-star rating component with written feedback and optional photo uploads.
   - Constraint: Review submission is permitted *only* for verified buyers who have received the product (`status === 'delivered'`).
   - Admin moderation view to filter spam or abusive submissions.
4. **Promotional Coupons & Discount Engine:**
   - Admin and vendor coupon code generator (`SAVE20`, `FESTIVE500`).
   - Rules: Percentage discount vs. Flat discount, minimum order value, expiration date, max usage per customer.
   - Checkout validation applying instant deductions to eligible cart items.

#### Acceptance Criteria
- [x] Notification bell updates in real-time without requiring browser refresh.
- [x] PDF invoices render crisp, standardized GST-compliant receipts.
- [x] Only customers with confirmed delivery can submit product reviews.
- [x] Coupon codes validate and deduct correct discounts during checkout.

---

### Phase 7: Hardening, Testing & Deployment (Weeks 11–12)

#### Objectives
Conduct rigorous end-to-end testing, security penetration audits, RLS validation, concurrency simulations, and execute production deployment.

#### Tasks & Work Breakdown
1. **Row-Level Security (RLS) & Security Audit:**
   - Validate that customer accounts cannot query other customers' orders or addresses.
   - Validate that salesmen cannot query or modify other salesmen's products or customer PII.
   - Run Supabase database advisors (`supabase db advisors`) to detect missing indexes or open security paths.
2. **Concurrency & Race Condition Testing:**
   - Run automated load scripts simulating 50 concurrent buyers attempting to checkout 5 remaining units of a single product.
   - Verify that exactly 5 orders succeed, 45 fail gracefully with out-of-stock notices, and zero inventory discrepancy occurs.
3. **Payment Failure & Edge Case Testing:**
   - Simulate user cancellation at the Razorpay modal.
   - Simulate bank network dropouts and verify webhook reconciliation.
   - Test partial returns and multi-vendor cancellation scenarios.
4. **Cross-Device & Accessibility Testing:**
   - Validate responsive layouts across Desktop (1920px, 1440px), Tablet (768px), and Mobile (375px, 414px).
   - Ensure WCAG 2.1 AA contrast compliance, keyboard accessibility, and ARIA labels.
5. **Production Deployment & Release:**
   - Deploy Next.js frontend to Vercel with custom domain and SSL certificates.
   - Link production Supabase project with automated backup schedules and connection pooling.
   - Conduct final smoke test of the complete purchase lifecycle in production mode.

#### Acceptance Criteria
- [x] 100% of RLS policies tested and verified for multi-tenant isolation.
- [x] Zero inventory drift under high-concurrency simulation.
- [x] Lighthouse performance score $\ge 90$ for Desktop and $\ge 85$ for Mobile.
- [x] Production site operational on Vercel with active SSL and verified payment webhooks.
