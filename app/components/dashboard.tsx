"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Landmark,
  Plus,
  Settings,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ChildView, DashboardData, PaymentSchedule } from "@/app/lib/types";

type View = { kind: "home" } | { kind: "child"; childId: string } | { kind: "settings" };
type Transaction = { childId: string; kind: "credit" | "debit" } | null;

const accentStyles: Record<string, string> = {
  gold: "bg-[#e6c46f] text-[#3d3219]",
  blue: "bg-[#9fc6d9] text-[#183140]",
  green: "bg-[#a8c09a] text-[#23351d]",
  rose: "bg-[#d9aaa0] text-[#49251e]",
};

const chartConfig = {
  projected: { label: "Projected balance", color: "#2f6b59" },
} satisfies ChartConfig;

function currency(cents: number, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: compact && cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function chartCurrency(dollars: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(dollars);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function projection(child: ChildView) {
  const periods: Record<PaymentSchedule, number> = {
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    annually: 1,
  };
  const annualRate = child.annualRateBps / 10_000;
  const compounds = periods[child.paymentSchedule];
  return Array.from({ length: 11 }, (_, year) => ({
    year: year === 0 ? "Now" : `${year}y`,
    projected: Math.round(child.balanceCents * Math.pow(1 + annualRate / compounds, compounds * year)) / 100,
  }));
}

async function responseError(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong.";
}

export function Dashboard({
  initialData,
  currentUserEmail,
  signOutPath,
}: {
  initialData: DashboardData;
  currentUserEmail: string;
  signOutPath: string;
}) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>({ kind: "home" });
  const [transaction, setTransaction] = useState<Transaction>(null);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [childName, setChildName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedChild =
    view.kind === "child" ? data.children.find((child) => child.id === view.childId) : undefined;

  async function refresh() {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (!response.ok) throw new Error(await responseError(response));
    setData((await response.json()) as DashboardData);
  }

  async function mutate(path: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        ...init,
        headers: { "content-type": "application/json", ...init.headers },
      });
      if (!response.ok) throw new Error(await responseError(response));
      await refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveTransaction(event: React.FormEvent) {
    event.preventDefault();
    if (!transaction) return;
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    const ok = await mutate("/api/ledger", {
      method: "POST",
      body: JSON.stringify({
        childId: transaction.childId,
        amountCents: transaction.kind === "credit" ? cents : -cents,
        comment,
      }),
    });
    if (ok) {
      setTransaction(null);
      setAmount("");
      setComment("");
    }
  }

  async function saveInterest(event: React.FormEvent<HTMLFormElement>, child: ChildView) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate("/api/interest", {
      method: "PUT",
      body: JSON.stringify({
        childId: child.id,
        annualRateBps: Math.round(Number(form.get("rate")) * 100),
        paymentSchedule: form.get("schedule"),
      }),
    });
  }

  async function addParent(event: React.FormEvent) {
    event.preventDefault();
    const ok = await mutate("/api/parents", {
      method: "POST",
      body: JSON.stringify({ email: parentEmail }),
    });
    if (ok) setParentEmail("");
  }

  async function removeParent(email: string) {
    await mutate("/api/parents", {
      method: "DELETE",
      body: JSON.stringify({ email }),
    });
  }

  async function addChild(event: React.FormEvent) {
    event.preventDefault();
    const ok = await mutate("/api/children", {
      method: "POST",
      body: JSON.stringify({ name: childName }),
    });
    if (ok) setChildName("");
  }

  return (
    <main className="min-h-screen pb-24 md:pb-10">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 md:py-8">
        <header className="mb-7 flex items-center justify-between">
          <button className="group flex items-center gap-3 text-left" onClick={() => setView({ kind: "home" })}>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Landmark className="size-5" />
            </span>
            <span>
              <span className="block text-lg font-bold tracking-[-0.03em]">AuldMoney</span>
              <span className="block text-xs text-muted-foreground">Family ledger</span>
            </span>
          </button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setView({ kind: "settings" })} aria-label="Open settings">
            <Settings className="size-5" />
          </Button>
        </header>

        {error && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            <span>{error}</span>
            <button className="font-bold" onClick={() => setError(null)} aria-label="Dismiss error">×</button>
          </div>
        )}

        {view.kind === "home" && (
          <HomeView
            data={data}
            onTransaction={setTransaction}
            onChild={(childId) => setView({ kind: "child", childId })}
          />
        )}

        {view.kind === "child" && selectedChild && (
          <ChildView
            key={selectedChild.id}
            child={selectedChild}
            busy={busy}
            onBack={() => setView({ kind: "home" })}
            onTransaction={(kind) => setTransaction({ childId: selectedChild.id, kind })}
            onSaveInterest={saveInterest}
          />
        )}

        {view.kind === "settings" && (
          <SettingsView
            data={data}
            currentUserEmail={currentUserEmail}
            signOutPath={signOutPath}
            parentEmail={parentEmail}
            childName={childName}
            busy={busy}
            onBack={() => setView({ kind: "home" })}
            onParentEmail={setParentEmail}
            onChildName={setChildName}
            onAddParent={addParent}
            onAddChild={addChild}
            onRemoveParent={removeParent}
          />
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-sm justify-around">
          <button className={`flex min-w-24 flex-col items-center gap-1 rounded-xl py-1.5 text-xs font-semibold ${view.kind !== "settings" ? "text-primary" : "text-muted-foreground"}`} onClick={() => setView({ kind: "home" })}>
            <WalletCards className="size-5" /> Balances
          </button>
          <button className={`flex min-w-24 flex-col items-center gap-1 rounded-xl py-1.5 text-xs font-semibold ${view.kind === "settings" ? "text-primary" : "text-muted-foreground"}`} onClick={() => setView({ kind: "settings" })}>
            <Settings className="size-5" /> Settings
          </button>
        </div>
      </nav>

      <Dialog open={Boolean(transaction)} onOpenChange={(open) => !open && setTransaction(null)}>
        <DialogContent className="rounded-[1.75rem] p-5 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-2xl tracking-[-0.04em]">
              {transaction?.kind === "credit" ? "Add money" : "Deduct money"}
            </DialogTitle>
            <DialogDescription>
              {data.children.find((child) => child.id === transaction?.childId)?.name}’s ledger updates immediately.
            </DialogDescription>
          </DialogHeader>
          <form className="mt-2 grid gap-4" onSubmit={saveTransaction}>
            <label className="grid gap-2 text-sm font-semibold">
              Amount
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">$</span>
                <Input autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="h-14 rounded-2xl pl-9 text-2xl font-semibold" />
              </div>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Note
              <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Allowance, lemonade stand, new book…" maxLength={280} className="min-h-24 rounded-2xl" />
            </label>
            <Button disabled={busy} size="lg" className="mt-2 h-13 rounded-2xl text-base">
              {busy ? "Saving…" : transaction?.kind === "credit" ? "Credit account" : "Debit account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function HomeView({
  data,
  onTransaction,
  onChild,
}: {
  data: DashboardData;
  onTransaction: (value: Transaction) => void;
  onChild: (childId: string) => void;
}) {
  return (
    <>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="eyebrow">Accounts</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Balances</h1>
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">Tap an account for history and projections</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        {data.children.map((child) => (
          <article key={child.id} className="overflow-hidden rounded-[1.75rem] border bg-card shadow-[0_10px_30px_-24px_#173f34]">
            <button className="flex w-full items-start justify-between p-5 text-left" onClick={() => onChild(child.id)}>
              <div>
                <span className={`mb-5 flex size-11 items-center justify-center rounded-2xl text-lg font-black ${accentStyles[child.accent] ?? accentStyles.gold}`}>
                  {child.name.slice(0, 1).toUpperCase()}
                </span>
                <p className="text-sm font-semibold text-muted-foreground">{child.name}</p>
                <p className={`money mt-0.5 text-3xl font-semibold ${child.balanceCents < 0 ? "text-destructive" : "text-foreground"}`}>{currency(child.balanceCents)}</p>
                <p className="mt-2 text-xs text-muted-foreground">{(child.annualRateBps / 100).toFixed(2)}% · {child.paymentSchedule}</p>
              </div>
              <ChevronRight className="mt-2 size-5 text-muted-foreground" />
            </button>
            <div className="grid grid-cols-2 gap-2 border-t bg-muted/45 p-3">
              <Button variant="secondary" className="h-12 rounded-xl bg-card" onClick={() => onTransaction({ childId: child.id, kind: "credit" })}>
                <ArrowUp /> Credit
              </Button>
              <Button variant="secondary" className="h-12 rounded-xl bg-card" onClick={() => onTransaction({ childId: child.id, kind: "debit" })}>
                <ArrowDown /> Debit
              </Button>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8">
        <p className="eyebrow">Ledger</p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Recent activity</h2>
        <div className="mt-4 overflow-hidden rounded-[1.5rem] border bg-card">
          {data.recentEntries.length ? data.recentEntries.map((entry, index) => (
            <div key={entry.id} className={`flex items-center gap-3 px-4 py-4 ${index ? "border-t" : ""}`}>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${entry.amountCents >= 0 ? "bg-[#dce9dc] text-[#2f6b59]" : "bg-[#f3ddd8] text-destructive"}`}>
                {entry.amountCents >= 0 ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{entry.comment || (entry.amountCents >= 0 ? "Credit" : "Debit")}</p>
                <p className="text-xs text-muted-foreground">{entry.childName} · {shortDate(entry.effectiveAt)}</p>
              </div>
              <p className={`money text-sm font-bold ${entry.amountCents < 0 ? "text-destructive" : "text-primary"}`}>{entry.amountCents >= 0 ? "+" : ""}{currency(entry.amountCents)}</p>
            </div>
          )) : (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No activity yet. Credit or debit an account to begin.</p>
          )}
        </div>
      </section>
    </>
  );
}

function ChildView({
  child,
  busy,
  onBack,
  onTransaction,
  onSaveInterest,
}: {
  child: ChildView;
  busy: boolean;
  onBack: () => void;
  onTransaction: (kind: "credit" | "debit") => void;
  onSaveInterest: (event: React.FormEvent<HTMLFormElement>, child: ChildView) => void;
}) {
  const [rate, setRate] = useState((child.annualRateBps / 100).toFixed(2));
  const [schedule, setSchedule] = useState<PaymentSchedule>(child.paymentSchedule);
  const chartData = useMemo(() => {
    const parsedRate = Number(rate);
    return projection({
      ...child,
      annualRateBps: Number.isFinite(parsedRate) ? Math.round(parsedRate * 100) : child.annualRateBps,
      paymentSchedule: schedule,
    });
  }, [child, rate, schedule]);
  const tenYear = Math.round((chartData.at(-1)?.projected ?? 0) * 100);
  return (
    <>
      <button className="mb-5 flex items-center gap-2 text-sm font-semibold text-muted-foreground" onClick={onBack}><ArrowLeft className="size-4" /> All balances</button>
      <section className="rounded-[2rem] bg-primary p-6 text-primary-foreground sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-primary-foreground/65">{child.name}’s balance</p>
            <h1 className={`money mt-1 text-4xl font-semibold sm:text-5xl ${child.balanceCents < 0 ? "text-[#ffc4b7]" : ""}`}>{currency(child.balanceCents)}</h1>
          </div>
          <span className={`flex size-12 items-center justify-center rounded-2xl text-xl font-black ${accentStyles[child.accent] ?? accentStyles.gold}`}>{child.name.slice(0, 1)}</span>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <Button className="h-12 rounded-xl bg-white text-primary hover:bg-white/90" onClick={() => onTransaction("credit")}><ArrowUp /> Credit</Button>
          <Button className="h-12 rounded-xl bg-white/12 text-white hover:bg-white/20" onClick={() => onTransaction("debit")}><ArrowDown /> Debit</Button>
        </div>
      </section>

      <section className="mt-6 rounded-[1.75rem] border bg-card p-5 sm:p-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Interest projection</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Ten-year growth</h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">At year 10</p>
            <p className="money font-bold">{currency(tenYear)}</p>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="mt-5 h-56 w-full aspect-auto">
          <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="projected-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-projected)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-projected)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} interval={1} />
            <YAxis width={52} tickLine={false} axisLine={false} domain={["auto", "auto"]} tickFormatter={chartCurrency} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => <span className="font-mono font-semibold">{currency(Number(value) * 100)}</span>} />} />
            <Area type="monotone" dataKey="projected" stroke="var(--color-projected)" strokeWidth={3} fill="url(#projected-fill)" />
          </AreaChart>
        </ChartContainer>

        <form className="mt-6 grid gap-4 border-t pt-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(event) => onSaveInterest(event, child)}>
          <label className="grid gap-2 text-sm font-semibold">Annual rate
            <div className="relative"><Input name="rate" type="number" min="0" max="100" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} className="h-11 rounded-xl pr-9" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span></div>
          </label>
          <label className="grid gap-2 text-sm font-semibold">Payment schedule
            <NativeSelect name="schedule" value={schedule} onChange={(event) => setSchedule(event.target.value as PaymentSchedule)} className="h-11 w-full rounded-xl">
              <NativeSelectOption value="weekly">Weekly</NativeSelectOption>
              <NativeSelectOption value="monthly">Monthly</NativeSelectOption>
              <NativeSelectOption value="quarterly">Quarterly</NativeSelectOption>
              <NativeSelectOption value="annually">Annually</NativeSelectOption>
            </NativeSelect>
          </label>
          <Button disabled={busy} className="h-11 rounded-xl">{busy ? "Saving…" : "Save rate"}</Button>
        </form>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">The chart compounds the current balance at this cadence. Due interest is posted to the ledger automatically each day.</p>
      </section>

      <section className="mt-6">
        <p className="eyebrow">Ledger</p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">{child.name}’s history</h2>
        <div className="mt-4 overflow-hidden rounded-[1.5rem] border bg-card">
          {child.entries.length ? child.entries.map((entry, index) => (
            <div key={entry.id} className={`flex items-center gap-3 px-4 py-4 ${index ? "border-t" : ""}`}>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{entry.comment || (entry.amountCents >= 0 ? "Credit" : "Debit")}</p><p className="text-xs text-muted-foreground">{shortDate(entry.effectiveAt)} · {entry.createdByEmail}</p></div>
              <p className={`money text-sm font-bold ${entry.amountCents < 0 ? "text-destructive" : "text-primary"}`}>{entry.amountCents >= 0 ? "+" : ""}{currency(entry.amountCents)}</p>
            </div>
          )) : <p className="px-5 py-8 text-center text-sm text-muted-foreground">No transactions yet.</p>}
        </div>
      </section>
    </>
  );
}

function SettingsView({
  data,
  currentUserEmail,
  signOutPath,
  parentEmail,
  childName,
  busy,
  onBack,
  onParentEmail,
  onChildName,
  onAddParent,
  onAddChild,
  onRemoveParent,
}: {
  data: DashboardData;
  currentUserEmail: string;
  signOutPath: string;
  parentEmail: string;
  childName: string;
  busy: boolean;
  onBack: () => void;
  onParentEmail: (value: string) => void;
  onChildName: (value: string) => void;
  onAddParent: (event: React.FormEvent) => void;
  onAddChild: (event: React.FormEvent) => void;
  onRemoveParent: (email: string) => void;
}) {
  return (
    <>
      <button className="mb-5 flex items-center gap-2 text-sm font-semibold text-muted-foreground" onClick={onBack}><ArrowLeft className="size-4" /> Back</button>
      <div className="mb-7"><p className="eyebrow">Family setup</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Settings</h1></div>

      <section className="rounded-[1.75rem] border bg-card p-5 sm:p-7">
        <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-secondary"><UserRound className="size-5" /></span><div><h2 className="font-semibold">Parent access</h2><p className="text-xs text-muted-foreground">Only invited email addresses can open the ledger.</p></div></div>
        <div className="mt-5 overflow-hidden rounded-2xl border">
          {data.parents.map((parent, index) => (
            <div key={parent.id} className={`flex items-center gap-3 bg-background px-4 py-3 ${index ? "border-t" : ""}`}>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{parent.displayName || parent.email}</p>{parent.displayName && <p className="truncate text-xs text-muted-foreground">{parent.email}</p>}</div>
              {parent.email === currentUserEmail ? <span className="rounded-full bg-secondary px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide">You</span> : <Button type="button" size="icon-sm" variant="ghost" disabled={busy} onClick={() => onRemoveParent(parent.email)} aria-label={`Remove ${parent.email}`}><Trash2 /></Button>}
            </div>
          ))}
        </div>
        <form className="mt-4 flex gap-2" onSubmit={onAddParent}>
          <Input type="email" value={parentEmail} onChange={(event) => onParentEmail(event.target.value)} placeholder="parent@example.com" className="h-11 rounded-xl" required />
          <Button disabled={busy} className="h-11 rounded-xl"><Plus /> Add</Button>
        </form>
      </section>

      <section className="mt-5 rounded-[1.75rem] border bg-card p-5 sm:p-7">
        <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-secondary"><WalletCards className="size-5" /></span><div><h2 className="font-semibold">Kids</h2><p className="text-xs text-muted-foreground">All parent accounts can see every balance.</p></div></div>
        <div className="mt-5 flex flex-wrap gap-2">{data.children.map((child) => <span key={child.id} className="rounded-full border bg-background px-3 py-2 text-sm font-semibold">{child.name}</span>)}</div>
        <form className="mt-4 flex gap-2" onSubmit={onAddChild}>
          <Input value={childName} onChange={(event) => onChildName(event.target.value)} placeholder="Child’s name" className="h-11 rounded-xl" required maxLength={50} />
          <Button disabled={busy} className="h-11 rounded-xl"><Plus /> Add</Button>
        </form>
      </section>

      <section className="mt-5 rounded-[1.75rem] border bg-card p-5 sm:p-7">
        <p className="text-sm font-semibold">Signed in as</p><p className="mt-1 text-sm text-muted-foreground">{currentUserEmail}</p>
        <a href={signOutPath} className="mt-4 inline-flex text-sm font-semibold text-primary underline">Sign out</a>
      </section>
    </>
  );
}
