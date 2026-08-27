"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

type Business = {
  id: string;
  name: string;
  address: string | null;
  logoUrl: string | null;
  googlePlaceId: string | null;
  slug: string;
};

type Tab = "details" | "questions" | "qr";

export default function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";

  const [tab, setTab] = useState<Tab>("details");
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [questionCount, setQuestionCount] = useState(0);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [reviewQrDataUrl, setReviewQrDataUrl] = useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [manageQrDataUrl, setManageQrDataUrl] = useState<string | null>(null);
  const [manageUrl, setManageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/businesses/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setBusiness(data.business);
        setName(data.business.name ?? "");
        setAddress(data.business.address ?? "");
        setLogoUrl(data.business.logoUrl ?? "");
        setGooglePlaceId(data.business.googlePlaceId ?? "");
        setLoading(false);
      });
    fetch(`/api/businesses/${id}/questions`)
      .then((r) => r.json())
      .then((data) => setQuestionCount((data.questions ?? []).length));
    fetch(`/api/businesses/${id}/qr`)
      .then((r) => r.json())
      .then((data) => {
        setReviewQrDataUrl(data.reviewQrDataUrl ?? data.qrDataUrl);
        setReviewUrl(data.reviewUrl);
        setManageQrDataUrl(data.manageQrDataUrl);
        setManageUrl(data.manageUrl);
      });
  }, [id, isNew]);

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setDetailsError(null);
    setDetailsMessage(null);
    if (!name.trim()) {
      setDetailsError("Business name is required");
      return;
    }
    setSavingDetails(true);

    if (isNew) {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, logoUrl, googlePlaceId }),
      });
      const data = await res.json();
      setSavingDetails(false);
      if (!res.ok) {
        setDetailsError(data.error ?? "Something went wrong");
        return;
      }
      router.replace(`/dashboard/business/${data.business.id}`);
      setTab("questions");
      return;
    }

    const res = await fetch(`/api/businesses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, logoUrl, googlePlaceId }),
    });
    const data = await res.json();
    setSavingDetails(false);
    if (!res.ok) {
      setDetailsError(data.error ?? "Something went wrong");
      return;
    }
    setBusiness(data.business);
    setDetailsMessage("Saved.");
  }

  if (loading) return <p className="text-ink/60">Loading…</p>;

  const tabs: { id: Tab; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "questions", label: "Questions" },
    { id: "qr", label: "Customer QR" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">
            {isNew ? "Add a business" : business?.name}
          </h1>
          <p className="text-sm text-ink/60">
            {isNew ? "Fill in the details, then set up their review questions." : business?.address}
          </p>
        </div>
        <div className="flex gap-1 self-start rounded-full bg-brand-light p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              disabled={t.id !== "details" && isNew}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 ${
                tab === t.id ? "bg-white text-ink shadow-sm" : "text-ink/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "details" && (
        <form onSubmit={handleSaveDetails} className="card flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/80">Business name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/80">Address</label>
            <input
              className="input"
              placeholder="123 MG Road, Chennai"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/80">Logo URL</label>
            <input
              className="input"
              placeholder="https://…/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/80">Google Place ID</label>
            <input
              className="input"
              placeholder="ChIJ…"
              value={googlePlaceId}
              onChange={(e) => setGooglePlaceId(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink/50">
              Find yours with Google&apos;s{" "}
              <a
                className="text-brand underline"
                href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                target="_blank"
                rel="noreferrer"
              >
                Place ID Finder
              </a>
              .
            </p>
          </div>
          {detailsError && <p className="text-sm text-red-600">{detailsError}</p>}
          {detailsMessage && <p className="text-sm text-brand">{detailsMessage}</p>}
          <button className="btn-primary self-start" disabled={savingDetails}>
            {savingDetails ? "Saving…" : isNew ? "Create business" : "Save changes"}
          </button>
        </form>
      )}

      {tab === "questions" && !isNew && (
        <div className="card flex flex-col items-center gap-4 text-center">
          <h2 className="font-display text-lg text-ink">Questions QR</h2>
          <p className="max-w-md text-sm text-ink/60">
            Business staff scan this to view and update questions on their phone.
            {questionCount === 0
              ? " No questions yet — scanning lets them add the first one."
              : ` Currently ${questionCount} question${questionCount === 1 ? "" : "s"} saved.`}
          </p>
          {manageQrDataUrl ? (
            <img
              src={manageQrDataUrl}
              alt="Manage questions QR code"
              className="h-44 w-44 rounded-card border border-ink/10"
            />
          ) : (
            <p className="text-ink/50">Generating…</p>
          )}
          {manageUrl && <p className="break-all text-xs text-ink/50">{manageUrl}</p>}
          <div className="flex flex-wrap justify-center gap-3">
            {manageQrDataUrl && (
              <a
                href={manageQrDataUrl}
                download={`${business?.slug}-questions-qr.png`}
                className="btn-secondary"
              >
                Download QR
              </a>
            )}
            {manageUrl && (
              <a href={manageUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                Open editor
              </a>
            )}
          </div>
        </div>
      )}

      {tab === "qr" && !isNew && (
        <div className="card flex flex-col items-center gap-4 text-center">
          <h2 className="font-display text-lg text-ink">Customer review QR</h2>
          <p className="max-w-md text-sm text-ink/60">
            Put this on the table. Customers scan it, answer 3 random questions, and get a review
            draft to post on Google.
          </p>
          {reviewQrDataUrl ? (
            <img
              src={reviewQrDataUrl}
              alt="Customer review QR code"
              className="h-44 w-44 rounded-card border border-ink/10"
            />
          ) : (
            <p className="text-ink/50">Generating…</p>
          )}
          {reviewUrl && <p className="break-all text-xs text-ink/50">{reviewUrl}</p>}
          <div className="flex flex-wrap justify-center gap-3">
            {reviewQrDataUrl && (
              <a
                href={reviewQrDataUrl}
                download={`${business?.slug}-review-qr.png`}
                className="btn-secondary"
              >
                Download QR
              </a>
            )}
            {reviewUrl && (
              <a href={reviewUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                Preview flow
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
