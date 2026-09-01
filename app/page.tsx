import {
  cloudflareAccessLogoutPath,
  getCloudflareUser,
} from "./cloudflare-auth";
import { Dashboard } from "./components/dashboard";
import { getDashboardData, requireParent } from "./lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCloudflareUser();
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <section className="w-full max-w-md rounded-[2rem] border bg-card p-8 shadow-sm">
          <p className="eyebrow">AuldMoney</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Cloudflare Access is required.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Protect this Worker with a Cloudflare Access application so it can
            provide the signed-in parent’s email.
          </p>
        </section>
      </main>
    );
  }
  const authorizedUser = await requireParent();

  if (!authorizedUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <section className="w-full max-w-md rounded-[2rem] border bg-card p-8 shadow-sm">
          <p className="eyebrow">AuldMoney</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            You’re signed in, but not invited.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Ask an existing parent to add <strong>{user.email}</strong> to the
            family account.
          </p>
          <a className="mt-7 inline-flex text-sm font-semibold text-primary underline" href={cloudflareAccessLogoutPath}>
            Sign in with another account
          </a>
        </section>
      </main>
    );
  }

  const data = await getDashboardData();
  return (
    <Dashboard
      initialData={data}
      currentUserEmail={user.email.toLowerCase()}
      signOutPath={cloudflareAccessLogoutPath}
    />
  );
}
