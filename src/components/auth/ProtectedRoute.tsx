import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldAlert, Clock, LogIn } from "lucide-react";
import type { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireApprovedSalesman?: boolean;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireApprovedSalesman = false,
}: ProtectedRouteProps) {
  const { user, profile, salesmanProfile, isLoading, isAuthenticated } = useAuth();
  const { navigate } = useNavigation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Verifying credentials and security permissions...</p>
      </div>
    );
  }

  // 1. Not Authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card className="text-center shadow-lg border-muted">
          <CardHeader className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Authentication Required</CardTitle>
            <CardDescription>
              You must sign in to your account to access this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => navigate("/login")}>
              Proceed to Sign In
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Return to Storefront
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userRole = profile?.role || "customer";

  // 2. Role Not Allowed
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card className="text-center shadow-lg border-destructive/20">
          <CardHeader className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Access Restricted</CardTitle>
            <CardDescription>
              Your account role (<span className="font-semibold capitalize text-foreground">{userRole}</span>)
              does not have authorization to view this section.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md text-left">
              Required privilege: <span className="font-mono text-foreground">{allowedRoles.join(" or ")}</span>
            </div>
            <Button className="w-full" onClick={() => navigate("/")}>
              Return to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Salesman Pending Approval Check
  if (
    userRole === "salesman" &&
    requireApprovedSalesman &&
    salesmanProfile &&
    !salesmanProfile.is_approved
  ) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <Card className="text-center shadow-lg border-amber-500/20">
          <CardHeader className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <CardTitle className="text-xl">Store Account Pending Approval</CardTitle>
            <CardDescription>
              Welcome, <span className="font-semibold text-foreground">{salesmanProfile.store_name}</span>. Your vendor registration is currently under review by marketplace administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-left text-sm text-muted-foreground">
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex justify-between">
                <span>Store Name:</span>
                <span className="font-medium text-foreground">{salesmanProfile.store_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Store URL Slug:</span>
                <span className="font-mono text-xs text-foreground">/{salesmanProfile.store_slug}</span>
              </div>
              <div className="flex justify-between">
                <span>Business Phone:</span>
                <span className="text-foreground">{salesmanProfile.business_phone}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  Pending Verification
                </span>
              </div>
            </div>
            <p className="text-xs text-center">
              You will gain full access to product catalog management and order fulfillment once approved.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
