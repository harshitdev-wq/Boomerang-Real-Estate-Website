import type { ReactNode } from "react";
import { StoreProvider, useStore } from "@/context/StoreContext";
import { navigate, useHashRoute } from "@/lib/router";
import Navbar from "@/components/Navbar";
import CompareDrawer from "@/components/CompareDrawer";
import { AuthModal } from "@/components/Modals";
import Logo from "@/components/Logo";
import HomePage from "@/pages/HomePage";
import BrowsePage from "@/pages/BrowsePage";
import PropertyPage from "@/pages/PropertyPage";
import ComparePage from "@/pages/ComparePage";
import DashboardPage from "@/pages/DashboardPage";
import ListingForm from "@/pages/ListingForm";
import AdminPanel from "@/pages/AdminPanel";
import ApiDocsPage from "@/pages/ApiDocsPage";

function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex w-[calc(100%-2rem)] max-w-xs flex-col gap-2 sm:w-auto">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={`br-toast-in cursor-pointer rounded-xl px-4 py-3 text-left text-sm font-medium text-white shadow-xl transition-opacity hover:opacity-90 ${
            t.tone === "error" ? "bg-red-600" : t.tone === "success" ? "bg-emerald-600" : "bg-[#191919]"
          }`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}

function Footer() {
  const { user } = useStore();
  const link = "text-sm text-[#191919]/55 hover:text-[#191919] transition-colors duration-200";
  return (
    <footer id="about" className="scroll-mt-24 border-t border-gray-200 bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-14 py-14 md:py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
              <Logo className="h-6 w-6 text-[#191919]" />
              <span className="text-base font-semibold tracking-tight text-[#191919]">Boomerang</span>
            </button>
            <p className="mt-5 font-serif text-2xl tracking-tight text-[#191919]">Build lasting relationships.</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#191919]/55">
              The real-estate platform for modern home buyers, renters, and agents — search, tour in 3D,
              compare, and connect.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#191919]/40">Explore</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <button onClick={() => navigate("/browse")} className={`${link} text-left`}>Browse homes</button>
              <button onClick={() => navigate("/browse?view=map")} className={`${link} text-left`}>Map search</button>
              <button onClick={() => navigate("/compare")} className={`${link} text-left`}>Compare</button>
              <button onClick={() => navigate(user ? "/dashboard?tab=saved" : "/")} className={`${link} text-left`}>
                {user ? "Saved homes" : "Sign in"}
              </button>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#191919]/40">For agents</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <button onClick={() => navigate("/new")} className={`${link} text-left`}>List a property</button>
              <button onClick={() => navigate("/dashboard?tab=listings")} className={`${link} text-left`}>My listings</button>
              <button onClick={() => navigate("/dashboard?tab=inquiries")} className={`${link} text-left`}>Inquiries</button>
              <button onClick={() => navigate("/dashboard?tab=visits")} className={`${link} text-left`}>Visit requests</button>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#191919]/40">Platform</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <button onClick={() => navigate("/docs")} className={`${link} text-left`}>API documentation</button>
              <button onClick={() => navigate("/admin")} className={`${link} text-left`}>Admin console</button>
              <button onClick={() => navigate("/")} className={`${link} text-left`}>About Boomerang</button>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#191919]/40">© 2026 Boomerang. All rights reserved.</p>
          <p className="max-w-md text-[11px] leading-relaxed text-[#191919]/35">
            Demo environment: every listing, agent, inquiry and statistic is sample data and is marked
            “Demo” wherever shown. No real listings are presented.
          </p>
        </div>
      </div>
    </footer>
  );
}

function Shell() {
  const route = useHashRoute();
  const { ready } = useStore();

  let page: ReactNode;
  switch (route.path) {
    case "/browse":
      page = <BrowsePage />;
      break;
    case "/property":
      page = <PropertyPage key={route.params.id ?? ""} />;
      break;
    case "/compare":
      page = <ComparePage />;
      break;
    case "/dashboard":
      page = <DashboardPage />;
      break;
    case "/new":
      page = <ListingForm key={route.query.get("edit") ?? "new"} />;
      break;
    case "/admin":
      page = <AdminPanel />;
      break;
    case "/docs":
      page = <ApiDocsPage />;
      break;
    default:
      page = <HomePage />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {ready ? (
        page
      ) : (
        <div className="flex min-h-screen items-center justify-center text-sm text-[#191919]/50">
          Preparing your market…
        </div>
      )}
      <Footer />
      <CompareDrawer />
      <AuthModal />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
