/** SĐT nội địa VN (lưu trong USERS.phone): 0 + 9-10 chữ số. */
export const VN_PHONE_REGEX = /^0\d{9,10}$/;

/** Supabase Auth lưu số dạng E.164 không dấu '+': 0922000001 -> 84922000001. */
export function toE164(phone: string): string {
  return `84${phone.slice(1)}`;
}
