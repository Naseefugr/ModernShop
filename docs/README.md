# E-COMMERCE MULTI-VENDOR MARKETPLACE
## Master Documentation Index & Technical Blueprint

Welcome to the comprehensive technical documentation for the **Multi-Vendor E-Commerce Marketplace**. This documentation suite defines the complete product specifications, architecture, development roadmaps, and database engineering standards required to build, test, and deploy a modern, scalable multi-vendor commerce platform.

---

## Documentation Suite Overview

```text
d:\Buildathon\E-Commerce\docs/
├── README.md               <-- Master Documentation Index (You are here)
├── PROJECT_REQUIREMENTS.md <-- Software Requirements Specification (SRS) & Capabilities
├── PROJECT_PLAN.md         <-- Technical Architecture, Risks, QA & DevOps Plan
├── PROJECT_PHASES.md       <-- 7-Phase Detailed Implementation & Milestone Roadmap
└── DATABASE_SCHEMA.md      <-- Relational PostgreSQL Schema (24 Tables), DDL, RLS & Triggers
```

---

## 1. [Project Requirements Specification](PROJECT_REQUIREMENTS.md)
*Complete functional and non-functional requirements, user personas, access matrices, and domain workflows.*

- **User Personas:** Admin, Salesman, Customer, Guest (`anon`).
- **Role-Based Access Control (RBAC):** CRUD capability matrix for all platform actions.
- **Storefront Features:** Unrestricted public browsing, multi-faceted search & filtering, interactive product details with variant selectors.
- **Cart & Multi-Vendor Checkout:** Consolidated multi-vendor shopping cart, Indian payment support (UPI, Cards, NetBanking, COD), and multi-address book.
- **Fulfillment & Tracking:** Automated order splitting per salesman fulfillment group with end-to-end milestone progress tracking.
- **Vendor & Admin Capabilities:** Autonomous vendor inventory & sales management; Admin marketplace command center, vendor verification, and dynamic CMS controls.
- **Non-Functional Standards:** Performance benchmarks ($\text{FCP} \le 1.2\text{s}$, $\text{LCP} \le 2.0\text{s}$), PCI-DSS payment compliance, data isolation, and reliability targets.

---

## 2. [Project Plan & Technical Architecture](PROJECT_PLAN.md)
*System architecture, component diagrams, technology stack rationale, risk management, and QA framework.*

- **System Flow Diagram:** Client presentation layer, Edge/CDN routing, Supabase services (Auth, PostgreSQL, Realtime, Storage), and Razorpay payments.
- **Technology Justification:** Next.js / React 18, TypeScript, Tailwind CSS, shadcn/ui, Supabase PostgreSQL, and Razorpay.
- **Subsystem Architecture:** Multi-tenant JWT claims injection, atomic inventory locking (`SELECT ... FOR UPDATE`), and decoupled vendor fulfillment.
- **Risk Assessment & Mitigation Matrix:** High-impact risk strategies for inventory overselling, dropped webhooks, tenant data isolation, and multi-vendor refund handling.
- **Testing & Quality Assurance:** Testing pyramid covering unit calculations, integration flows, E2E customer/seller journeys, and RLS penetration tests.
- **CI/CD Pipeline:** GitHub Actions automated lint/test suites deployed seamlessly to Vercel and Supabase.

---

## 3. [Project Phases & Development Roadmap](PROJECT_PHASES.md)
*Step-by-step phased execution guide across a 12-week agile delivery cycle.*

- **Phase 1 – Foundation & Core Architecture (Weeks 1–2):** Framework configuration, Supabase DB provisioning, Auth lifecycles, and role-guarded routes.
- **Phase 2 – Marketplace & Discovery (Weeks 3–4):** Public catalog, category hierarchies, search/filter sidebar, and rich product detail pages.
- **Phase 3 – Salesman / Vendor Workspace (Weeks 5–6):** Vendor onboarding, product CRUD wizard, stock management, and sub-order dispatch workflows.
- **Phase 4 – Customer Experience & Checkout (Weeks 7–8):** Cart engine, multi-address book, multi-vendor order splitting, Razorpay gateway, and visual timeline tracking.
- **Phase 5 – Admin Command Center (Week 9):** Marketplace analytics, user/vendor moderation, global category tree builder, and dynamic CMS banners/settings.
- **Phase 6 – Integrations & Advanced Features (Week 10):** Real-time in-app notification bell, GST-compliant PDF invoice generator, verified purchaser reviews, and coupon engine.
- **Phase 7 – Hardening, Testing & Deployment (Weeks 11–12):** RLS audit, concurrency stress tests, accessibility audits, and production launch on Vercel.

---

## 4. [Database Schema & Architecture](DATABASE_SCHEMA.md)
*Complete PostgreSQL relational database design, DDL scripts, indexes, RLS policies, and stored procedures.*

- **Architectural Standards:** 3NF design, UUID primary keys (`gen_random_uuid()`), `TIMESTAMPTZ` temporal fields, B-Tree indexes on all foreign keys.
- **24 Comprehensive Relational Tables:**
  1. `profiles`
  2. `salesman_profiles`
  3. `customer_profiles`
  4. `addresses`
  5. `categories`
  6. `subcategories`
  7. `products`
  8. `product_images`
  9. `product_variants`
  10. `inventory_logs`
  11. `carts`
  12. `cart_items`
  13. `wishlists`
  14. `wishlist_items`
  15. `orders` (Master customer order container)
  16. `sub_orders` (Vendor fulfillment split)
  17. `order_items` (Immutable price & product snapshots)
  18. `order_status_history` (Milestone audit log)
  19. `payments`
  20. `transactions`
  21. `notifications`
  22. `product_reviews`
  23. `coupons`
  24. `platform_settings`
- **Security & RLS Policies:** Granular row-level security for Public, Customer, Salesman, and Admin roles.
- **Database Functions & Triggers:** Automated user profile creation trigger, and an atomic stored procedure (`process_order_checkout`) with row-level locks to prevent overselling.
