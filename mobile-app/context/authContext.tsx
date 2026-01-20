// src/context/authContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearTokens,
  fetchMeAuthed,
  getSavedRole,
  getSavedUser,
  getTokens,
  loginRequest,
  MeResponse,
  UserRole,
  saveUserAndRole,
} from "../api/auth";

type AuthContextValue = {
  isHydrating: boolean;
  isLoggedIn: boolean;

  accessToken: string | null;
  role: UserRole | null;
  user: MeResponse | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isHydrating, setIsHydrating] = useState(true);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<MeResponse | null>(null);

  const isLoggedIn = !!accessToken;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const t = await getTokens();
        const savedUser = await getSavedUser();
        const savedRole = await getSavedRole();

        if (!mounted) return;

        setAccessToken(t.accessToken ?? null);
        setUser(savedUser);
        setRole(savedRole);

        // opcionalno: ako imamo token, osveži /me (da role bude tačan)
        if (t.accessToken) {
          const me = await fetchMeAuthed();
          if (me && mounted) {
            setUser(me);
            setRole(me.role ?? savedRole ?? null);
            await saveUserAndRole(me);
          }
        }
      } finally {
        if (mounted) setIsHydrating(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { access, user } = await loginRequest(email, password);
    setAccessToken(access);
    setUser(user ?? null);
    setRole(user?.role ?? null);
  };

  const logout = async () => {
    await clearTokens();
    setAccessToken(null);
    setUser(null);
    setRole(null);
  };

  const refreshMe = async () => {
    const me = await fetchMeAuthed();
    setUser(me);
    setRole(me?.role ?? null);
    await saveUserAndRole(me);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrating,
      isLoggedIn,
      accessToken,
      role,
      user,
      login,
      logout,
      refreshMe,
    }),
    [isHydrating, isLoggedIn, accessToken, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
