import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigation, Link } from "@/context/NavigationContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircle, Lock, Mail, ArrowRight } from "lucide-react";

export function LoginPage() {
  const { signIn, isAuthenticated, role } = useAuth();
  const { navigate } = useNavigation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to appropriate workspace based on user role
  useEffect(() => {
    if (isAuthenticated) {
      if (role === "admin") navigate("/admin");
      else if (role === "salesman") navigate("/vendor");
      else navigate("/account");
    }
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter both email address and password.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      // Immediately redirect to user workspace according to role
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          if (prof?.role === "admin") {
            navigate("/admin");
            return;
          } else if (prof?.role === "salesman") {
            navigate("/vendor");
            return;
          } else {
            navigate("/account");
            return;
          }
        }
      } catch (err) {
        console.error("Redirect role check error:", err);
      }
      navigate("/account");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[75vh]">
      <Card className="w-full max-w-md shadow-xl border-border/80">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Sign In</CardTitle>
          <CardDescription>
            Access your ModernShop customer account or vendor workspace
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Quick Demo Credentials Bar */}
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Demo Accounts (1-Click Fill):</span>
                <span className="text-[10px] text-muted-foreground font-mono bg-background px-1.5 py-0.5 rounded border">Password@123</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2 border-primary/30 hover:bg-primary/10"
                  onClick={() => {
                    setEmail("customer@demo.com");
                    setPassword("Password@123");
                  }}
                >
                  Customer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2 border-primary/30 hover:bg-primary/10"
                  onClick={() => {
                    setEmail("salesman@demo.com");
                    setPassword("Password@123");
                  }}
                >
                  Salesman
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2 border-primary/30 hover:bg-primary/10"
                  onClick={() => {
                    setEmail("admin@demo.com");
                    setPassword("Password@123");
                  }}
                >
                  Admin
                </Button>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => alert("Password reset link will be sent to your email.")}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>Signing in...</>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              Don&apos;t have an account yet?{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Register here
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
