import React, { createContext, useContext, useEffect, useState } from "react";
import { appClient } from "@/api/appClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    const currentUser = await appClient.auth.me();
    setUser(currentUser);
    setIsLoadingAuth(false);
    return currentUser;
  };

  useEffect(() => {
    checkUserAuth().catch(() => setIsLoadingAuth(false));
  }, []);

  const logout = () => appClient.auth.logout();
  const navigateToLogin = () => appClient.auth.redirectToLogin();

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError: null,
        appPublicSettings: { auth_required: false },
        authChecked: true,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState: checkUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
