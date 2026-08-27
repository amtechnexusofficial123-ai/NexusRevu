"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { fileToLogoDataUrl } from "@/lib/logoUpload";
import { downloadQrImage } from "@/lib/qrDownload";

type Business = {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  description: string | null;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("details");
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [questionCount, setQuestionCount] = useState(0);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [reviewQrDataUrl, setReviewQrDataUrl] = useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [manageQrDataUrl, setManageQrDataUrl] = useState<string | null>(null);
  const [manageUrl, setManageUrl] = useState<string | null>(null);
  const [downloadingReviewQr, setDownloadingReviewQr] = useState(false);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/businesses/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setBusiness(data.business);
        setName(data.business.name ?? "");
        setAddress(data.business.address ?? "");
        setCategory(data.business.category ?? "");
        setDescription(data.business.description ?? "");
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

  async function handleLogoFile(file: File | null) {
    if (!file) return;
    setDetailsError(null);
    setDetailsMessage(null);
    setUploadingLogo(true);
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      setLogoUrl(dataUrl);
      setDetailsMessage("Logo ready — save changes to keep it.");
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Could not read that image");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setDetailsError(null);
    setDetailsMessage(null);
    setSavingDetails(true);

    const payload = { name, address, category, description, logoUrl, googlePlaceId };

    if (isNew) {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      body: JSON.stringify(payload),
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

  async function handleDownloadReviewQr() {
    if (!reviewQrDataUrl || !business) return;
    setDownloadingReviewQr(true);
    try {
      await downloadQrImage(
        reviewQrDataUrl,
        `${business.slug}-review-qr.png`,
        business.logoUrl ?? logoUrl
      );
    } catch {
      setDetailsError("Could not download QR image");
    } finally {
      setDownloadingReviewQr(false);
    }
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
            <label className="mb-1 block text-sm font-medium text-ink/80">Category</label>
            <input
              className="input"
              placeholder="e.g. Bakery, cake shop"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/80">Business description</label>
            <textarea
              className="input min-h-[100px]"
              placeholder="What does this business do? e.g. Custom cakes, pastries, and coffee."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-ink/50">
              A short summary of what they offer. Used when drafting reviews.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/80">Address</label>
            <input
              className="input"
              placeholder="123 MG Road, Chennai"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink/80">Logo</label>
            <div className="flex flex-wrap items-center gap-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Business logo preview"
                  className="h-16 w-16 rounded-full border border-ink/10 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-light font-display text-xl text-brand">
                  {(name || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={uploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingLogo ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    className="btn-secondary text-red-600"
                    disabled={uploadingLogo}
                    onClick={() => {
                      setLogoUrl("");
                      setDetailsMessage("Logo removed — save changes to keep it.");
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-ink/50">
              PNG, JPG, or WebP up to 5MB. We&apos;ll resize it automatically.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/80">Google Place ID</label>
            <input
              className="input"
              placeholder="ChIJ…"
              value={googlePlaceId}
              onChange={(e) => setGooglePlaceId(e.target.value)}
              required
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
          <button className="btn-primary self-start" disabled={savingDetails || uploadingLogo}>
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
            Put this on the table. Customers scan it, answer 3–4 random questions, and get a review
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
              <button
                type="button"
                onClick={handleDownloadReviewQr}
                disabled={downloadingReviewQr}
                className="btn-secondary"
              >
                {downloadingReviewQr ? "Preparing…" : "Download QR"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
