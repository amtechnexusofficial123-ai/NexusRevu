"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Business = {
  id: string;
  name: string;
  address: string | null;
  logoUrl: string | null;
};

export default function HomePage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/businesses")
      .then((r) => r.json())
      .then((data) => setBusinesses(data.businesses ?? []));
  }, []);

  async function handleDelete(business: Business, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm(
      `Delete “${business.name}”? Its QR link will stop working, and questions and review history will be removed.`
    );
    if (!ok) return;

    setDeletingId(business.id);
    const res = await fetch(`/api/businesses/${business.id}`, { method: "DELETE" });
    setDeletingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not delete business");
      return;
    }

    setBusinesses((list) => (list ?? []).filter((b) => b.id !== business.id));
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Your businesses</h1>
          <p className="text-sm text-ink/60">
            Every client you've set up with a review QR lives here.
          </p>
        </div>
        <button onClick={() => router.push("/dashboard/business/new")} className="btn-primary">
          + Add business
        </button>
      </div>

      {businesses === null ? (
        <p className="text-ink/60">Loading…</p>
      ) : businesses.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-ink/70">No businesses yet.</p>
          <button onClick={() => router.push("/dashboard/business/new")} className="btn-primary">
            + Add your first business
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <div
              key={b.id}
              className="card relative flex items-center gap-4 transition hover:border-brand/40 hover:shadow-md"
            >
              <Link
                href={`/dashboard/business/${b.id}`}
                className="flex min-w-0 flex-1 items-center gap-4"
              >
                {b.logoUrl ? (
                  <img
                    src={b.logoUrl}
                    alt={b.name}
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-light font-display text-brand">
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{b.name}</p>
                  <p className="truncate text-xs text-ink/55">{b.address || "No address set"}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={(e) => handleDelete(b, e)}
                disabled={deletingId === b.id}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                aria-label={`Delete ${b.name}`}
              >
                {deletingId === b.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
