import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { NavLinks } from "@/components/NavLinks";

export const metadata: Metadata = {
  title: "A2A Agent Registry",
  description:
    "Discover and register A2A protocol-compatible agents. Search, browse, and curate the growing ecosystem of AI agents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <header
          role="banner"
          className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50"
        >
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <Link
              href="/"
              aria-label="A2A Agent Registry — home"
              className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
            >
              <div
                aria-hidden="true"
                className="w-7 h-7 rounded-lg bg-indigo-500 group-hover:bg-indigo-400 transition-colors flex items-center justify-center text-xs font-bold"
              >
                A
              </div>
              <span className="font-semibold text-white group-hover:text-indigo-200 transition-colors">
                A2A Agent Registry
              </span>
            </Link>
            <NavLinks />
          </div>
        </header>

        <main id="main-content" tabIndex={-1}>
          {children}
        </main>

        <footer role="contentinfo" className="border-t border-gray-800 mt-24 py-8 text-center text-sm text-gray-600">
          <p>
            A2A Agent Registry — built on the{" "}
            <a
              href="https://google.github.io/A2A"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
            >
              A2A Protocol
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
