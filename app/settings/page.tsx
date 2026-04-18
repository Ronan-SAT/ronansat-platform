import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import SettingsPageClient from "@/components/settings/SettingsPageClient";
import { authOptions } from "@/lib/authOptions";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth");
  }

  return (
    <SettingsPageClient
      initialName={session.user.name ?? ""}
      initialEmail={session.user.email ?? ""}
      initialUsername={session.user.username ?? ""}
      initialBirthDate={session.user.birthDate ?? ""}
    />
  );
}
