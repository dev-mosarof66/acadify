import { auth } from "@/lib/auth/server";

/** Proxies all auth requests (session refresh, OTP, sign-out…) to Neon Auth. */
export const { GET, POST } = auth.handler();
