import { API_DOCS } from "@/services/api";
import { Shield } from "@/components/Icons";

const AUTH_TONES: Record<string, string> = {
  public: "bg-gray-100 text-[#191919]/50",
  user: "bg-emerald-50 text-emerald-700",
  agent: "bg-blue-50 text-blue-700",
  admin: "bg-amber-50 text-amber-700",
  owner: "bg-violet-50 text-violet-700",
};

const METHOD_TONES: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700",
  POST: "bg-blue-50 text-blue-700",
  PUT: "bg-amber-50 text-amber-700",
  DELETE: "bg-red-50 text-red-600",
};

export default function ApiDocsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 pt-24 sm:pt-28 pb-24">
      <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-[#191919]">API reference</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#191919]/55">
        The complete REST contract implemented by the platform's service layer. Every handler validates
        input server-side, enforces role-based authorization, applies rate limits and returns proper
        status codes — 400 invalid input · 401 unauthenticated · 403 forbidden · 404 missing · 409
        conflict · 429 rate limited · 500 internal.
      </p>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-[#F4F3F3] p-4">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#191919]/50" />
        <p className="text-xs leading-relaxed text-[#191919]/60">
          In this static deployment the service layer runs in-browser (see{" "}
          <code className="rounded bg-white px-1 py-0.5">src/services/api.ts</code>). Production maps the
          identical contract to a server — same routes, payloads, status codes and authorization checks —
          with the database moved to PostgreSQL. Swagger/OpenAPI generation can be added directly from
          this contract.
        </p>
      </div>

      <div className="mt-8 space-y-2">
        {API_DOCS.map((d) => (
          <div
            key={`${d.method}-${d.path}`}
            className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="flex shrink-0 items-center gap-2 sm:w-64">
              <span className={`w-16 rounded-md px-1.5 py-1 text-center text-[10px] font-bold ${METHOD_TONES[d.method]}`}>
                {d.method}
              </span>
              <code className="min-w-0 truncate text-xs font-medium text-[#191919]">{d.path}</code>
            </div>
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-[#191919]/60">{d.summary}</p>
            <span className={`shrink-0 self-start rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:self-center ${AUTH_TONES[d.auth] ?? AUTH_TONES.public}`}>
              {d.auth}
            </span>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-serif text-2xl text-[#191919]">Recommendation algorithm (v1)</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Location", "30%"],
          ["Price", "25%"],
          ["Property type", "20%"],
          ["Area", "15%"],
          ["Bedrooms", "10%"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className="text-xl font-semibold tracking-tight text-[#191919]">{v}</p>
            <p className="mt-1 text-xs text-[#191919]/50">{k}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 max-w-2xl text-xs leading-relaxed text-[#191919]/50">
        Each dimension scores 0–1 and the weighted sum ranks candidates. Every suggestion ships with
        human-readable reasons (“Same city”, “Price within 8%”) so the system is fully explainable —
        implementation in <code className="rounded bg-[#F4F3F3] px-1 py-0.5">src/lib/similarity.ts</code>.
      </p>
    </div>
  );
}
