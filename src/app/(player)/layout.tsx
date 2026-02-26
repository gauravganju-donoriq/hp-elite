import { PlayerNavbar } from "@/components/player-navbar";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PlayerNavbar />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </>
  );
}
