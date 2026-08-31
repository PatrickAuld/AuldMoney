import { headers } from "next/headers";

export type CloudflareUser = {
  displayName: string;
  email: string;
};

export async function getCloudflareUser(): Promise<CloudflareUser | null> {
  const requestHeaders = await headers();
  const accessEmail = requestHeaders.get("cf-access-authenticated-user-email");
  const email =
    accessEmail ??
    (process.env.NODE_ENV !== "production" ? "patrick@patrickauld.com" : null);

  if (!email) return null;

  const normalizedEmail = email.trim().toLowerCase();
  return {
    email: normalizedEmail,
    displayName: normalizedEmail.split("@")[0],
  };
}

export const cloudflareAccessLogoutPath = "/cdn-cgi/access/logout";
