/**
 * Two-tone line icons in the LPL brand style (navy primary stroke, copper accent).
 * These are approximations of the LPL brand-deck icons; swap in the official
 * SVGs from the LPL@Work Brand page when available.
 *
 * Paths with class "p" use currentColor; class "a" uses --icon-accent. Both
 * inherit through <use>, so color is controlled from the <svg class="icon">.
 */

export type IconName =
  | "alert"
  | "exchange"
  | "pie"
  | "bar"
  | "search"
  | "time"
  | "dollar"
  | "arrow"
  | "doc"
  | "doc-ok"
  | "envelope"
  | "phone"
  | "idea"
  | "talk";

export function IconSprite() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <symbol id="i-alert" viewBox="0 0 24 24">
          <circle className="p" cx="12" cy="12" r="9.5" />
          <path className="a" d="M12 7v6.5M12 16.8v.2" />
        </symbol>
        <symbol id="i-exchange" viewBox="0 0 24 24">
          <path className="p" d="M3 8h17M16 4l4 4-4 4" />
          <path className="a" d="M21 16H4M8 12l-4 4 4 4" />
        </symbol>
        <symbol id="i-pie" viewBox="0 0 24 24">
          <path className="p" d="M11 4.5a8.5 8.5 0 1 0 8.5 8.5H11z" />
          <path className="a" d="M14 2.5A7.5 7.5 0 0 1 21.5 10H14z" />
        </symbol>
        <symbol id="i-bar" viewBox="0 0 24 24">
          <path className="p" d="M4 3v18M7 20V12h3v8M12 20V8h3v8M17 20V5h3v15" />
          <path className="a" d="M3 21h18" />
        </symbol>
        <symbol id="i-search" viewBox="0 0 24 24">
          <circle className="p" cx="10" cy="10" r="6.5" />
          <path className="a" d="M7 8.5a3.5 3.5 0 0 1 3-2.2" />
          <path className="p" d="M15 15l5.5 5.5" />
        </symbol>
        <symbol id="i-time" viewBox="0 0 24 24">
          <circle className="p" cx="12" cy="12" r="9.5" />
          <path className="a" d="M12 6.5V12h4.5" />
        </symbol>
        <symbol id="i-dollar" viewBox="0 0 24 24">
          <circle className="a" cx="12" cy="12" r="9.5" />
          <path
            className="p"
            d="M14.8 8.6c-.5-1-1.6-1.6-2.8-1.6-1.6 0-2.8.9-2.8 2.2 0 3 5.8 1.6 5.8 4.6 0 1.4-1.3 2.3-3 2.3-1.3 0-2.5-.6-3-1.7M12 5.5V7M12 16.1v1.6"
          />
        </symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24">
          <circle className="p" cx="12" cy="12" r="9.5" />
          <path className="a" d="M7.5 12h9M13 8.5l3.5 3.5-3.5 3.5" />
        </symbol>
        <symbol id="i-doc" viewBox="0 0 24 24">
          <path className="p" d="M9 3h9v18H6V6z M9 3v3H6" />
          <path className="a" d="M9 11h6M9 14.5h6M9 18h4" />
        </symbol>
        <symbol id="i-doc-ok" viewBox="0 0 24 24">
          <path className="p" d="M9 3h9v18H6V6z M9 3v3H6" />
          <path className="a" d="M9 13.5l2.2 2.2L15.5 11" />
        </symbol>
        <symbol id="i-envelope" viewBox="0 0 24 24">
          <rect className="p" x="3" y="6" width="18" height="12" />
          <path className="a" d="M3 6l9 7 9-7" />
        </symbol>
        <symbol id="i-phone" viewBox="0 0 24 24">
          <path
            className="p"
            d="M9 3.5H7.5C6 3.5 5 6 5 12s1 8.5 2.5 8.5H9l.5-4.5-2-1c-.3-2-.3-4 0-6l2-1z"
          />
          <path className="a" d="M13 9c1 1.8 1 4.2 0 6M16 7c2 3 2 7 0 10" />
        </symbol>
        <symbol id="i-idea" viewBox="0 0 24 24">
          <path
            className="p"
            d="M9 17.5h6M10 20.5h4M12 6.5a5 5 0 0 0-3 9v2h6v-2a5 5 0 0 0-3-9z"
          />
          <path
            className="a"
            d="M12 2v1.8M4.5 5l1.3 1.3M19.5 5l-1.3 1.3M2.5 11.5h1.8M19.7 11.5h1.8"
          />
        </symbol>
        <symbol id="i-talk" viewBox="0 0 24 24">
          <path className="p" d="M3 4h15v10H9l-4 4v-4H3z" />
          <path
            className="a"
            d="M7.5 9h.1M10.5 9h.1M13.5 9h.1M18 8h3v10h-2v3l-3-3h-5v-2"
          />
        </symbol>
      </defs>
    </svg>
  );
}

type IconProps = {
  name: IconName;
  size?: "md" | "lg";
  /** White primary + light copper accent, for navy backgrounds. */
  onDark?: boolean;
  className?: string;
};

/** Decorative icon; always aria-hidden. Put accessible text on the parent. */
export function Icon({ name, size = "md", onDark, className = "" }: IconProps) {
  return (
    <svg
      className={`icon ${size === "lg" ? "icon-lg" : ""} ${
        onDark ? "icon-on-dark" : ""
      } ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`#i-${name}`} />
    </svg>
  );
}

/** LPL-style mark (approximation; replace with the official logo SVG). */
export function LplMark() {
  return (
    <svg className="lpl-mark" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M4 2h22v24h-6V8H4z M11 11h6v15h-6z M4 19h5v7H4z" />
    </svg>
  );
}

/** Navy blocks with copper chevrons, from the LPL title slide. */
export function HeroChevrons() {
  return (
    <svg
      className="hero-chevrons"
      viewBox="0 0 190 260"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="hero-chevron-clip">
          <rect x="0" y="0" width="190" height="260" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width="190" height="130" fill="#2e4374" />
      <rect x="0" y="130" width="190" height="130" fill="#0a1f5c" />
      <g
        stroke="#a6531e"
        strokeWidth="2.2"
        fill="none"
        clipPath="url(#hero-chevron-clip)"
      >
        <path d="M-30 -20 L120 130 L-30 280" />
        <path d="M30 -20 L180 130 L30 280" />
        <path d="M90 -20 L240 130 L90 280" />
        <path d="M150 -20 L300 130 L150 280" />
      </g>
    </svg>
  );
}

/** Copper chevron stripe for the navy drawer header. */
export function HeaderStripe() {
  return (
    <svg
      className="drawer-stripe"
      viewBox="0 0 120 120"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="#a6531e" strokeWidth="2" fill="none">
        <path d="M-30 -30 L60 60 L-30 150" />
        <path d="M5 -30 L95 60 L5 150" />
        <path d="M40 -30 L130 60 L40 150" />
      </g>
    </svg>
  );
}
