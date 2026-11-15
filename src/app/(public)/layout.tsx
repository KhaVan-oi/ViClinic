import "./landing.css";
import React from "react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeaderClient } from "@/components/public-header.client";
import { getCurrentSession } from "@/server/session";
import { projectSessionView } from "@/modules/identity/authentication";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  return (
    <div className="min-h-screen flex flex-col bg-[#F3F8FA] text-[#0B2545]">

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-[#0A6E63] focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Chuyển đến nội dung chính
      </a>
      <PublicHeaderClient session={session ? projectSessionView(session) : null} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
