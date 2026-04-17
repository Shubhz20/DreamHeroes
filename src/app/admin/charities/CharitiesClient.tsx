"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Field, Input, Textarea } from "@/components/ui";

type C = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  heroImageUrl: string | null;
  category: string;
  isActive: boolean;
  isFeatured: boolean;
  subscribers: number;
  events: number;
};

const empty: Partial<C> = {
  slug: "",
  name: "",
  tagline: "",
  description: "",
  imageUrl: "",
  heroImageUrl: "",
  category: "General",
  isActive: true,
  isFeatured: false,
};

export default function CharitiesClient({ charities }: { charities: C[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<C> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function save() {
    if (!editing) return;
    setErr(null);
    const isNew = !editing.id;
    const url = isNew ? "/api/admin/charities" : `/api/admin/charities/${editing.id}`;
    const method = isNew ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...editing,
        heroImageUrl: editing.heroImageUrl || null,
      }),
    });
    const body = await res.json();
    if (!res.ok) return setErr(body.error ?? "Failed");
    setEditing(null);
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    if (!confirm("Deactivate this charity? It remains linked to existing users/donations.")) return;
    const res = await fetch(`/api/admin/charities/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      alert(body.error ?? "Failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display italic text-4xl">Charities</h1>
          <p className="text-ink-300 mt-1">{charities.length} listed.</p>
        </div>
        <Button onClick={() => setEditing({ ...empty })}>+ New charity</Button>
      </header>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-ink-950/60">
              <tr className="text-left text-xs uppercase tracking-widest text-ink-400">
                <th className="py-3 px-5">Name</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5">Flags</th>
                <th className="py-3 px-5">Supporters</th>
                <th className="py-3 px-5">Events</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {charities.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 px-5">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-ink-400">{c.slug}</div>
                  </td>
                  <td className="py-3 px-5">{c.category}</td>
                  <td className="py-3 px-5 space-x-1">
                    {c.isFeatured && <Badge tone="accent">Featured</Badge>}
                    {c.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Inactive</Badge>}
                  </td>
                  <td className="py-3 px-5">{c.subscribers}</td>
                  <td className="py-3 px-5">{c.events}</td>
                  <td className="py-3 px-5 text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => remove(c.id)}>Deactivate</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl my-10">
            <h3 className="font-display italic text-2xl mb-4">
              {editing.id ? `Edit ${editing.name}` : "New charity"}
            </h3>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Name">
                  <Input
                    value={editing.name ?? ""}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </Field>
                <Field label="Slug" hint="lowercase, a-z 0-9 and -">
                  <Input
                    value={editing.slug ?? ""}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  />
                </Field>
                <Field label="Category">
                  <Input
                    value={editing.category ?? "General"}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  />
                </Field>
                <Field label="Tagline">
                  <Input
                    value={editing.tagline ?? ""}
                    onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                  />
                </Field>
                <Field label="Image URL (card)">
                  <Input
                    value={editing.imageUrl ?? ""}
                    onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
                  />
                </Field>
                <Field label="Hero image URL (optional)">
                  <Input
                    value={editing.heroImageUrl ?? ""}
                    onChange={(e) => setEditing({ ...editing, heroImageUrl: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Description">
                <Textarea
                  rows={5}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Field>
              <div className="flex gap-6 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!editing.isActive}
                    onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!editing.isFeatured}
                    onChange={(e) => setEditing({ ...editing, isFeatured: e.target.checked })}
                  />
                  Featured
                </label>
              </div>
            </div>
            {err && <p className="text-sm text-rose-400 mt-3">{err}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={isPending}>Save</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
