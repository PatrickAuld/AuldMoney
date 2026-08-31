export type PaymentSchedule = "weekly" | "monthly" | "quarterly" | "annually";

export type LedgerEntryView = {
  id: string;
  childId: string;
  childName: string;
  amountCents: number;
  comment: string;
  effectiveAt: string;
  createdByEmail: string;
};

export type ChildView = {
  id: string;
  name: string;
  accent: string;
  balanceCents: number;
  annualRateBps: number;
  paymentSchedule: PaymentSchedule;
  entries: LedgerEntryView[];
};

export type DashboardData = {
  children: ChildView[];
  parents: { id: string; email: string; displayName: string | null }[];
  recentEntries: LedgerEntryView[];
};
