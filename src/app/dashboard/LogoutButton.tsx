"use client";

export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <button onClick={handleLogout} className="cursor-pointer hover:text-ink">
      Log out
    </button>
  );
}
