import { parsePhoneNumberFromString } from "libphonenumber-js";
import { DomainError } from "@/lib/errors";

import { z } from "zod";
import { MIN_BIRTH_DATE_ISO } from "@/config/business";
import { formatClinicIsoDate, isValidIsoDate } from "./dates";

export const fullNameSchema = z.string().trim()
  .min(2, "Họ và tên phải có ít nhất 2 ký tự.")
  .max(120, "Họ và tên không vượt quá 120 ký tự.");

export const birthDateSchema = z.string().trim().refine(
  date => isValidIsoDate(date) && date >= MIN_BIRTH_DATE_ISO && date <= formatClinicIsoDate(new Date()),
  "Ngày sinh phải từ 01/01/1900 đến hôm nay.",
);

export const optionalEmailSchema = z.string().trim()
  .email("Địa chỉ email không hợp lệ.")
  .max(120, "Email không vượt quá 120 ký tự.")
  .optional().or(z.literal(""));

const VN_LOCAL_PHONE_REGEX = /^0\d{9}$/;

export function normalizeVietnamPhone(input: string): string {
  const cleaned = input.trim().replace(/[\s.\-()]/g, "");
  if (VN_LOCAL_PHONE_REGEX.test(cleaned)) {
    return cleaned;
  }
  const parsed = parsePhoneNumberFromString(cleaned, "VN");
  if (parsed && parsed.country === "VN") {
    const national = `0${parsed.nationalNumber}`;
    if (VN_LOCAL_PHONE_REGEX.test(national)) {
      return national;
    }
  }
  const national = cleaned.replace(/^\+?84(?=\d{9}$)/, "0");
  if (VN_LOCAL_PHONE_REGEX.test(national)) return national;
  throw new DomainError(
    "VALIDATION_ERROR",
    "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại 10 chữ số (ví dụ: 0908000206)."
  );
}
