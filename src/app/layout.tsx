import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ViClinic - Hệ Thống Quản Lý Lịch Khám Phòng Khám Đa Khoa',
  description: 'Hệ thống quản lý đặt lịch, ca trực bác sĩ và phân quyền y khoa chuyên nghiệp theo tiêu chuẩn FR & ERD ViClinic.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans flex flex-col">
        {children}
      </body>
    </html>
  );
}
