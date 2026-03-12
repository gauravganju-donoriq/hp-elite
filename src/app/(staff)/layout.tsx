import { StaffNavbar } from "@/components/staff-navbar";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StaffNavbar />
      <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </>
  );
}
