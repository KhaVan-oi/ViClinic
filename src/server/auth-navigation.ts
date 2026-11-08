import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const PHONE_COOKIE = "viclinic-auth-phone";

export async function readAuthPhone(): Promise<string> {
  return (await cookies()).get(PHONE_COOKIE)?.value ?? "";
}

export async function redirectAuthPath(destination: string): Promise<never> {
  const target = new URL(destination, "http://viclinic.invalid");
  const phone = target.searchParams.get("phone");
  if (phone !== null) {
    (await cookies()).set(PHONE_COOKIE, phone.slice(0, 32), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 600,
    });
    target.searchParams.delete("phone");
  }
  redirect(target.pathname + target.search);
}
