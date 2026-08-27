import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <img src="/nexusrevu-mark.svg" alt="NexusRevu" className="mb-4 h-14 w-14" />
      <p className="mb-3 font-body text-sm uppercase tracking-widest text-brand">
        Table-side reviews
      </p>
      <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
        A tap. Three questions.
        <br />A review worth reading.
      </h1>
      <p className="mt-5 max-w-xl font-body text-base text-ink/70">
        Put a QR code on the table. Customers answer a few quick questions —
        star ratings, quick picks, or their own words — we turn their answers
        into a review draft, and they finish it off on Google in their own
        words.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/signup" className="btn-primary">
          Set up your business
        </Link>
        <Link href="/login" className="btn-secondary">
          Log in
        </Link>
      </div>
      <p className="mt-10 text-xs text-ink/40">NexusRevu, by AM Technexus Labs</p>
    </main>
  );
}
