"use server";

import { redirectAuthPath } from "@/server/auth-navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isDomainError } from "@/lib/errors";
import { createAuthSession, getCurrentSession } from "@/server/session";
import { createAuthProofToken, verifyAuthProofToken, verifyReactivationLoginProof, REACTIVATION_LOGIN_COOKIE_NAME } from "@/modules/identity/proof";
import { normalizeVietnamPhone } from "@/lib/profile";
import { resolvePostAuthDestination, sanitizeNextRedirect } from "@/lib/navigation";
import { verifyPasswordRecoveryOtp, completePasswordRecoveryWithProof, completeReactivation, login, resendReactivationOtp, startPasswordRecovery } from "@/modules/identity/authentication";
import { completePatientRegistration, completeStaffActivationWithProof, startPatientRegistration, startStaffActivation } from "@/modules/identity/registration";
import { REGISTRATION_PROOF_COOKIE_NAME, REGISTRATION_PROOF_TTL_SECONDS, ACTIVATION_PROOF_COOKIE_NAME, RECOVERY_PROOF_COOKIE_NAME } from "@/modules/identity/proof";
import { issueOtpChallenge, verifyAndConsumeOtpChallenge } from "@/server/otp";
import { completeRegistrationDetailsSchema, patientRegistrationPhoneSchema } from "@/modules/identity/contracts";

async function setProofCookie(name: string, value: string) {
  (await cookies()).set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REGISTRATION_PROOF_TTL_SECONDS,
  });
}

async function redirectAuthError(route: string, phone: string, error: unknown): Promise<never> {
  if (!isDomainError(error)) throw error;
  return await redirectAuthPath(route + "?" + new URLSearchParams({ phone, error: error.message }));
}

async function sendPhoneOtp(form: FormData, errorRoute: string, nextRoute: string, send: (phone: string) => Promise<{phone:string;message?:string}>) {
  const phone = String(form.get("phone") ?? "").trim();
  let result;
  try { result = await send(phone); }
  catch (error) { return await redirectAuthError(errorRoute, phone, error); }
  return await redirectAuthPath(`${nextRoute}?${new URLSearchParams({phone:result.phone,sent:"1",...(result.message ? {notice:result.message} : {})})}`);
}

async function readPasswordCompletion(form: FormData, mode: "activate" | "recover") {
  const phone = String(form.get("phone") ?? "").trim();
  const recovery = mode === "recover";
  const password = String(form.get(recovery ? "newPassword" : "password") ?? "");
  const confirm = String(form.get(recovery ? "confirmNewPassword" : "confirmPassword") ?? "");
  const store = await cookies();
  const name = recovery ? RECOVERY_PROOF_COOKIE_NAME : ACTIVATION_PROOF_COOKIE_NAME;
  const proof = store.get(name)?.value;
  if (!proof) return await redirectAuthPath(`/${mode}?${new URLSearchParams({error:recovery ? "Phiên khôi phục mật khẩu đã hết hạn. Vui lòng nhận lại mã." : "Phiên kích hoạt đã hết hạn. Vui lòng nhận lại mã."})}`);
  if (confirm !== password) return await redirectAuthPath(`/${mode}/complete?${new URLSearchParams({phone,error:"Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại."})}`);
  return {phone,password,proof,store,name};
}

export async function loginFormAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextUrl = sanitizeNextRedirect(String(formData.get("next") ?? ""));

  let destination = "/patient";

  try {
    const res = await login({ phone, password });
    revalidatePath("/", "layout");

    if (res.requiresRoleSelection) {
      const params = new URLSearchParams();
      if (nextUrl) {
        params.set("next", nextUrl);
      }
      const qs = params.toString();
      destination = qs ? `/choose-role?${qs}` : "/choose-role";
    } else {
      destination = resolvePostAuthDestination(res.activeContext, nextUrl);
    }
  } catch (err) {
    if (isDomainError(err)) {
      if (err.code === "ACCOUNT_PENDING_ACTIVATION") {
        const targetPhone =
          (err.details?.phone as string | undefined) ?? phone;
        let activationError = "";
        try {
          await startStaffActivation({ phone: targetPhone });
        } catch (sendError) {
          activationError = isDomainError(sendError) ? sendError.message : "Chưa gửi được mã xác minh. Vui lòng thử lại.";
        }
        return await redirectAuthPath(
          activationError
            ? `/activate?phone=${encodeURIComponent(targetPhone)}&error=${encodeURIComponent(activationError)}`
            : `/activate/verify?phone=${encodeURIComponent(targetPhone)}&sent=1`
        );
      }

      if (err.code === "ACCOUNT_REACTIVATION_READY") {
        const targetPhone =
          (err.details?.phone as string | undefined) ?? phone;
        await setProofCookie(REACTIVATION_LOGIN_COOKIE_NAME, createAuthProofToken({ phone: targetPhone, challengeId: String(err.details?.challengeId ?? ""), scope: "REACTIVATION_LOGIN" }));
        return await redirectAuthPath(
          `/reactivate?phone=${encodeURIComponent(targetPhone)}`
        );
      }

      const params = new URLSearchParams({
        phone,
        error: err.message,
      });
      if (nextUrl) {
        params.set("next", nextUrl);
      }
      return await redirectAuthPath(`/login?${params.toString()}`);
    }
    throw err;
  }

  return await redirectAuthPath(destination);
}

