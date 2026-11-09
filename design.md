# Design System & UI/UX Standards (`design.md`)

This document outlines the visual language, interface guidelines, component behaviors, and interaction patterns for the **E-Commerce** application.

---

## 1. Core Design Principles

1. **Uncluttered & Minimalist:**
   - Eliminate unnecessary text labels, descriptive paragraphs, and redundant helper text.
   - Use visual hierarchy, whitespace, icons, and typography to convey meaning instead of verbose words.
2. **Modal-First CRUD:**
   - Every creation and modification flow happens inside a popup modal.
   - Every destructive deletion requires an explicit confirmation modal.
3. **Flat Card Hierarchy:**
   - Cards are strictly flat (single-depth).
   - **Never nest cards within cards.** Use subtle dividers, flex columns, or flat grid sections.
4. **Consistency & Accessibility:**
   - High-contrast text, clear focus rings, keyboard accessible dialogs (Esc to dismiss), responsive layouts.

---

## 2. Text & Label Minimization Guidelines

> **Rule:** Remove unwanted text labels and descriptions. Keep UI elements clean and purposeful.

### Do's and Don'ts

| Avoid (Cluttered / Redundant) | Recommended (Clean & Minimal) |
|---|---|
| `<p>Price: $129.99</p>` | `<span className="font-semibold text-lg">$129.99</span>` |
| `<p>Category: Electronics</p>` | `<Badge variant="secondary">Electronics</Badge>` |
| `<p>Product In Stock: 15 left</p>` | `<span className="text-xs text-muted-foreground">15 in stock</span>` |
| `<p>Please enter the name of the product you wish to sell:</p>` | `<Input placeholder="Product name" aria-label="Product name" />` |
| Paragraphs explaining obvious buttons (e.g., *"Click here to edit this product details"*) | Clean icon button: `<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>` |

### Principles for Microcopy:
- **Omit Obvious Labels:** If the context is clear (e.g., search bar with magnifying glass), omit external labels and use intuitive `placeholder` and `aria-label`.
- **Prefer Badges for Metadata:** Render tags, categories, or status as compact, neutral badges instead of labeled text rows.
- **Icon + Value:** Use small Lucide icons (e.g., `<Package className="h-3.5 w-3.5 text-muted-foreground" /> 12`) rather than `"Stock count: 12"`.

---

## 3. Flat Card Architecture (No Nested Cards)

> **Rule:** All cards must be flattened. No card should ever reside inside another card.

### Anti-Pattern (Nested Cards - Prohibited)
```tsx
// ❌ WRONG: Nested card inside outer card
<Card>
  <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
  <CardContent>
    <Card> {/* ❌ Prohibited: Nested Card */}
      <CardContent>Product 1</CardContent>
    </Card>
  </CardContent>
</Card>
```

### Approved Pattern (Flattened Card)
```tsx
// ✅ CORRECT: Flattened card with divider / list structure
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-base font-medium">Order Summary</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <div className="flex items-center justify-between border-b pb-2">
      <span className="text-sm">Minimalist Leather Backpack</span>
      <span className="font-medium">$129.99</span>
    </div>
  </CardContent>
</Card>
```

### Card Styling Specifications
- **Container:** `rounded-xl border bg-card text-card-foreground shadow-sm`
- **Padding:** Compact padding (`p-4` or `p-5`) to avoid bloated containers.
- **Hover States (Interactive cards):** `transition-all duration-200 hover:shadow-md hover:border-primary/40`

---

## 4. Popup Modal Standards (Create & Edit)

> **Rule:** All create and edit workflows must be implemented as popup modals (`Dialog`).

### Modal Anatomy
1. **Backdrop / Overlay:** Fixed inset, semi-transparent blur (`bg-black/50 backdrop-blur-sm`).
2. **Modal Box:** Centered, responsive width (`w-full max-w-md sm:max-w-lg`), rounded corners (`rounded-xl`), bordered (`border bg-background shadow-lg`).
3. **Modal Header:**
   - Clear, concise Title (e.g., "New Product" or "Edit Product").
   - Close button (`X` icon) at top-right.
4. **Modal Content / Form:**
   - Stacked inputs with concise labels or floating placeholders.
   - Consistent vertical spacing (`space-y-4`).
5. **Modal Footer:**
   - Action buttons aligned to the right.
   - Cancel button (`variant="outline"` or `variant="ghost"`).
   - Primary Submit button (`variant="default"`), e.g., "Save Product" or "Update".

### Behavior:
- Opens centered on screen.
- Dismissible via clicking overlay, pressing `Escape`, or clicking "Cancel" / `X`.
- Auto-focuses the first interactive input on open.

---

## 5. Delete Confirmation Modal Standards

> **Rule:** Deletions must never occur directly on click. A confirmation modal is mandatory.

### Confirmation Modal Specifications:
- **Visual Accent:** Destructive icon (e.g., `<AlertTriangle className="h-6 w-6 text-destructive" />` or `<Trash2 />`).
- **Header:** "Delete Product" or "Confirm Deletion".
- **Message:** Explicit and concise confirmation text specifying the item:
  > *"Are you sure you want to delete **Minimalist Leather Backpack**? This action cannot be undone."*
- **Actions:**
  - **Cancel:** Secondary / Outline button (`variant="outline"`), labeled "Cancel".
  - **Confirm Delete:** Destructive button (`variant="destructive"`), labeled "Delete" or "Yes, Delete".

---

## 6. Color Tokens & Theme Guide

Built on Tailwind CSS design tokens:

| Token | Class | Usage |
|---|---|---|
| **Background** | `bg-background` (`hsl(0 0% 100%)` / dark `hsl(240 10% 3.9%)`) | Page background |
| **Card** | `bg-card` | Surface background for flat cards |
| **Primary** | `bg-primary text-primary-foreground` | Main CTAs, submit buttons, primary highlights |
| **Secondary** | `bg-secondary text-secondary-foreground` | Badges, subtle actions |
| **Destructive** | `bg-destructive text-destructive-foreground` | Delete buttons, error states, danger badges |
| **Muted** | `text-muted-foreground` | Subdued text, metadata, secondary icons |
| **Border** | `border-border` (`border-input`) | Subtle dividers and component boundaries |

---

## 7. Responsive Breakpoints

- **Mobile (`< 640px`):** Single-column grid, full-width modals with standard bottom or centered placement, compact card paddings (`p-3.5`).
- **Tablet (`640px - 1024px`):** 2-column product grid, standard centered modals (`max-w-md`).
- **Desktop (`> 1024px`):** 3-to-4 column product grid, wide desktop layouts with sticky header navigation.
