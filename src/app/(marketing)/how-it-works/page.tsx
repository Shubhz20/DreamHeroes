import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Ball, Button, Card } from "@/components/ui";

export const metadata = { title: "How Heroic works" };

export default function HowItWorks() {
  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-16 stagger">
          <span className="text-ember-400 text-sm font-medium tracking-widest uppercase">The mechanics</span>
          <h1 className="mt-2 font-display italic text-5xl md:text-6xl">How Heroic works</h1>
          <p className="mt-4 text-ink-300 max-w-2xl mx-auto">
            A calm, transparent explanation. Zero fine print.
          </p>
        </div>

        <section className="grid md:grid-cols-2 gap-8 mb-20">
          <Card>
            <h3 className="font-display italic text-2xl mb-3">Your tickets are your scores.</h3>
            <p className="text-ink-300 text-sm leading-relaxed">
              The platform tracks the last 5 Stableford rounds you've played (1–45 points). Those five numbers are your entry into every monthly draw — no guessing, no picking, no randomness on your side.
            </p>
            <div className="mt-5 flex gap-2 justify-center">
              {[18, 27, 31, 34, 22].map((v) => (
                <Ball key={v} value={v} />
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-display italic text-2xl mb-3">The monthly draw.</h3>
            <p className="text-ink-300 text-sm leading-relaxed">
              On a fixed monthly cadence, the system generates 5 winning numbers. We support two modes: <em>random</em> (lottery-style) and <em>algorithmic</em> (weighted toward the community's most-played scores).
            </p>
            <p className="text-ink-300 text-sm leading-relaxed mt-2">
              Admins simulate before publishing — so every draw is vetted, never surprises anyone.
            </p>
          </Card>
        </section>

        <section className="mb-20">
          <h2 className="font-display italic text-4xl mb-8 text-center">The pool splits cleanly.</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { t: "5-Number Match", p: "40%", n: "Jackpot — rolls over if unclaimed.", tone: "ember" },
              { t: "4-Number Match", p: "35%", n: "Split equally across all winners.", tone: "ember" },
              { t: "3-Number Match", p: "25%", n: "Split equally across all winners.", tone: "ember" },
            ].map((x) => (
              <Card key={x.t}>
                <div className="text-[11px] uppercase tracking-widest text-ember-300">{x.t}</div>
                <div className="font-display italic text-6xl mt-2">{x.p}</div>
                <p className="text-sm text-ink-300 mt-2">{x.n}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-20">
          <h2 className="font-display italic text-4xl mb-6">Where every dollar goes.</h2>
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-400 text-left text-xs uppercase tracking-widest">
                  <th className="py-3 pr-4">Slice</th>
                  <th className="py-3 pr-4">Default</th>
                  <th className="py-3">What it funds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                <tr>
                  <td className="py-3 pr-4">Charity</td>
                  <td className="py-3 pr-4 font-mono">≥ 10% (you choose)</td>
                  <td className="py-3 text-ink-300">Your selected charity. Raise it any time.</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Prize pool</td>
                  <td className="py-3 pr-4 font-mono">50%</td>
                  <td className="py-3 text-ink-300">Funds the monthly 3/4/5 match tiers.</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Platform</td>
                  <td className="py-3 pr-4 font-mono">balance</td>
                  <td className="py-3 text-ink-300">Keeps the lights on & the product moving.</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </section>

        <section className="text-center">
          <Button as="link" href="/signup" size="lg">Start playing — $15/mo</Button>
        </section>
      </main>
      <Footer />
    </>
  );
}
