"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@/types/auth";
import {
  getCurrentUser,
  login as appwriteLogin,
  logout as appwriteLogout,
  createAccount as appwriteCreateAccount,
  updateUserSyncPreference,
  syncSubjectsToCloud,
  ENABLE_CLOUD_FEATURES,
} from "@/lib/appwrite";
import { getSubjectsFromStorage as getLocalSubjects } from "@/utils/storageUtils";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isOffline: boolean;
  cloudFeaturesEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateSyncPreference: (syncEnabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [networkErrorCount, setNetworkErrorCount] = useState(0);

  // Check network status
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      // Set initial state
      setIsOffline(!navigator.onLine);

      // Add event listeners
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        if (ENABLE_CLOUD_FEATURES) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch (error: any) {
        console.error("Error checking user:", error);

        if (error.message && error.message.includes("NetworkError")) {
          setNetworkErrorCount((prev) => prev + 1);

          // If we've had multiple network errors, assume we're offline
          if (networkErrorCount > 2) {
            setIsOffline(true);
          }
        }

        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, [networkErrorCount]);

  const login = async (email: string, password: string) => {
    if (!ENABLE_CLOUD_FEATURES) {
      throw new Error("Cloud features are disabled");
    }

    setIsLoading(true);

    // Check if offline
    if (isOffline) {
      setIsLoading(false);
      throw new Error(
        "Cannot log in while offline. Please check your internet connection and try again."
      );
    }

    try {
      await appwriteLogin(email, password);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // Always attempt to sync local data on login if cloud features are enabled
      try {
        const localSubjects = getLocalSubjects(currentUser.id);
        if (localSubjects.length > 0) {
          const syncResult = await syncSubjectsToCloud(
            currentUser.id,
            localSubjects
          );
          if (!syncResult) {
            console.error("Failed to sync subjects to cloud");
          }
        }
      } catch (error) {
        console.error("Failed to sync local data:", error);
        throw new Error(
          "Failed to sync data with cloud. Please try again later."
        );
      }
    } catch (error: any) {
      console.error("Error logging in:", error);

      // Enhance error message for network issues
      if (error.message && error.message.includes("NetworkError")) {
        setNetworkErrorCount((prev) => prev + 1);
        setIsOffline(true);
        throw new Error(
          "Network error. The app will work in offline mode with local storage."
        );
      } else {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    if (!ENABLE_CLOUD_FEATURES) {
      throw new Error("Cloud features are disabled");
    }

    setIsLoading(true);

    // Check if offline
    if (isOffline) {
      setIsLoading(false);
      throw new Error(
        "Cannot sign up while offline. Please check your internet connection and try again."
      );
    }

    try {
      await appwriteCreateAccount(email, password, name);
      await appwriteLogin(email, password);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error: any) {
      console.error("Error signing up:", error);

      // Enhance error message for network issues
      if (error.message && error.message.includes("NetworkError")) {
        setNetworkErrorCount((prev) => prev + 1);
        setIsOffline(true);
        throw new Error(
          "Network error. The app will work in offline mode with local storage."
        );
      } else {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (!ENABLE_CLOUD_FEATURES) {
      setUser(null);
      return;
    }

    setIsLoading(true);
    try {
      // Even if offline, we can still "log out" locally
      if (isOffline) {
        setUser(null);
      } else {
        await appwriteLogout();
        setUser(null);
      }
    } catch (error: any) {
      console.error("Error logging out:", error);

      // If there's a network error, we can still log out locally
      if (error.message && error.message.includes("NetworkError")) {
        setNetworkErrorCount((prev) => prev + 1);
        setUser(null);
      } else {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateSyncPreference = async (syncEnabled: boolean) => {
    if (!ENABLE_CLOUD_FEATURES || !user) {
      throw new Error("Cloud features are disabled or user not logged in");
    }

    // Check if offline
    if (isOffline) {
      throw new Error(
        "Cannot update sync preferences while offline. Please check your internet connection and try again."
      );
    }

    try {
      await updateUserSyncPreference(user.id, syncEnabled);
      setUser({ ...user, syncEnabled });

      // Dispatch an event to notify other components about the sync preference change
      window.dispatchEvent(
        new CustomEvent("syncPreferenceChanged", {
          detail: { syncEnabled },
        })
      );
    } catch (error: any) {
      console.error("Error updating sync preference:", error);

      // Enhance error message for network issues
      if (error.message && error.message.includes("NetworkError")) {
        setNetworkErrorCount((prev) => prev + 1);
        throw new Error(
          "Network error. Please check your internet connection and try again."
        );
      } else {
        throw error;
      }
    }
  };

  const value = {
    user,
    isLoading,
    isOffline,
    cloudFeaturesEnabled: ENABLE_CLOUD_FEATURES,
    login,
    signup,
    logout,
    updateSyncPreference,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
