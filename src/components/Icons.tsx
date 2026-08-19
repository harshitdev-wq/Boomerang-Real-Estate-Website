import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function S({ children, ...rest }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Heart = ({ filled, ...rest }: P & { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

export const Search = (p: P) => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </S>
);

export const MapPin = (p: P) => (
  <S {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </S>
);

export const Bed = (p: P) => (
  <S {...p}>
    <path d="M2 9V5a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v4" />
    <path d="M2 14V9h20v5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1" />
    <path d="M6 15v4" />
    <path d="M18 15v4" />
    <path d="M2 19h20" />
  </S>
);

export const Bath = (p: P) => (
  <S {...p}>
    <path d="M3 12h18a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-2a1 1 0 0 1 1-1Z" />
    <path d="M6 12V5a2 2 0 0 1 2-2h1" />
    <path d="M7 21l1-2" />
    <path d="M17 21l-1-2" />
  </S>
);

export const Car = (p: P) => (
  <S {...p}>
    <path d="M5 11 6.5 6.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
    <path d="M3 16v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3" />
    <path d="M4 16h16v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
    <circle cx="7" cy="16" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="17" cy="16" r="1.2" fill="currentColor" stroke="none" />
  </S>
);

export const Ruler = (p: P) => (
  <S {...p}>
    <path d="M3 8 8 3l13 13-5 5L3 8Z" />
    <path d="m9 8 1.5 1.5M12.5 11.5 14 13M16 15l1.5 1.5" />
  </S>
);

export const X = (p: P) => (
  <S {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </S>
);

export const Check = (p: P) => (
  <S {...p}>
    <path d="m4 12.5 5 5L20 6.5" />
  </S>
);

export const ChevronLeft = (p: P) => (
  <S {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </S>
);

export const ChevronRight = (p: P) => (
  <S {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </S>
);

export const Share = (p: P) => (
  <S {...p}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </S>
);

export const Play = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M7 4.5v15l13-7.5Z" />
  </svg>
);

export const Alert = (p: P) => (
  <S {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </S>
);

export const Shield = (p: P) => (
  <S {...p}>
    <path d="M12 2 4 5.5v5.6c0 5 3.4 9 8 10.9 4.6-1.9 8-5.9 8-10.9V5.5Z" />
    <path d="m9 11.5 2 2 4-4" />
  </S>
);

export const UserIcon = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </S>
);

export const LogOut = (p: P) => (
  <S {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </S>
);

export const Plus = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

export const Calendar = (p: P) => (
  <S {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </S>
);

export const Clock = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </S>
);

export const Mail = (p: P) => (
  <S {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </S>
);

export const Phone = (p: P) => (
  <S {...p}>
    <path d="M6.6 3h2.2a1 1 0 0 1 1 .8l.8 3.4a1 1 0 0 1-.3 1L8.7 9.7a13.7 13.7 0 0 0 5.6 5.6l1.5-1.6a1 1 0 0 1 1-.3l3.4.8a1 1 0 0 1 .8 1v2.2a2 2 0 0 1-2 2A17.9 17.9 0 0 1 4.6 5a2 2 0 0 1 2-2Z" />
  </S>
);

export const Building = (p: P) => (
  <S {...p}>
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" />
  </S>
);

export const Filter = (p: P) => (
  <S {...p}>
    <path d="M3 5h18l-7 8v5l-4 2v-7Z" />
  </S>
);

export const Grid = (p: P) => (
  <S {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1" />
  </S>
);

export const MapIcon = (p: P) => (
  <S {...p}>
    <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
    <path d="M9 3v15M15 6v15" />
  </S>
);

export const Eye = (p: P) => (
  <S {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </S>
);

export const Flag = (p: P) => (
  <S {...p}>
    <path d="M5 21V4" />
    <path d="M5 4h12l-2 4 2 4H5" />
  </S>
);

export const Edit = (p: P) => (
  <S {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </S>
);

export const Trash = (p: P) => (
  <S {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
    <path d="M10 11v6M14 11v6" />
  </S>
);

export const ExternalLink = (p: P) => (
  <S {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
  </S>
);

export const Home = (p: P) => (
  <S {...p}>
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
    <path d="M9 21v-6h6v6" />
  </S>
);

export const Sparkle = (p: P) => (
  <S {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" />
  </S>
);

export const Loader = ({ className }: { className?: string }) => (
  <span
    className={`inline-block h-4 w-4 rounded-full border-2 border-[#191919]/20 border-t-[#191919] br-spinner ${className ?? ""}`}
    aria-hidden="true"
  />
);
