"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  { image: "/images/landing/family-care.png", alt: "Bác sĩ đồng hành cùng gia đình", title: "Đặt lịch khám tại ViClinic", description: "Chọn dịch vụ, bác sĩ và giờ khám phù hợp.", label: "Đặt lịch khám" },
  { image: "/images/landing/senior-care.png", alt: "Bác sĩ tư vấn lịch khám cho người lớn tuổi", title: "Lịch khám của bạn, trong một nơi", description: "Xem xác nhận và những cập nhật về lịch hẹn trong tài khoản của bạn.", label: "Xem lịch hẹn" },
] as const;

export function ClinicIntro({ bookingHref, appointmentsHref }: { bookingHref: string; appointmentsHref: string }) {
  const [slide, setSlide] = useState(0);
  return <section className="clinic-intro" aria-roledescription="băng chuyền" aria-label="Giới thiệu ViClinic">
    <div className="clinic-intro-stage">{slides.map((item, index) => <div key={item.image} className={`clinic-intro-panel ${slide === index ? "is-active" : ""}`} aria-hidden={slide !== index} inert={slide !== index}>
      <div className="clinic-intro-media"><Image className="clinic-intro-image" src={item.image} alt={item.alt} fill priority={index === 0} sizes="(max-width: 767px) 200vw, 100vw" /></div>
      <div className="clinic-intro-copy">{index === 0 ? <h1>{item.title}</h1> : <h2>{item.title}</h2>}<p>{item.description}</p><Link href={index === 0 ? bookingHref : appointmentsHref} className="public-primary">{item.label}</Link></div>
    </div>)}</div>
    <div className="clinic-intro-controls"><button type="button" aria-label="Nội dung trước" onClick={() => setSlide((slide + slides.length - 1) % slides.length)}><ChevronLeft aria-hidden="true" /></button><button type="button" aria-label="Nội dung tiếp theo" onClick={() => setSlide((slide + 1) % slides.length)}><ChevronRight aria-hidden="true" /></button></div>
  </section>;
}
