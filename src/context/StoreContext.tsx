import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, type SafeUser } from "@/services/api";
import { ensureReady } from "@/services/db";
import { MAX_COMPARE, type Role } from "@/lib/types";

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "success" | "error";
}

export type AuthMode = "signin" | "register" | "reset" | null;

interface StoreValue {
  ready: boolean;
  user: SafeUser | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (input: { name: string; email: string; password: string; phone: string; role: Role }) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshUser: () => void;
  favorites: string[];
  toggleFavorite: (propertyId: string) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  toasts: Toast[];
  toast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  authMode: AuthMode;
  setAuthMode: (m: AuthMode) => void;
  requireAuth: () => boolean;
  requireRole: (roles: Role[]) => boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

const COMPARE_KEY = "boomerang.compare.v1";

function loadCompare(): string[] {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>(loadCompare);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const toastId = useRef(0);

  const toast = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await ensureReady();
      if (!alive) return;
      setUser(api.auth.me());
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }
    let alive = true;
    api.favorites.list().then((res) => {
      if (alive && res.ok) setFavorites(res.data.map((p) => p.id));
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const res = await api.auth.login(email, password);
      if (!res.ok) return res.error.message;
      setUser(res.data);
      toast(`Welcome back, ${res.data.name.split(" ")[0]}.`, "success");
      return null;
    },
    [toast],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone: string; role: Role }): Promise<string | null> => {
      const res = await api.auth.register(input);
      if (!res.ok) return res.error.message;
      setUser(res.data);
      toast(`Welcome to Boomerang, ${res.data.name.split(" ")[0]}.`, "success");
      return null;
    },
    [toast],
  );

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
    setFavorites([]);
    toast("Signed out.", "info");
  }, [toast]);

  const refreshUser = useCallback(() => setUser(api.auth.me()), []);

  const toggleFavorite = useCallback(
    (propertyId: string) => {
      if (!user) {
        toast("Sign in to save homes to your favorites.", "info");
        setAuthMode("signin");
        return;
      }
      const isFav = favorites.includes(propertyId);
      setFavorites((prev) => (isFav ? prev.filter((x) => x !== propertyId) : [propertyId, ...prev]));
      (isFav ? api.favorites.remove(propertyId) : api.favorites.add(propertyId)).then((res) => {
        if (!res.ok) {
          setFavorites((prev) => (isFav ? [propertyId, ...prev] : prev.filter((x) => x !== propertyId)));
          if (res.error.status !== 409) toast(res.error.message, "error");
        } else if (!isFav) {
          toast("Saved to favorites.", "success");
        }
      });
    },
    [user, favorites, toast],
  );

  const toggleCompare = useCallback(
    (id: string) => {
      setCompareIds((prev) => {
        if (prev.includes(id)) {
          const next = prev.filter((x) => x !== id);
          try {
            localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        }
        if (prev.length >= MAX_COMPARE) {
          toast(`You can compare up to ${MAX_COMPARE} homes at once.`, "info");
          return prev;
        }
        const next = [...prev, id];
        try {
          localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        toast("Added to comparison.", "success");
        return next;
      });
    },
    [toast],
  );

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    try {
      localStorage.removeItem(COMPARE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const requireAuth = useCallback((): boolean => {
    if (user) return true;
    toast("Sign in to continue.", "info");
    setAuthMode("signin");
    return false;
  }, [user, toast]);

  const requireRole = useCallback(
    (roles: Role[]): boolean => {
      if (!user) {
        toast("Sign in to continue.", "info");
        setAuthMode("signin");
        return false;
      }
      if (!roles.includes(user.role)) {
        toast(roles.length === 1 && roles[0] === "admin" ? "This area is for administrators only." : "This area is for agents and administrators.", "error");
        return false;
      }
      return true;
    },
    [user, toast],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      user,
      login,
      register,
      logout,
      refreshUser,
      favorites,
      toggleFavorite,
      compareIds,
      toggleCompare,
      clearCompare,
      toasts,
      toast,
      dismissToast,
      authMode,
      setAuthMode,
      requireAuth,
      requireRole,
    }),
    [ready, user, login, register, logout, refreshUser, favorites, toggleFavorite, compareIds, toggleCompare, clearCompare, toasts, toast, dismissToast, authMode, requireAuth, requireRole],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
