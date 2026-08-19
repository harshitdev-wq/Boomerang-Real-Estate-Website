import { ArrowRight } from "lucide-react";
import { scrollToSection } from "@/lib/router";
import BoomerangVideoBg from "./BoomerangVideoBg";

const ROWS = [
  { num: "01", label: "Browse", desc: "Curated listings", target: "browse" },
  { num: "02", label: "Explore", desc: "Maps & 3D tours", target: "explore" },
  { num: "03", label: "Connect", desc: "Talk to agents", target: "sell" },
];

export default function Hero() {
  return (
    <section className="relative flex flex-col items-center overflow-hidden min-h-screen">
      {/* Full-bleed boomerang video background */}
      <div className="absolute inset-0 z-0 origin-top scale-[1.15] overflow-hidden bg-[#F4F3F3]">
        <BoomerangVideoBg />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col items-center">
        {/* Hero copy */}
        <div className="pt-24 sm:pt-[6.5rem] md:pt-32 px-4 sm:px-6 text-center">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[1.1] tracking-tighter text-[#191919] font-normal">
            Build lasting
            <br />
            relationships.
          </h1>
          <p className="mx-auto mt-5 sm:mt-6 md:mt-8 max-w-sm sm:max-w-md text-sm md:text-base text-[#191919]/70 leading-relaxed">
            The real-estate platform for modern home buyers, renters, and agents — search verified
            listings, tour homes in 3D, and connect directly with the people who know them best.
          </p>
          <button
            onClick={() => scrollToSection("browse")}
            className="mt-6 sm:mt-8 md:mt-10 inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-[#191919] text-white text-sm font-medium rounded-lg hover:bg-[#191919]/90 transition-colors duration-200"
          >
            Browse Homes
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Bottom info panel */}
        <div className="mt-auto w-full max-w-5xl px-4 sm:px-6">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 border-b-0 pt-8 sm:pt-12 md:pt-16 px-5 sm:px-8 md:px-12 pb-0 shadow-sm">
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 lg:gap-16">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/50 font-medium">
                  What do we do?
                </p>
                <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-serif font-normal leading-tight tracking-tight text-[#191919]">
                  Homes that
                  <br className="hidden sm:block" />
                  build momentum
                </h2>
              </div>
              <div className="flex items-end">
                <p className="text-sm md:text-[15px] text-[#191919]/70 leading-relaxed">
                  A real-estate platform built for the modern market — curated listings, honest
                  search, maps and 3D tours that show the whole story, and agents one message away.
                </p>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 md:mt-10 h-px bg-gray-200 w-full" />

            <div className="grid sm:grid-cols-3 gap-2 sm:gap-3 pb-0">
              {ROWS.map((row) => (
                <button
                  key={row.num}
                  onClick={() => scrollToSection(row.target)}
                  className="group flex items-center justify-between bg-[#F4F3F3] hover:bg-[#eaeaea] transition-all duration-200 cursor-pointer px-4 sm:px-6 py-3.5 sm:py-4 text-left"
                >
                  <span className="flex items-center min-w-0">
                    <span className="text-sm text-[#191919]/40 tabular-nums">{row.num}</span>
                    <span className="mx-2 text-[#191919]/30">/</span>
                    <span className="text-sm sm:text-[15px] font-medium text-[#191919] whitespace-nowrap">
                      {row.label}
                    </span>
                    <span className="hidden sm:inline text-sm text-[#191919]/40 ml-3 truncate">
                      {row.desc}
                    </span>
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all duration-200" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
