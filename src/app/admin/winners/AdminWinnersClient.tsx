"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Ball, Button, Card, Field, Textarea } from "@/components/ui";
import { formatDate, formatMoney, formatMonthYear } from "@/lib/format";

/**
 * Admin winner verification UI.
 *
 * Three lifecycle states are surfaced as tabs:
 *   - PENDING  – proof uploaded (or not), awaiting admin review
 *   - APPROVED – verified; eligible for payout; "Mark paid" becomes active
 *   - REJECTED – proof rejected (with a review note); locked from payout
 *
 * The API at PATCH /api/admin/winners/:id enforces the state transitions
 * (you can only mark PAID after APPROVED) — this UI just enables/disables
 * the relevant buttons so admins can't propose invalid transitions.
 */

type Winner = {
  id: string;
  tier: number;
  matchedCount: number;
  matchedNumbers: number[];
  scoresSnapshot: number[];
  prizeCents: number;
  verificationStatus: string;
  payoutStatus: string;
  reviewNote: string | null;
  proofUrl: string | null;
  reviewedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  draw: {
    id: string;
    month: number;
    year: number;
    winningNumbers: number[];
    algorithm: string;
  };
};

type Tab = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export default function AdminWinnersClient({ winners }: { winners: Winner[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("PENDING");
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(() => {
    return {
      PENDING: winners.filter((w) => w.verificationStatus === "PENDING").length,
      APPROVED: winners.filter((w) => w.verificationStatus === "APPROVED").length,
      REJECTED: winners.filter((w) => w.verificationStatus === "REJECTED").length,
      ALL: winners.length,
    };
  }, [winners]);

  const visible = useMemo(() => {
    if (tab === "ALL") return winners;
    return winners.filter((w) => w.verificationStatus === tab);
  }, [winners, tab]);

  async function decide(id: string, verificationStatus: "APPROVED" | "REJECTED") {
    setBusyId(id);
    setErr(null);
    const res = await fetch(`/api/admin/winners/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ verificationStatus, reviewNote: note || undefined }),
    });
    setBusyId(null);
    const body = await res.json();
    if (!res.ok) {
      setErr(body.error ?? "Failed");
      return;
    }
    setOpenId(null);
    setNote("");
    startTransition(() => router.refresh());
  }

  async function markPaid(id: string) {
    if (!confirm("Mark this winner as paid? This records a payout timestamp.")) return;
    setBusyId(id);
    setErr(null);
    const res = await fetch(`/api/admin/winners/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payoutStatus: "PAID" }),
    });
    setBusyId(null);
    const body = await res.json();
    if (!res.ok) {
      setErr(body.error ?? "Failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-4xl">Winner verification</h1>
        <p className="text-ink-300 mt-1">
          Review uploaded proof of Stableford scores, approve or reject, then mark paid when the
          transfer is sent.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "px-4 py-2 rounded-full text-sm border transition " +
                (active
                  ? "bg-ember-500/20 border-ember-500/40 text-ember-200"
                  : "bg-ink-900 border-ink-800 text-ink-300 hover:border-ink-700")
              }
            >
              {t.charAt(0) + t.slice(1).toLowerCase()} ·{" "}
              <span className="text-ink-400">{counts[t]}</span>
            </button>
          );
        })}
      </div>

      {err && (
        <div className="border border-rose-500/40 bg-rose-500/10 text-rose-200 rounded-xl px-4 py-3 text-sm">
          {err}
        </div>
      )}

      {visible.length === 0 ? (
        <Card className="text-center py-12 text-ink-400">
          No winners in this bucket yet.
        </Card>
      ) : (
        <div className="grid gap-4">
          {visible.map((w) => (
            <WinnerCard
              key={w.id}
              w={w}
              openId={openId}
              setOpenId={(id) => {
                setOpenId(id);
                setNote(id ? w.reviewNote ?? "" : "");
              }}
              note={note}
              setNote={setNote}
              onApprove={() => decide(w.id, "APPROVED")}
              onReject={() => decide(w.id, "REJECTED")}
              onPay={() => markPaid(w.id)}
              busy={busyId === w.id || isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WinnerCard({
  w,
  openId,
  setOpenId,
  note,
  setNote,
  onApprove,
  onReject,
  onPay,
  busy,
}: {
  w: Winner;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  note: string;
  setNote: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onPay: () => void;
  busy: boolean;
}) {
  const expanded = openId === w.id;
  const verTone =
    w.verificationStatus === "APPROVED"
      ? "success"
      : w.verificationStatus === "REJECTED"
      ? "danger"
      : "warn";
  const payTone =
    w.payoutStatus === "PAID" ? "success" : w.payoutStatus === "HOLD" ? "warn" : "neutral";

  return (
    <Card>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge tone="accent">{w.tier}-match</Badge>
            <Badge tone={verTone as any}>{w.verificationStatus}</Badge>
            <Badge tone={payTone as any}>Payout: {w.payoutStatus}</Badge>
            <span className="text-xs text-ink-400">
              {formatMonthYear(w.draw.month, w.draw.year)} · {w.draw.algorithm}
            </span>
          </div>
          <div className="font-display italic text-2xl">{w.user.name}</div>
          <div className="text-sm text-ink-400">{w.user.email}</div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-ink-400 mb-1">
                Winning numbers
              </div>
              <div className="flex gap-1 flex-wrap">
                {w.draw.winningNumbers.map((n) => (
                  <Ball
                    key={n}
                    value={n}
                    size="sm"
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-ink-400 mb-1">
                Matched ({w.matchedCount})
              </div>
              <div className="flex gap-1 flex-wrap">
                {w.matchedNumbers.length ? (
                  w.matchedNumbers.map((n) => <Ball key={n} value={n} size="sm" />)
                ) : (
                  <span className="text-xs text-ink-400">—</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs uppercase tracking-widest text-ink-400 mb-1">
              Scores snapshot at draw time
            </div>
            <div className="text-sm">{w.scoresSnapshot.join(", ") || "—"}</div>
          </div>

          {w.reviewNote && (
            <div className="mt-4 text-sm bg-ink-950/60 border border-ink-800 rounded-xl p-3">
              <div className="text-xs uppercase tracking-widest text-ink-400 mb-1">
                Review note
              </div>
              <div className="text-ink-200">{w.reviewNote}</div>
            </div>
          )}
        </div>

        <div className="lg:w-72 shrink-0 space-y-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink-400">Prize</div>
            <div className="font-display italic text-3xl">{formatMoney(w.prizeCents)}</div>
          </div>

          <div className="text-xs text-ink-400">
            Created {formatDate(w.createdAt)}
            {w.reviewedAt ? <> · Reviewed {formatDate(w.reviewedAt)}</> : null}
            {w.paidAt ? <> · Paid {formatDate(w.paidAt)}</> : null}
          </div>

          {w.proofUrl ? (
            <a
              href={w.proofUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-ember-300 underline underline-offset-4 break-all"
            >
              View proof ↗
            </a>
          ) : (
            <div className="text-xs text-ink-400 italic">
              No proof uploaded yet. Winners can upload from their dashboard.
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {w.verificationStatus !== "APPROVED" && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setOpenId(expanded ? null : w.id)}
                disabled={busy}
              >
                {expanded ? "Close" : "Review"}
              </Button>
            )}
            {w.verificationStatus === "APPROVED" && w.payoutStatus !== "PAID" && (
              <Button size="sm" variant="primary" onClick={onPay} disabled={busy}>
                Mark paid
              </Button>
            )}
            {w.verificationStatus === "APPROVED" && w.payoutStatus === "PAID" && (
              <Badge tone="success">✓ Completed</Badge>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 border-t border-ink-800 pt-5 space-y-3">
          <Field
            label="Review note (optional)"
            hint="Shown to the winner — explain the decision, especially for rejections."
          >
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Scorecard signed and dated. Handicap matches our records."
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpenId(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onReject} disabled={busy}>
              Reject
            </Button>
            <Button variant="primary" onClick={onApprove} disabled={busy}>
              Approve
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
