"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";

type Props = {
  user: {
    charityId: string | null;
    charityPct: number;
    subscription: { priceCents: number; plan: string } | null;
  };
  charities: { id: string; name: string; tagline: string; imageUrl: string }[];
  donations: { id: string; charityName: string; amountCents: number; createdAt: string }[];
};

export default function CharityClient({ user, charities, donations }: Props) {
  const router = useRouter();
  const [charityId, setCharityId] = useState<string>(user.charityId ?? charities[0]?.id ?? "");
  const [pct, setPct] = useState(user.charityPct);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Donation state
  const [donCharity, setDonCharity] = useState<string>(user.charityId ?? charities[0]?.id ?? "");
  const [donAmount, setDonAmount] = useState<number>(25);
  const [donNote, setDonNote] = useState<string>("");
  const [donError, setDonError] = useState<string | null>(null);
  const [donOk, setDonOk] = useState(false);

  async function saveAllocation(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const res = await fetch("/api/subscription", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ charityId, charityPct: pct }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error ?? "Failed");
    setOk(true);
    startTransition(() => router.refresh());
  }

  async function donate(e: React.FormEvent) {
    e.preventDefault();
    setDonError(null);
    setDonOk(false);
    const res = await fetch("/api/donations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        charityId: donCharity,
        amountCents: Math.floor(donAmount * 100),
        note: donNote,
      }),
    });
    const body = await res.json();
    if (!res.ok) return setDonError(body.error ?? "Failed");
    setDonOk(true);
    setDonAmount(25);
    setDonNote("");
    startTransition(() => router.refresh());
  }

  const price = user.subscription?.priceCents ?? 1500;
  const pctFlow = Math.floor((price * pct) / 100);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display italic text-4xl">Your charity</h1>
        <p className="text-ink-300 mt-1">Change who you support and how much of your subscription goes to them.</p>
      </header>

      <Card>
        <form onSubmit={saveAllocation} className="space-y-5">
          <div>
            <div className="text-xs uppercase tracking-widest text-ember-300 mb-2">Recipient</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {charities.map((c) => {
                const selected = c.id === charityId;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCharityId(c.id)}
                    className={`text-left rounded-xl p-3 border transition ${
                      selected ? "border-ember-400 bg-ember-500/10" : "border-ink-700 hover:border-ink-500"
                    }`}
                  >
                    <div className="relative h-24 rounded-lg overflow-hidden mb-2">
                      <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="280px" />
                    </div>
                    <div className="font-semibold text-sm">{c.name}</div>
                    <div className="text-[11px] text-ink-400 line-clamp-2">{c.tagline}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Contribution %" hint="Minimum 10% · Max 50%">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={10}
                max={50}
                value={pct}
                onChange={(e) => setPct(parseInt(e.target.value))}
                className="flex-1 accent-ember-400"
              />
              <span className="font-display italic text-2xl w-16 text-right">{pct}%</span>
            </div>
            <p className="text-xs text-ink-400 mt-2">
              {formatMoney(pctFlow)} per {user.subscription?.plan === "YEARLY" ? "year" : "month"} flows to your chosen cause.
            </p>
          </Field>

          {error && <p className="text-sm text-rose-400">{error}</p>}
          {ok && <p className="text-sm text-emerald-400">Saved.</p>}

          <Button type="submit" disabled={isPending}>Save</Button>
        </form>
      </Card>

      <Card>
        <div className="text-xs uppercase tracking-widest text-ember-300 mb-1">Independent donation</div>
        <h2 className="font-display italic text-2xl mb-3">Give more, any time.</h2>
        <form onSubmit={donate} className="grid md:grid-cols-3 gap-4 items-end">
          <Field label="Charity">
            <select
              value={donCharity}
              onChange={(e) => setDonCharity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-ink-950 border border-ink-700 focus:border-ember-400 focus:outline-none"
            >
              {charities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (USD)">
            <Input
              type="number"
              min={1}
              step={1}
              value={donAmount}
              onChange={(e) => setDonAmount(parseInt(e.target.value) || 0)}
              required
            />
          </Field>
          <Button type="submit" disabled={isPending}>Donate</Button>
          <div className="md:col-span-3">
            <Field label="Note (optional)">
              <Textarea
                value={donNote}
                onChange={(e) => setDonNote(e.target.value)}
                rows={2}
                maxLength={300}
              />
            </Field>
          </div>
        </form>
        {donError && <p className="text-sm text-rose-400 mt-2">{donError}</p>}
        {donOk && <p className="text-sm text-emerald-400 mt-2">Thank you — donation recorded.</p>}
      </Card>

      {donations.length > 0 && (
        <section>
          <h2 className="font-display italic text-2xl mb-3">Donation history</h2>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-950/60">
                <tr className="text-left text-xs uppercase tracking-widest text-ink-400">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Charity</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td className="py-3 px-5">{formatDate(d.createdAt)}</td>
                    <td className="py-3 px-5">{d.charityName}</td>
                    <td className="py-3 px-5 text-right font-medium">{formatMoney(d.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </div>
  );
}