export async function startPatientRegistrationAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();

  const parsed = patientRegistrationPhoneSchema.safeParse({ phone });
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Vui lòng nhập số điện thoại hợp lệ.";
    return await redirectAuthPath(`/register?phone=${encodeURIComponent(phone)}&error=${encodeURIComponent(errorMsg)}`);
  }

  let targetPhone = phone;

  try {
    const res = await startPatientRegistration({ phone });
    targetPhone = res.phone;
  } catch (err) {
    if (isDomainError(err)) {
      const normalized = (() => {
        try {
          return normalizeVietnamPhone(phone);
        } catch {
          return phone;
        }
      })();

      if (err.code === "ACCOUNT_ALREADY_EXISTS" || err.code === "ACCOUNT_REACTIVATION_REQUIRED") {
        return await redirectAuthPath(
          `/login?phone=${encodeURIComponent(normalized)}&error=${encodeURIComponent(err.message)}`
        );
      }

      if (err.code === "ACCOUNT_PENDING_ACTIVATION") {
        return await redirectAuthPath(
          `/activate?phone=${encodeURIComponent(normalized)}`
        );
      }

      if (err.code === "ACCOUNT_DISABLED") {
        return await redirectAuthPath(
          `/reactivate?phone=${encodeURIComponent(normalized)}`
        );
      }

      return await redirectAuthPath(
        `/register?phone=${encodeURIComponent(phone)}&error=${encodeURIComponent(err.message)}`
      );
    }
    throw err;
  }

  return await redirectAuthPath(`/register/verify?phone=${encodeURIComponent(targetPhone)}&sent=1`);
}

async function verifyActivationPhone(formData: FormData, mode: "register" | "activate") {
  let phone = String(formData.get("phone") ?? "").trim();
  try {
    phone = normalizeVietnamPhone(phone);
    const challenge = await verifyAndConsumeOtpChallenge({
      purpose: "ACTIVATE", phone, code: String(formData.get("otpCode") ?? "").trim(),
    });
    const input = { phone, challengeId: challenge.challengeId };
    const registration = mode === "register";
    await setProofCookie(
      registration ? REGISTRATION_PROOF_COOKIE_NAME : ACTIVATION_PROOF_COOKIE_NAME,
      createAuthProofToken({ ...input, scope: registration ? "REGISTRATION" : "ACTIVATION" }),
    );
    return phone;
  } catch (err) {
    return await redirectAuthError(`/${mode}/verify`, phone, err);
  }
}

export async function verifyRegistrationOtpAction(formData: FormData) {
  await verifyActivationPhone(formData, "register");
  return await redirectAuthPath("/register/complete");
}

export async function resendRegistrationOtpAction(formData: FormData) {
  return sendPhoneOtp(formData, "/register/verify", "/register/verify", async phone => {
    const normalized = normalizeVietnamPhone(phone);
    await issueOtpChallenge({purpose:"ACTIVATE",phone:normalized,accountId:null});
    return {phone:normalized};
  });
}


