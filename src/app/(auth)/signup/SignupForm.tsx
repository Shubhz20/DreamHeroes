"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button, Field, Input, Card } from "@/components/ui";
import { formatMoney } from "@/lib/format";

type Charity = { id: string; slug: string; name: string; tagline: string; imageUrl: string };

export default function SignupForm({
  charities,
  defaultPlan,
  defaultCharitySlug,
  monthlyPriceCents,
  yearlyPriceCents,
}: {
  charities: Charity[];
  defaultPlan: "MONTHLY" | "YEARLY";
  defaultCharitySlug?: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<"MONTHLY" | "YEARLY">(defaultPlan);
  const [charityId, setCharityId] = useState<string>(
    charities.find((c) => c.slug === defaultCharitySlug)?.id ?? charities[0]?.id ?? ""
  );
  const [charityPct, setCharityPct] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!charityId && charities.length) setCharityId(charities[0].id);
  }, [charities, charityId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password, plan, charityId, charityPct }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Signup failed");
      return;
    }
    router.push("/dashboard?welcome=1");
    router.refresh();
  }

  const price = plan === "YEARLY" ? yearlyPriceCents : monthlyPriceCents;
  const selectedCharity = charities.find((c) => c.id === charityId);

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Plan picker */}
      <Card>
        <div className="text-xs uppercase tracking-widest text-ember-300 mb-3">1 · Plan</div>
        <div className="grid grid-cols-2 gap-3">
          {(["MONTHLY", "YEARLY"] as const).map((p) => {
            const selected = plan === p;
            const amount = p === "YEARLY" ? yearlyPriceCents : monthlyPriceCents;
            return (
              <button
                type="button"
                key={p}
                onClick={() => setPlan(p)}
                className={`text-left rounded-xl p-4 border transition ${
                  selected
                    ? "border-ember-400 bg-ember-500/10"
                    : "border-ink-700 bg-ink-950/50 hover:border-ink-500"
                }`}
              >
                <div className="text-xs uppercase tracking-widest text-ink-300">{p.toLowerCase()}</div>
                <div className="font-display italic text-3xl mt-1">
                  {formatMoney(amount)}
                  <span className="text-sm font-normal text-ink-400 ml-1 not-italic">
                    /{p === "YEARLY" ? "year" : "month"}
                  </span>
                </div>
                {p === "YEARLY" && (
                  <div className="text-xs mt-1 text-ember-300">2 months free</div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Charity picker */}
      <Card>
        <div className="text-xs uppercase tracking-widest text-ember-300 mb-3">2 · Charity</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
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
                <div className="relative h-20 rounded-lg overflow-hidden mb-2">
                  <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="200px" />
                </div>
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="text-[11px] text-ink-400 line-clamp-2">{c.tagline}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-5">
          <Field label="Contribution %" hint="Minimum 10%">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={10}
                max={50}
                step={1}
                value={charityPct}
                onChange={(e) => setCharityPct(parseInt(e.target.value))}
                className="flex-1 accent-ember-400"
              />
              <span className="font-display italic text-2xl w-16 text-right">{charityPct}%</span>
            </div>
            {selectedCharity && (
              <p className="text-xs text-ink-400 mt-2">
                {formatMoney(Math.floor((price * charityPct) / 100))} of each payment goes to {selectedCharity.name}.
              </p>
            )}
          </Field>
        </div>
      </Card>

      {/* Account info */}
      <Card>
        <div className="text-xs uppercase tracking-widest text-ember-300 mb-3">3 · Account</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
          </Field>
          <Field label="Email">
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password" hint="8+ characters">
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </Field>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm p-3">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Creating..." : `Pay ${formatMoney(price)} & start`}
      </Button>
      <p className="text-center text-[11px] text-ink-500">
        Test-mode checkout · no real card charged when Stripe isn't configured.
      </p>
    </form>
  );
}
