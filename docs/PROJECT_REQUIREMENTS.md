# E-COMMERCE MULTI-VENDOR MARKETPLACE
## Software Requirements Specification (SRS) & System Capabilities

---

### Document Control
- **Project Name:** Multi-Vendor E-Commerce Marketplace
- **Document Version:** 1.0.0
- **Status:** Approved Architecture Draft
- **Target Audience:** Engineering Leads, Product Managers, Frontend/Backend Developers, QA Specialists, Database Architects

---

## 1. Executive Summary & Product Scope

### 1.1 Product Vision
The **Multi-Vendor E-Commerce Marketplace** is an enterprise-grade digital commerce platform connecting verified independent sellers (**Salesmen/Vendors**) with shoppers (**Customers**), orchestrated under centralized governance by marketplace operators (**Admins**). 

The platform supports seamless product discovery, multi-vendor cart consolidation, atomic order splitting per seller fulfillment group, secure Indian digital payment methods (UPI, Cards, NetBanking, COD), end-to-end milestone order tracking, real-time in-app notifications, verified purchaser reviews, automated PDF invoicing, and dynamic platform administration.

### 1.2 Core Objectives
- **Unrestricted Guest Discovery:** Permit anonymous users to explore, search, filter, and view product catalogues without forced registration.
- **Unified Multi-Vendor Cart & Single Checkout:** Allow shoppers to add items from multiple distinct salesmen into a unified cart and check out in a single transaction, while the system seamlessly splits orders into vendor-specific fulfillment streams.
- **Autonomous Vendor Workspace:** Empower salesmen with dedicated portals for inventory lifecycle management, pricing, dispatch, tracking status updates, and revenue analytics without access to competitor data.
- **Absolute Central Marketplace Control:** Provide admins with comprehensive real-time dashboards, platform revenue metrics, vendor moderation, product curation, user suspension, and dynamic CMS site settings.
- **Rock-Solid Security & Data Isolation:** Enforce Row-Level Security (RLS) at the PostgreSQL database tier to guarantee impenetrable tenant and user isolation.

---

## 2. User Personas & Access Control Matrix

### 2.1 User Personas

| Persona | Role Key | Primary Responsibilities | Entry Point |
| :--- | :--- | :--- | :--- |
| **Marketplace Admin** | `admin` | Overall platform governance, user/vendor approval, dispute resolution, financial auditing, global category configuration, CMS banners, platform settings. | `/admin` |
| **Salesman / Vendor** | `salesman` | Storefront management, product catalog creation, stock & inventory tracking, order packing & dispatch, delivery milestone updates, vendor analytics. | `/vendor` |
| **Customer / Buyer** | `customer` | Product exploration, wishlist curation, multi-item checkout, online/COD payments, timeline tracking, review submission, invoice downloads. | `/` & `/account` |
| **Guest / Anonymous** | `anon` | Public browsing, search, category navigation, product detail inspection, guest cart session. | `/` |

### 2.2 Role-Based Access Control (RBAC) Matrix

| Entity / Operation | Guest (`anon`) | Customer (`customer`) | Salesman (`salesman`) | Admin (`admin`) |
| :--- | :---: | :---: | :---: | :---: |
| **Browse Active Products & Categories** | Read | Read | Read | Read |
| **Search & Filter Catalog** | Read | Read | Read | Read |
| **Manage Personal Cart & Wishlist** | Session only | Full (Own) | Full (Own customer account) | - |
| **Checkout & Place Orders** | - | Create | Create | - |
| **View Personal Orders & Invoices** | - | Read (Own) | - | Read (All) |
| **Update Order Delivery Status** | - | - | Update (Own Sub-Orders) | Update (All Orders) |
| **Request Order Cancel / Return** | - | Create (Own) | Approve/Reject (Own items) | Full Control |
| **Manage Products (CRUD)** | - | - | Full (Own Products) | Full (All Products) |
| **Approve / Reject Products** | - | - | - | Full Control |
| **Approve / Suspend Salesmen** | - | - | - | Full Control |
| **Platform Analytics & Finance** | - | - | Read (Own Store Only) | Read (Global Platform) |
| **Configure Site Banners & Settings** | - | - | - | Full Control |
| **Write Product Reviews** | - | Create (Verified Purchases) | - | Moderate / Delete |

