# Reusable Component Registry (`Components.md`)

This file is the single source of truth for all reusable components in the **E-Commerce** application.

---

## 1. Reusability Protocol & Component Rules

> [!IMPORTANT]
> **Check Before Building:** Before creating or remaking any component, **always search this document**.
> - **If it exists here:** Reuse the existing component. Do NOT recreate or make duplicate components.
> - **If it does not exist:** Verify the design adheres to the rules below, build the reusable component, and **immediately register it in this document**.

### Core Constraints for Components:
1. **Flattened Cards Only:** Components utilizing cards must adhere to the flat card standard. **No nested cards allowed.**
2. **Create / Edit as Modals:** Any component that handles creating or editing data must be designed as a **popup modal (`Dialog`)**.
3. **Delete Confirmation Modal:** Destructive actions must invoke a confirmation dialog.
4. **Minimal Labels & Descriptions:** Remove redundant text labels and unnecessary explanatory text. Rely on intuitive icons, placeholders, and concise microcopy.

---

## 2. Component Inventory

| Component Name | File Path | Type | Status | Description |
|---|---|---|---|---|
| [`Button`](#1-button) | `src/components/ui/button.tsx` | UI Primitive | Ready | Accessible button with variants (`default`, `destructive`, `outline`, etc.) |
| [`Card`](#2-card) | `src/components/ui/card.tsx` | UI Primitive | Ready | Flattened container for content sections (strictly non-nested) |
| [`Input`](#3-input) | `src/components/ui/input.tsx` | UI Primitive | Ready | Styled form input field with accessible focus ring |
| [`Badge`](#4-badge) | `src/components/ui/badge.tsx` | UI Primitive | Ready | Compact status/category indicator badge |
| [`Modal`](#5-modal-dialog) | `src/components/ui/modal.tsx` | UI Primitive | Planned | Base popup modal for Create & Edit workflows |
| [`DeleteConfirmationModal`](#6-deleteconfirmationmodal) | `src/components/ui/delete-confirmation-modal.tsx` | UI Primitive | Planned | Standardized modal for confirming destructive deletions |
| [`ProductCard`](#7-productcard) | `src/components/ProductCard.tsx` | Feature | Planned | Flat product card with minimal labels, quick actions |

---

## 3. UI Primitive Components

### 1. `Button`
- **Location:** `src/components/ui/button.tsx`
- **Purpose:** Primary interactive trigger for actions, submissions, and modals.
- **Props:**
  ```typescript
  interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
  }
  ```
- **Usage Example:**
  ```tsx
  import { Button } from "@/components/ui/button";

  // Standard Action
  <Button variant="default">Add to Cart</Button>

  // Destructive Action
  <Button variant="destructive">Delete Product</Button>

  // Icon Button (Clean, no redundant text)
  <Button variant="ghost" size="icon" aria-label="Edit product">
    <Pencil className="h-4 w-4" />
  </Button>
  ```

---

### 2. `Card`
- **Location:** `src/components/ui/card.tsx`
- **Exports:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- **Rule:** **Must be used as a flat card.** Never nest a `<Card>` inside another `<Card>`.
- **Usage Example:**
  ```tsx
  import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

  <Card className="overflow-hidden">
    <CardHeader className="p-4 pb-2">
      <CardTitle className="text-base font-semibold">Minimalist Leather Backpack</CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <span className="text-lg font-bold">$129.99</span>
    </CardContent>
    <CardFooter className="p-4 pt-0 flex justify-between">
      <Button size="sm">Add to Cart</Button>
    </CardFooter>
  </Card>
  ```

---

### 3. `Input`
- **Location:** `src/components/ui/input.tsx`
- **Purpose:** Text input for forms and search bars.
- **Rule:** Omit repetitive external labels when self-evident; provide clear `placeholder` and `aria-label`.
- **Usage Example:**
  ```tsx
  import { Input } from "@/components/ui/input";

  <Input
    type="search"
    placeholder="Search products..."
    aria-label="Search products"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
  ```

---

### 4. `Badge`
- **Location:** `src/components/ui/badge.tsx`
- **Purpose:** Compact visual indicators for categories, tags, or item counts.
- **Variants:** `default`, `secondary`, `destructive`, `outline`
- **Usage Example:**
  ```tsx
  import { Badge } from "@/components/ui/badge";

  <Badge variant="secondary">Electronics</Badge>
  <Badge variant="outline">In Stock</Badge>
  ```

---

### 5. `Modal` (Dialog)
- **Location:** `src/components/ui/modal.tsx` *(To be created / standardized)*
- **Purpose:** Standard popup dialog for all Create and Edit workflows.
- **Props Specification:**
  ```typescript
  interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl";
  }
  ```
- **Standard Layout:**
  - Header with title and close (`X`) button.
  - Body container for form fields (`space-y-4`).
  - Action footer with "Cancel" and primary submit button.

---

### 6. `DeleteConfirmationModal`
- **Location:** `src/components/ui/delete-confirmation-modal.tsx` *(To be created / standardized)*
- **Purpose:** Mandatory confirmation dialog before executing any destructive deletion.
- **Props Specification:**
  ```typescript
  interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    itemName?: string;
    description?: string;
    isDeleting?: boolean;
  }
  ```
- **Standard Layout:**
  - Destructive icon header.
  - Confirmation text: `"Are you sure you want to delete {itemName}? This action cannot be undone."`
  - Footer actions: Outline "Cancel" and Destructive "Delete".

---

### 7. `ProductCard`
- **Location:** `src/components/ProductCard.tsx` *(To be created / standardized)*
- **Purpose:** Displays individual product information in a clean, flattened card format.
- **Key Constraints:**
  - Flattened layout (no sub-cards).
  - Clean metadata (price, stock badge, no redundant "Price:" or "Category:" labels).
  - Edit trigger launches Edit Modal; Delete trigger launches Delete Confirmation Modal.

---

## 4. How to Register a New Component

When creating any new reusable component:
1. Ensure no existing component in this file meets the need.
2. Confirm compliance with the rules (flat cards, modal CRUD, clean microcopy).
3. Add an entry to the **Component Inventory** table above.
4. Add a dedicated section under the appropriate heading with:
   - **Location**
   - **Purpose & Constraints**
   - **Props Interface**
   - **Usage Example**
