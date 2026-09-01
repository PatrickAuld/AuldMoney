type PaymentSchedule = "weekly" | "monthly" | "quarterly" | "annually";

type InterestSetting = {
  child_id: string;
  child_name: string;
  annual_rate_bps: number;
  payment_schedule: PaymentSchedule;
  last_applied_at: string;
  balance_cents: number;
};

const periodsPerYear: Record<PaymentSchedule, number> = {
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

const scheduleLabel: Record<PaymentSchedule, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annual",
};

function addMonths(value: Date, months: number) {
  const result = new Date(value);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function nextPayment(value: Date, schedule: PaymentSchedule) {
  if (schedule === "weekly") return new Date(value.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (schedule === "monthly") return addMonths(value, 1);
  if (schedule === "quarterly") return addMonths(value, 3);
  return addMonths(value, 12);
}

function roundCents(value: number) {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

function databaseDate(value: string) {
  return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

export async function applyDueInterest(db: D1Database, now = new Date()) {
  const query = await db.prepare(`
    SELECT
      settings.child_id,
      children.name AS child_name,
      settings.annual_rate_bps,
      settings.payment_schedule,
      settings.last_applied_at,
      COALESCE(SUM(ledger_entries.amount_cents), 0) AS balance_cents
    FROM interest_settings AS settings
    JOIN children ON children.id = settings.child_id
    LEFT JOIN ledger_entries ON ledger_entries.child_id = settings.child_id
    GROUP BY settings.child_id
  `).all() as { results: InterestSetting[] };

  const statements: D1PreparedStatement[] = [];

  for (const setting of query.results) {
    let balanceCents = Number(setting.balance_cents);
    let appliedAt = databaseDate(setting.last_applied_at);
    let dueAt = nextPayment(appliedAt, setting.payment_schedule);
    let periods = 0;

    while (dueAt <= now) {
      if (++periods > 1_000) throw new Error(`Interest catch-up exceeded 1,000 periods for ${setting.child_id}.`);

      const interestCents = roundCents(
        balanceCents * (setting.annual_rate_bps / 10_000) / periodsPerYear[setting.payment_schedule],
      );
      const effectiveAt = dueAt.toISOString();

      if (interestCents !== 0) {
        statements.push(
          db.prepare(`
            INSERT OR IGNORE INTO ledger_entries
              (id, child_id, amount_cents, comment, effective_at, created_by_email)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            `interest:${setting.child_id}:${effectiveAt}`,
            setting.child_id,
            interestCents,
            `${scheduleLabel[setting.payment_schedule]} interest at ${(setting.annual_rate_bps / 100).toFixed(2)}%`,
            effectiveAt,
            "interest@auldmoney.system",
          ),
        );
        balanceCents += interestCents;
      }

      appliedAt = dueAt;
      dueAt = nextPayment(appliedAt, setting.payment_schedule);
    }

    if (periods > 0) {
      statements.push(
        db.prepare("UPDATE interest_settings SET last_applied_at = ? WHERE child_id = ?")
          .bind(appliedAt.toISOString(), setting.child_id),
      );
    }
  }

  if (statements.length) await db.batch(statements);
  return { statements: statements.length };
}
