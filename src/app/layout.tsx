import { type Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const beVietnamPro = localFont({
  src: [
    { path: "../../public/fonts/BeVietnamPro-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/BeVietnamPro-Medium.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/BeVietnamPro-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/BeVietnamPro-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Phòng khám Đa khoa ViClinic",
  description:
    "Chọn dịch vụ, bác sĩ và đặt lịch khám trực tuyến tại ViClinic.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={beVietnamPro.variable}
    >
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