---

## 3. Functional Requirements Specification

### 3.1 Customer Experience & Public Storefront

#### FR-CUST-01: Public Catalog Discovery
- The system must display public products with status `active` and stock `> 0`.
- Products must render with title, category, brand, active price, original MSRP (if discounted), discount percentage badge, thumbnail image, average star rating, and vendor name.
- Guests must be able to browse without authentication tokens or mandatory sign-up prompts.

#### FR-CUST-02: Search & Advanced Multi-Faceted Filtering
- Search keyword matching must support product titles, descriptions, categories, subcategories, brand names, and metadata tags.
- Filtering options must include: Category/Subcategory hierarchy, Price Range slider (min–max), Brand checkbox list, In-Stock toggle, and Seller store filter.
- Sorting options must include: *Price: Low to High*, *Price: High to Low*, *Newest Arrivals*, *Customer Rating*, and *Popularity / Best Selling*.

#### FR-CUST-03: Detailed Product Display
- Product pages must showcase multiple high-resolution images with zoom and thumbnail selection.
- Clear breakdown of stock status (`In Stock`, `Low Stock (Only X left)`, or `Out of Stock`).
- Detailed description, technical specifications table, bulleted features list, delivery estimated window, and seller identity card.
- Variant selector for size, color, or bundle with dynamic price/inventory updates.
- Section displaying verified customer reviews with average rating distribution bar.

#### FR-CUST-04: Shopping Cart Engine
- Persistent cart state saved to PostgreSQL for logged-in customers; local storage synchronization on initial login.
- Dynamic quantity modification (+ / -) with live validation against available stock limit.
- Real-time calculation of item total, cart subtotal, applicable taxes, shipping fees, and net payable amount.
- Notification badge indicating if an item in the cart has changed price or gone out of stock.

#### FR-CUST-05: Multi-Address & Checkout Process
- Support multiple saved delivery addresses per customer with a designated `default` flag.
- Detailed address fields: Full Name, 10-digit Mobile Number, Alternate Phone, House/Flat No, Street/Locality, Landmark, City, District, State, and 6-digit PIN code.
- Supported payment options:
  1. **UPI** (Google Pay, PhonePe, Paytm, BHIM via Razorpay SDK)
  2. **Credit & Debit Cards** (Visa, MasterCard, RuPay with 3D Secure OTP verification)
  3. **Net Banking** (Major Indian Banks)
  4. **Cash on Delivery (COD)** (Subject to admin configuration and order amount thresholds)
- Validation guaranteeing zero storage of raw card numbers or CVV.

#### FR-CUST-06: Customer Order Management & Milestone Tracking
- Dedicated `My Orders` customer view grouped by order status tabs.
- Visual timeline milestone indicator:
  $$\text{Placed} \longrightarrow \text{Confirmed} \longrightarrow \text{Processing} \longrightarrow \text{Packed} \longrightarrow \text{Shipped} \longrightarrow \text{Out for Delivery} \longrightarrow \text{Delivered}$$
- Detailed receipt view with printable/downloadable automated PDF invoice.
- Self-service cancellation request trigger if order has not progressed beyond `Processing`.
- Return request trigger with reason code within 7 days of `Delivered` status.

#### FR-CUST-07: Wishlist & Verified Reviews
- One-click toggle to add or remove products from personalized Wishlist.
- Verified review submission (1 to 5 star rating, title, comments, optional customer photos) restricted strictly to customers who have an order with `Delivered` status for that specific product ID.

---

### 3.2 Salesman / Vendor Workspace

