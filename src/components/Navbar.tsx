import { useStore } from "@/context/StoreContext";
import { navigate, scrollToSection } from "@/lib/router";
import { initials } from "@/lib/utils";
import Logo from "./Logo";
import { LogOut } from "./Icons";

const LINKS = [
  { label: "Browse", go: () => navigate("/browse") },
  { label: "Explore", go: () => scrollToSection("explore") },
  { label: "Sell", go: () => scrollToSection("sell") },
  { label: "About", go: () => scrollToSection("about") },
];

export default function Navbar() {
  const { user, setAuthMode, logout } = useStore();

  const listProperty = () => {
    if (user) navigate("/new");
    else setAuthMode("signin");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="flex items-center justify-between px-6 sm:px-10 md:px-14 py-4 sm:py-5">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5" aria-label="Boomerang home">
          <Logo className="h-6 w-6 text-[#191919]" />
          <span className="text-base font-semibold tracking-tight text-[#191919]">Boomerang</span>
        </button>

        <div className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <button
              key={l.label}
              onClick={l.go}
              className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200"
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <>
              {user.role === "admin" && (
                <button
                  onClick={() => navigate("/admin")}
                  className="hidden sm:block text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200"
                >
                  Admin
                </button>
              )}
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4F3F3] text-[11px] font-semibold text-[#191919]">
                  {initials(user.name)}
                </span>
                <span className="hidden sm:inline max-w-[90px] truncate">{user.name.split(" ")[0]}</span>
              </button>
              <button
                onClick={() => void logout()}
                aria-label="Sign out"
                className="text-[#191919]/60 hover:text-[#191919] transition-colors duration-200 p-1"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setAuthMode("signin")}
              className="text-sm font-medium text-[#191919]/80 hover:text-[#191919] transition-colors duration-200"
            >
              Sign In
            </button>
          )}
          <button
            onClick={listProperty}
            className="px-5 py-2.5 bg-[#191919] text-white text-sm font-medium rounded-lg hover:bg-[#191919]/90 transition-colors duration-200"
          >
            List A Property
          </button>
        </div>
      </nav>
    </header>
  );
}
