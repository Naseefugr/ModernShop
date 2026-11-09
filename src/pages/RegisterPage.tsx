import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigation, Link } from "@/context/NavigationContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, User, Mail, Lock, Phone, Store, MapPin, FileText, CheckCircle2 } from "lucide-react";

export function RegisterPage() {
  const { signUpCustomer, signUpSalesman, isAuthenticated } = useAuth();
  const { navigate } = useNavigation();

  const [activeTab, setActiveTab] = useState<"customer" | "salesman">("customer");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer Form State
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custPassword, setCustPassword] = useState("");
  const [custConfirmPass, setCustConfirmPass] = useState("");

  // Salesman Form State
  const [salesName, setSalesName] = useState("");
  const [salesEmail, setSalesEmail] = useState("");
  const [salesPhone, setSalesPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [salesPassword, setSalesPassword] = useState("");
  const [salesConfirmPass, setSalesConfirmPass] = useState("");

  const { role } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      if (role === "admin") navigate("/admin");
      else if (role === "salesman") navigate("/vendor");
      else navigate("/account");
    }
  }, [isAuthenticated, role, navigate]);

  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setStoreName(name);
    // Auto-generate URL slug from store name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setStoreSlug(slug);
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (custPassword !== custConfirmPass) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (custPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUpCustomer({
      fullName: custName,
      email: custEmail,
      phoneNumber: custPhone,
      password: custPassword,
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage(
        "Customer account created successfully! Please check your email to confirm registration or sign in."
      );
    }
  };

  const handleSalesmanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (salesPassword !== salesConfirmPass) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (salesPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (!storeSlug) {
      setErrorMessage("A valid store URL slug is required.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUpSalesman({
      fullName: salesName,
      email: salesEmail,
      phoneNumber: salesPhone,
      storeName,
      storeSlug,
      businessAddress,
      gstin: gstin || undefined,
      password: salesPassword,
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage(
        "Salesman registration submitted! Your account is created in 'Pending Approval' status. Once approved by Admin, you can publish products."
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-xl shadow-xl border-border/80">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Create an Account</CardTitle>
          <CardDescription>
            Choose your account type to register on ModernShop
          </CardDescription>

          {/* Account Role Tabs */}
          <div className="flex rounded-lg bg-muted p-1 mt-4">
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                activeTab === "customer"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setActiveTab("customer");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              Shopper (Customer)
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "salesman"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setActiveTab("salesman");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <span>Seller (Salesman)</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                Vendor
              </Badge>
            </button>
          </div>
        </CardHeader>

        {successMessage ? (
          <CardContent className="space-y-4 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold">Registration Completed</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {successMessage}
            </p>
            <Button className="mt-4" onClick={() => navigate("/login")}>
              Proceed to Sign In
            </Button>
          </CardContent>
        ) : (
          <>
            {activeTab === "customer" ? (
              // Customer Registration Form
              <form onSubmit={handleCustomerSubmit}>
                <CardContent className="space-y-4">
                  {errorMessage && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="John Doe"
                        className="pl-9"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          className="pl-9"
                          value={custEmail}
                          onChange={(e) => setCustEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          placeholder="9876543210"
                          className="pl-9"
                          value={custPhone}
                          onChange={(e) => setCustPhone(e.target.value)}
                          pattern="[0-9]{10}"
                          title="10-digit mobile number"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="pl-9"
                          value={custPassword}
                          onChange={(e) => setCustPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="pl-9"
                          value={custConfirmPass}
                          onChange={(e) => setCustConfirmPass(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4 pt-2">
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Registering..." : "Create Customer Account"}
                  </Button>
                  <div className="text-center text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold text-primary hover:underline">
                      Sign in here
                    </Link>
                  </div>
                </CardFooter>
              </form>
            ) : (
              // Salesman Registration Form
              <form onSubmit={handleSalesmanSubmit}>
                <CardContent className="space-y-4">
                  {errorMessage && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Store Name
                      </label>
                      <div className="relative">
                        <Store className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Apex Electronics"
                          className="pl-9"
                          value={storeName}
                          onChange={handleStoreNameChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Store Slug (URL Identifier)
                      </label>
                      <Input
                        type="text"
                        placeholder="apex-electronics"
                        value={storeSlug}
                        onChange={(e) => setStoreSlug(e.target.value)}
                        required
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Salesman Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Ramesh Sharma"
                          className="pl-9"
                          value={salesName}
                          onChange={(e) => setSalesName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Business Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          placeholder="9876543210"
                          className="pl-9"
                          value={salesPhone}
                          onChange={(e) => setSalesPhone(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Business Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="contact@apex.com"
                          className="pl-9"
                          value={salesEmail}
                          onChange={(e) => setSalesEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        GSTIN (Tax ID - Optional)
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="29AAAAA0000A1Z5"
                          className="pl-9 uppercase"
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      Business Operating Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Plot 42, Tech Industrial Zone, Bengaluru, Karnataka"
                        className="pl-9"
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="pl-9"
                          value={salesPassword}
                          onChange={(e) => setSalesPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="pl-9"
                          value={salesConfirmPass}
                          onChange={(e) => setSalesConfirmPass(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4 pt-2">
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting Registration..." : "Register as Salesman / Seller"}
                  </Button>
                  <div className="text-center text-xs text-muted-foreground">
                    Already registered?{" "}
                    <Link to="/login" className="font-semibold text-primary hover:underline">
                      Sign in here
                    </Link>
                  </div>
                </CardFooter>
              </form>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