#### FR-VEND-01: Vendor Onboarding & Verification
- Dedicated registration workflow requiring Business Name, Store Slug, GSTIN / Tax ID, Phone Number, Business Address, and Bank Account Details for payouts.
- Account status initialized as `pending_approval`; salesman cannot publish live products until Admin approves the profile.

#### FR-VEND-02: Autonomous Product Lifecycle Management
- **Create / Edit Product Wizard:**
  - Product Name, Category & Subcategory cascade, Brand.
  - Rich-text Description, Feature bullet points, Technical Specs key-value pairs.
  - Multiple image upload with thumbnail assignment.
  - Base Selling Price, Comparative Strikethrough Price, Unit Cost.
  - Stock quantity input with automatic low-stock alert threshold.
  - SKU code, delivery turnaround time (in business days), package dimensions.
  - Variant definitions (Attributes: Color, Size; Values; Variant SKU; Variant Price; Variant Stock).
- **Status Transitions:** Salesman can switch product status between `active` and `paused`.
- Absolute data barrier: Salesmen can only view, query, update, or delete products where `salesman_id = auth.uid()`.

#### FR-VEND-03: Multi-Vendor Order Fulfillment Flow
- When an order containing items from multiple vendors is placed, the system automatically creates a child **Sub-Order** tied specifically to that vendor.
- The vendor dashboard displays incoming orders with buyer name, shipping address, ordered item specifics, variant attributes, and delivery deadline.
- Status progression permissions: The vendor can advance their own sub-order through `Confirmed` $\rightarrow$ `Processing` $\rightarrow$ `Packed` $\rightarrow$ `Shipped` (with tracking number & courier partner) $\rightarrow$ `Delivered`.
- Vendors have zero visibility into items from other vendors purchased within the same master order.

#### FR-VEND-04: Vendor Sales Analytics & Reports
- Real-time revenue calculations: Gross Merchandise Value (GMV), Platform Commission deductions, Net Vendor Earnings.
- Interactive charts: Daily, Weekly, Monthly, and Annual revenue curves.
- Inventory velocity: Top 5 best-selling products, lowest stock warnings, return rate percentages.
- Export capabilities for sales records (CSV/Excel format).

---

### 3.3 Marketplace Administration Center

#### FR-ADMN-01: Platform Command Dashboard
- High-level KPI metric cards:
  - Total Gross Marketplace Volume (GMV) & Net Platform Commission
  - Total Registered Buyers vs. Registered Sellers
  - Total Active Products vs. Paused / Out of Stock Products
  - Total Master Orders & Sub-Orders broken down by live status
- Platform-wide sales trend line charts, category distribution pie charts, and vendor leaderboard.

#### FR-ADMN-02: Comprehensive User & Vendor Governance
- Master list of all registered accounts with role tags (`customer`, `salesman`, `admin`).
- Advanced filters by registration date range, verification status, and account activity.
- Deep profile inspection: Order history, total spend, vendor catalog size, cumulative sales volume, and dispute log.
- Admin actions: One-click Approve, Reject, Deactivate, Suspend, or Delete with audit logging.

#### FR-ADMN-03: Global Catalog & Product Oversight
- Global product moderation queue: Option to enforce mandatory Admin Approval before newly submitted salesman products appear in the public catalog.
- Ability to feature products on the homepage carousel or trending product highlights.
- Global Category & Subcategory builder: Add, rename, reorder, assign icon/banner, and deactivate categories.
- Override control: Remove or force-pause any product violating platform safety, pricing, or copyright guidelines.

#### FR-ADMN-04: Central Order & Dispute Resolution
- Complete visibility across all master orders and split vendor sub-orders.
- Filter orders by date, customer, vendor, payment method, and dispatch state.
- Dispute mediation: Override sub-order status, authorize cancellation requests, trigger customer refunds, and record resolution notes.

