import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "alumni-connect-token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    api.get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback((token, nextUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(nextUser);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut, setUser }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
