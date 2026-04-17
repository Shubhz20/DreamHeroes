"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Field, Input, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";

type Score = { id: string; value: number; playedAt: string };

export default function ScoresClient({
  initialScores,
  canEdit,
}: {
  initialScores: Score[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Score[]>(initialScores);
  const [value, setValue] = useState<number>(30);
  const [playedAt, setPlayedAt] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(30);
  const [editDate, setEditDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function addScore(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value, playedAt }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Failed");
      return;
    }
    startTransition(() => router.refresh());
    // Optimistic append — router.refresh() will reconcile.
    const newScore: Score = body.data.score;
    setScores((arr) => {
      const next = [...arr, newScore];
      // Keep rolling 5, sort newest first
      next.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
      return next.slice(0, 5);
    });
  }

  async function saveEdit(id: string) {
    setError(null);
    const res = await fetch(`/api/scores/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: editValue, playedAt: editDate }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Failed");
      return;
    }
    setEditing(null);
    setScores((arr) =>
      arr
        .map((s) => (s.id === id ? body.data.score : s))
        .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    );
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    if (!confirm("Delete this score?")) return;
    const res = await fetch(`/api/scores/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed");
      return;
    }
    setScores((arr) => arr.filter((s) => s.id !== id));
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display italic text-4xl">Your scores</h1>
        <p className="text-ink-300 mt-1">
          Stableford (1–45). Only the latest 5 are tracked. One entry per date.
        </p>
      </header>

      <Card>
        <h2 className="font-display italic text-xl mb-4">Log a round</h2>
        <form onSubmit={addScore} className="grid md:grid-cols-3 gap-4 items-end">
          <Field label="Date">
            <Input
              type="date"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
              disabled={!canEdit}
            />
          </Field>
          <Field label="Score" hint="1–45">
            <Input
              type="number"
              min={1}
              max={45}
              value={value}
              onChange={(e) => setValue(parseInt(e.target.value) || 0)}
              required
              disabled={!canEdit}
            />
          </Field>
          <Button type="submit" disabled={!canEdit || isPending}>
            Add score
          </Button>
        </form>
        {error && <p className="text-sm text-rose-400 mt-3">{error}</p>}
        {!canEdit && (
          <p className="text-sm text-amber-300 mt-3">
            Reactivate your subscription to log new scores.
          </p>
        )}
      </Card>

      {scores.length === 0 ? (
        <EmptyState title="No scores yet" description="Once you add one, your rolling window begins." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-950/60">
              <tr className="text-left text-xs uppercase tracking-widest text-ink-400">
                <th className="py-3 px-5">#</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Score</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {scores.map((s, i) => (
                <tr key={s.id}>
                  <td className="py-3 px-5 text-ink-400">{i + 1}</td>
                  <td className="py-3 px-5">
                    {editing === s.id ? (
                      <Input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                      />
                    ) : (
                      formatDate(s.playedAt)
                    )}
                  </td>
                  <td className="py-3 px-5">
                    {editing === s.id ? (
                      <Input
                        type="number"
                        min={1}
                        max={45}
                        value={editValue}
                        onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                      />
                    ) : (
                      <span className="font-display italic text-xl">{s.value}</span>
                    )}
                    {i === 0 && editing !== s.id && <Badge className="ml-2" tone="accent">Latest</Badge>}
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex justify-end gap-2">
                      {editing === s.id ? (
                        <>
                          <Button size="sm" onClick={() => saveEdit(s.id)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(s.id);
                              setEditValue(s.value);
                              setEditDate(s.playedAt.slice(0, 10));
                            }}
                            disabled={!canEdit}
                          >
                            Edit
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => remove(s.id)} disabled={!canEdit}>
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
