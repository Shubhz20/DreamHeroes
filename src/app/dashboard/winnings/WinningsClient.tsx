"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, Field, Input, Ball } from "@/components/ui";
import { formatDate, formatMoney, formatMonthYear } from "@/lib/format";

type Win = {
  id: string;
  tier: number;
  matchedCount: number;
  matchedNumbers: number[];
  scoresSnapshot: number[];
  prizeCents: number;
  verificationStatus: string;
  proofUrl: string | null;
  reviewNote: string | null;
  payoutStatus: string;
  paidAt: string | null;
  drawMonth: number;
  drawYear: number;
  drawNumbers: number[];
};

export default function WinningsClient({ winners }: { winners: Win[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = winners.reduce(
    (acc, w) => {
      if (w.verificationStatus === "APPROVED") acc.approved += w.prizeCents;
      if (w.verificationStatus === "PENDING") acc.pending += w.prizeCents;
      return acc;
    },
    { approved: 0, pending: 0 }
  );

  async function submitProof(id: string) {
    setError(null);
    if (!/^https?:\/\//.test(proofUrl)) {
      return setError("Enter a full URL starting with http:// or https://");
    }
    const res = await fetch(`/api/winners/${id}/proof`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error ?? "Failed");
    setActiveId(null);
    setProofUrl("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display italic text-4xl">Your winnings</h1>
        <p className="text-ink-300 mt-1">Match history, verification status, and payouts.</p>
      </header>

      <section className="grid sm:grid-cols-3 gap-4">
        <Card>
          <div className="text-xs uppercase tracking-widest text-ink-400">Approved & paid-able</div>
          <div className="mt-2 font-display italic text-3xl">{formatMoney(total.approved)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-widest text-ink-400">Pending verification</div>
          <div className="mt-2 font-display italic text-3xl">{formatMoney(total.pending)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-widest text-ink-400">Total wins</div>
          <div className="mt-2 font-display italic text-3xl">{winners.length}</div>
        </Card>
      </section>

      {winners.length === 0 ? (
        <EmptyState
          title="No wins yet — your first is coming."
          description="Every month we run a new draw. Keep your 5 scores current to maximise your odds."
        />
      ) : (
        <div className="space-y-4">
          {winners.map((w) => (
            <Card key={w.id}>
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">Tier {w.tier} — {w.matchedCount} match</Badge>
                    <Badge
                      tone={
                        w.verificationStatus === "APPROVED"
                          ? "success"
                          : w.verificationStatus === "REJECTED"
                          ? "danger"
                          : "warn"
                      }
                    >
                      {w.verificationStatus}
                    </Badge>
                    <Badge tone={w.payoutStatus === "PAID" ? "success" : "neutral"}>
                      Payout: {w.payoutStatus}
                    </Badge>
                  </div>
                  <h3 className="mt-2 font-display italic text-2xl">
                    {formatMoney(w.prizeCents)} · {formatMonthYear(w.drawMonth, w.drawYear)}
                  </h3>
                  <div className="mt-4 grid sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-ink-400 mb-2">Winning numbers</div>
                      <div className="flex flex-wrap gap-1.5">
                        {w.drawNumbers.map((n) => (
                          <Ball
                            key={n}
                            value={n}
                            size="sm"
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-ink-400 mb-2">Your scores at draw</div>
                      <div className="flex flex-wrap gap-1.5">
                        {w.scoresSnapshot.map((v, i) => (
                          <span
                            key={i}
                            className={`inline-flex h-8 w-8 rounded-full items-center justify-center text-xs font-semibold border ${
                              w.matchedNumbers.includes(v)
                                ? "bg-ember-500/30 border-ember-400 text-ember-100"
                                : "bg-ink-900 border-ink-700 text-ink-300"
                            }`}
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {w.reviewNote && (
                    <p className="mt-3 text-sm text-ink-300">
                      <strong>Admin note:</strong> {w.reviewNote}
                    </p>
                  )}
                  {w.paidAt && (
                    <p className="text-xs text-ink-400 mt-1">
                      Paid on {formatDate(w.paidAt)}
                    </p>
                  )}
                </div>

                <div className="lg:w-80 shrink-0">
                  <div className="rounded-xl bg-ink-950/60 border border-ink-800 p-4">
                    <div className="text-xs uppercase tracking-widest text-ember-300 mb-2">
                      Winner proof
                    </div>
                    {w.proofUrl ? (
                      <>
                        <a
                          href={w.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm text-ember-300 hover:text-ember-200 truncate"
                        >
                          {w.proofUrl}
                        </a>
                        {w.verificationStatus !== "APPROVED" && (
                          <p className="mt-2 text-xs text-ink-400">
                            You can replace this while verification is pending.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-ink-400">
                        Upload a screenshot URL from your golf platform.
                      </p>
                    )}
                    {w.verificationStatus !== "APPROVED" && (
                      <div className="mt-3">
                        {activeId === w.id ? (
                          <div className="space-y-2">
                            <Field label="Screenshot URL">
                              <Input
                                type="url"
                                placeholder="https://..."
                                value={proofUrl}
                                onChange={(e) => setProofUrl(e.target.value)}
                              />
                            </Field>
                            {error && <p className="text-xs text-rose-400">{error}</p>}
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => submitProof(w.id)} disabled={isPending}>
                                Submit
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setActiveId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => setActiveId(w.id)}>
                            {w.proofUrl ? "Replace proof" : "Upload proof"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
