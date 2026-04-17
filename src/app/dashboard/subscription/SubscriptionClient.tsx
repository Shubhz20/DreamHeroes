"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";

type Sub = {
  plan: string;
  status: string;
  priceCents: number;
  currentPeriodEnd: string;
  canceledAt: string | null;
};

type Payment = {
  id: string;
  type: string;
  amountCents: number;
  note: string | null;
  createdAt: string;
};

export default function SubscriptionClient({
  subscription,
  active,
  monthlyPriceCents,
  yearlyPriceCents,
  payments,
}: {
  subscription: Sub | null;
  active: boolean;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  payments: Payment[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function post(url: string, body?: any) {
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display italic text-4xl">Subscription</h1>
        <p className="text-ink-300 mt-1">Manage plan, billing, and state.</p>
      </header>

      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone={active ? "success" : "danger"}>{subscription?.status ?? "NONE"}</Badge>
              {subscription && <Badge tone="neutral">{subscription.plan}</Badge>}
            </div>
            <h2 className="font-display italic text-3xl mt-3">
              {subscription ? formatMoney(subscription.priceCents) : "No plan"}
              {subscription && (
                <span className="text-base font-normal text-ink-400 ml-1 not-italic">
                  / {subscription.plan === "YEARLY" ? "year" : "month"}
                </span>
              )}
            </h2>
            {subscription && (
              <p className="text-sm text-ink-300 mt-1">
                {active ? "Renews on " : "Ends on "}
                <strong>{formatDate(subscription.currentPeriodEnd)}</strong>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {subscription?.status === "ACTIVE" && subscription.plan === "MONTHLY" && (
              <Button variant="secondary" onClick={() => post("/api/subscription/checkout", { plan: "YEARLY" })} disabled={isPending}>
                Switch to Yearly
              </Button>
            )}
            {subscription?.status === "ACTIVE" && subscription.plan === "YEARLY" && (
              <Button variant="secondary" onClick={() => post("/api/subscription/checkout", { plan: "MONTHLY" })} disabled={isPending}>
                Switch to Monthly
              </Button>
            )}
            {subscription?.status === "ACTIVE" && (
              <Button variant="danger" onClick={() => post("/api/subscription/cancel")} disabled={isPending}>
                Cancel
              </Button>
            )}
            {subscription && subscription.status !== "ACTIVE" && (
              <Button onClick={() => post("/api/subscription/reactivate")} disabled={isPending}>
                Reactivate
              </Button>
            )}
            {!subscription && (
              <>
                <Button onClick={() => post("/api/subscription/checkout", { plan: "MONTHLY" })} disabled={isPending}>
                  Start — {formatMoney(monthlyPriceCents)}/mo
                </Button>
                <Button variant="secondary" onClick={() => post("/api/subscription/checkout", { plan: "YEARLY" })} disabled={isPending}>
                  Start Yearly — {formatMoney(yearlyPriceCents)}
                </Button>
              </>
            )}
          </div>
        </div>
        {error && <p className="text-sm text-rose-400 mt-4">{error}</p>}
      </Card>

      <section>
        <h2 className="font-display italic text-2xl mb-3">Billing history</h2>
        {payments.length === 0 ? (
          <Card className="text-center text-ink-400 py-10">No payments yet.</Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-950/60">
                <tr className="text-left text-xs uppercase tracking-widest text-ink-400">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Note</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-5">{formatDate(p.createdAt)}</td>
                    <td className="py-3 px-5">
                      <Badge tone="neutral">{p.type}</Badge>
                    </td>
                    <td className="py-3 px-5 text-ink-300">{p.note ?? "—"}</td>
                    <td className="py-3 px-5 text-right font-medium">{formatMoney(p.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
