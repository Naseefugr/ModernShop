import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, SalesmanProfile, UserRole } from "@/types";

interface CustomerSignUpData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

interface SalesmanSignUpData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  storeName: string;
  storeSlug: string;
  businessAddress: string;
  gstin?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  salesmanProfile: SalesmanProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpCustomer: (data: CustomerSignUpData) => Promise<{ error: Error | null }>;
  signUpSalesman: (data: SalesmanSignUpData) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [salesmanProfile, setSalesmanProfile] = useState<SalesmanProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: prof, error: profError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profError) {
        console.warn("Could not fetch user profile:", profError.message);
        setProfile(null);
        setSalesmanProfile(null);
        return;
      }

      setProfile(prof as Profile);

      // If user is a salesman, fetch salesman details
      if (prof.role === "salesman") {
        const { data: sProf, error: sError } = await supabase
          .from("salesman_profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (!sError && sProf) {
          setSalesmanProfile(sProf as SalesmanProfile);
        }
      } else {
        setSalesmanProfile(null);
      }
    } catch (err: unknown) {
      console.error("Error fetching user profile:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            await fetchProfile(currentSession.user.id);
          }
        }
      } catch (err: unknown) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
          setSalesmanProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return { error: signInError };
      }
      return { error: null };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e.message);
      return { error: e };
    }
  };

  const signUpCustomer = async (data: CustomerSignUpData) => {
    setError(null);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone_number: data.phoneNumber || null,
            role: "customer",
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return { error: signUpError };
      }
      return { error: null };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e.message);
      return { error: e };
    }
  };

  const signUpSalesman = async (data: SalesmanSignUpData) => {
    setError(null);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone_number: data.phoneNumber,
            role: "salesman",
            store_name: data.storeName,
            store_slug: data.storeSlug,
            business_address: data.businessAddress,
            gstin: data.gstin || null,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return { error: signUpError };
      }
      return { error: null };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e.message);
      return { error: e };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSalesmanProfile(null);
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) {
        setError(resetError.message);
        return { error: resetError };
      }
      return { error: null };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e.message);
      return { error: e };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    salesmanProfile,
    role: profile?.role ?? null,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
    signIn,
    signUpCustomer,
    signUpSalesman,
    signOut,
    resetPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