export async function completeRegistrationAction(formData: FormData) {
  const cookieStore = await cookies();
  const proofCookie = cookieStore.get(REGISTRATION_PROOF_COOKIE_NAME);

  if (!proofCookie?.value) {
    return await redirectAuthPath(
      `/register?error=${encodeURIComponent("Phiên đăng ký đã hết hạn. Vui lòng bắt đầu lại.")}`
    );
  }

  let verifiedPhone = "";
  try {
    const proof = verifyAuthProofToken(proofCookie.value, "REGISTRATION");
    verifiedPhone = proof.phone;
  } catch (err) {
    if (isDomainError(err)) {
      return await redirectAuthPath(`/register?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const parsed = completeRegistrationDetailsSchema.safeParse({
    fullName,
    birthDate,
    email: email || undefined,
    password,
    confirmPassword,
  });

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Thông tin đăng ký không hợp lệ.";
    return await redirectAuthPath(
      `/register/complete?error=${encodeURIComponent(errorMsg)}`
    );
  }

  try {
    await completePatientRegistration({
      phone: verifiedPhone,
      proofToken: proofCookie.value,
      password,
      fullName,
      birthDate,
      email,
    });

    cookieStore.delete(REGISTRATION_PROOF_COOKIE_NAME);

    await login({ phone: verifiedPhone, password, setCookie: true });
    revalidatePath("/", "layout");
  } catch (err) {
    if (isDomainError(err)) {
      return await redirectAuthPath(
        `/register/complete?error=${encodeURIComponent(err.message)}`
      );
    }
    throw err;
  }

  return await redirectAuthPath("/patient");
}

export async function requestActivationOtpFormAction(formData: FormData) {
  return sendPhoneOtp(formData, "/activate", "/activate/verify", phone => startStaffActivation({phone}));
}


export async function verifyActivationOtpAction(formData: FormData) {
  const phone = await verifyActivationPhone(formData, "activate");
  return await redirectAuthPath(`/activate/complete?phone=${encodeURIComponent(phone)}`);
}

export async function completeActivationWithProofAction(formData: FormData) {
  const {phone,password,proof,store,name} = await readPasswordCompletion(formData,"activate");

  let destination = "/login";
  try {
    await completeStaffActivationWithProof({
      phone,
      proofToken: proof,
      password,
    });

    store.delete(name);

    const loginRes = await login({ phone, password });
    revalidatePath("/", "layout");
    destination = loginRes.requiresRoleSelection
      ? "/choose-role"
      : resolvePostAuthDestination(loginRes.activeContext, null);
  } catch (err) {
    return await redirectAuthError("/activate/complete", phone, err);
  }

  return await redirectAuthPath(destination);
}

export async function requestPasswordRecoveryFormAction(formData: FormData) {
  return sendPhoneOtp(formData, "/recover", "/recover/verify", phone => startPasswordRecovery({phone}));
}


export async function verifyPasswordRecoveryOtpAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  const otpCode = String(formData.get("otpCode") ?? "").trim();

  let targetPhone = phone;
  try {
    const res = await verifyPasswordRecoveryOtp({ phone, otpCode });
    targetPhone = res.phone;

    await setProofCookie(RECOVERY_PROOF_COOKIE_NAME, res.proofToken);
  } catch (err) {
    return await redirectAuthError("/recover/verify", targetPhone, err);
  }

  return await redirectAuthPath(`/recover/complete?phone=${encodeURIComponent(targetPhone)}`);
}

export async function completePasswordRecoveryWithProofAction(formData: FormData) {
  const {phone,password:newPassword,proof,store,name} = await readPasswordCompletion(formData,"recover");

  try {
    const res = await completePasswordRecoveryWithProof({
      phone,
      proofToken: proof,
      newPassword,
    });
    store.delete(name);

    const params = new URLSearchParams({
      phone: res.phone,
      success:
        "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới của bạn.",
    });
    return await redirectAuthPath(`/login?${params.toString()}`);
  } catch (err) {
    return await redirectAuthError("/recover/complete", phone, err);
  }
}

export async function resendReactivationOtpFormAction(formData: FormData) {
  return sendPhoneOtp(formData, "/reactivate", "/reactivate", async phone => {
    await requireReactivationLogin(phone);
    return resendReactivationOtp({phone});
  });
}


export async function completeReactivationFormAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  const otpCode = String(formData.get("otpCode") ?? "").trim();

  try {
    await requireReactivationLogin(phone);
    const res = await completeReactivation({ phone, otpCode });
    (await cookies()).delete(REACTIVATION_LOGIN_COOKIE_NAME);
    await createAuthSession({ accountId: res.accountId });
  } catch (err) {
    return await redirectAuthError("/reactivate", phone, err);
  }

  revalidatePath("/", "layout");
  const ctx = await getCurrentSession();
  return await redirectAuthPath(ctx ? ctx.roles.length > 1 ? "/choose-role" : resolvePostAuthDestination(ctx.activeContext) : "/login");
}

async function requireReactivationLogin(phone: string) {
  const token = (await cookies()).get(REACTIVATION_LOGIN_COOKIE_NAME)?.value ?? "";
  await verifyReactivationLoginProof(token, normalizeVietnamPhone(phone));
}
