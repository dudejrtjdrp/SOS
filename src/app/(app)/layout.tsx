import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { CommandPalette } from "@/components/app/command-palette";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cached per request — shares the same getUser() round-trip with the project
  // layout and pages instead of issuing its own.
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  // Sidebars are provided per-section; the command palette is always available.
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}
