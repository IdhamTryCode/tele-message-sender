import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-inline' is required here: Next.js App Router injects
              // inline scripts for RSC hydration data on every page,
              // including prerendered/static ones. The stricter
              // alternative (nonce-based CSP) forces every page into
              // dynamic rendering — not worth the tradeoff for an app with
              // no user-controlled HTML/script injection surface (all
              // inputs are rendered as plain text, never dangerouslySet).
              // 'unsafe-eval' is added only in dev: React's dev mode uses
              // eval() to reconstruct server-side error stacks in the
              // browser. Neither React nor Next.js use eval() in
              // production, so this never applies to what Vercel serves.
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              // blob: is required for the report form's image preview,
              // which uses URL.createObjectURL(file) on the user's
              // locally-selected image before it's ever uploaded.
              "img-src 'self' data: blob:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
