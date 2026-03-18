import type { Metadata } from "next";
import "./globals.css";

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
        <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-xs font-bold">
                A
              </div>
              <span className="font-semibold text-white">A2A Agent Registry</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-gray-400">
              <a href="/" className="hover:text-white transition-colors">
                Explore
              </a>
              <a href="/register" className="hover:text-white transition-colors">
                Register Agent
              </a>
              <a href="/a2a" className="hover:text-white transition-colors">
                A2A Interface
              </a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-gray-800 mt-24 py-8 text-center text-sm text-gray-600">
          A2A Agent Registry — built on the{" "}
          <a
            href="https://google.github.io/A2A"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300"
          >
            A2A Protocol
          </a>
        </footer>
      </body>
    </html>
  );
}