#### FR-ADMN-05: Dynamic Site Settings & CMS Control
- **Branding & Assets:** Marketplace Name, Logo, Favicon, Support Email, Helpline Phone.
- **Hero & Promotional Banners:** Banner title, subtitle, CTA URL, image upload, active schedule.
- **Financial & Order Policies:** Default commission percentage per category, minimum order threshold for free shipping, flat shipping rates, COD availability toggle.
- **Platform Rules:** Customer return window (days), auto-cancellation timeouts for unpaid orders.

---

### 3.4 In-App Notification System

#### FR-NOTF-01: Multi-Role Notification Engine
- In-app notification center accessible via top navbar bell icon with dynamic unread counter badge.
- Event triggers:
  - **Admin:** New salesman registered, new product submitted, order disputed, high-value transaction.
  - **Salesman:** New order received, sub-order cancellation requested, low stock threshold reached, product approval status updated.
  - **Customer:** Order confirmed, payment successful, order packed, dispatched with tracking link, delivered, refund processed.
- Mark as Read and Mark All as Read actions with real-time Supabase Realtime websocket updates.

---

## 4. Non-Functional Requirements (NFR)

### 4.1 Performance & Scalability
- **Page Load Time:** First Contentful Paint (FCP) $\le 1.2\text{s}$, Largest Contentful Paint (LCP) $\le 2.0\text{s}$ on standard 4G networks.
- **Database Query Latency:** 95% of read queries must execute in $< 50\text{ms}$ utilizing appropriate B-Tree and GIN indexes.
- **Scalability:** Horizontal scaling of frontend instances; connection pooling via Supabase Supavisor supporting up to 10,000 concurrent sessions.

### 4.2 Security & Data Protection
- **Authentication:** Supabase Auth utilizing JSON Web Tokens (JWT) with secure HTTP-only cookies and cryptographic signatures.
- **Role Enforcement:** Server-side validation on every API endpoint/Server Action combined with PostgreSQL Row-Level Security (RLS) on all exposed tables.
- **Payment Compliance:** Zero exposure of raw payment card data (PCI-DSS compliance managed through payment gateway tokenization).
- **Transport Security:** Strict HTTPS (TLS 1.3) enforced across all domains with HTTP Strict Transport Security (HSTS).
- **Input Sanitization:** Parameterized database queries preventing SQL injection; strict DOM escaping mitigating Cross-Site Scripting (XSS).

### 4.3 Reliability & Availability
- Platform uptime target of $99.9\%$.
- Automated database backups with Point-In-Time Recovery (PITR) enabled.
- Graceful degradation: If a third-party service (e.g. email or SMS notification) fails, the core purchase workflow completes without disruption.

---

## 5. Business Logic & Domain Workflows

### 5.1 Multi-Vendor Order Splitting Logic
```text
                     [Customer Unified Cart]
               (Contains Item A [Vendor 1], Item B [Vendor 2])
                                |
                                v
               [Single Customer Checkout & Payment]
                                |
                   [Create Master Order #1001]
             (Customer sees 1 payment of Total ₹2,499)
                                |
        +-----------------------+-----------------------+
        |                                               |
        v                                               v
[Sub-Order #1001-A]                             [Sub-Order #1001-B]
Vendor 1 Portal                                 Vendor 2 Portal
- Item A (Qty: 1, ₹999)                         - Item B (Qty: 2, ₹1,500)
- Independent Status: Placed                    - Independent Status: Placed
- Independent Tracking: Courier X               - Independent Tracking: Courier Y
```

### 5.2 Concurrency & Inventory Lock Rule
When an order checkout initiates:
1. An atomic database transaction verifies `inventory >= requested_quantity` for every item.
2. If verified, the transaction decrements `inventory` by `requested_quantity` and inserts the `order_items` record.
3. If any item is out of stock, the transaction rolls back cleanly, returning a descriptive error indicating which product is unavailable.
4. If payment fails or times out within 15 minutes, inventory is automatically restored.
