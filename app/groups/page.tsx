import { redirect } from "next/navigation";

import GroupsManagementPanel from "@/components/groups/GroupsManagementPanel";
import { getServerSession } from "@/lib/auth/server";
import { groupService } from "@/lib/services/groupService";

export default async function GroupsPage() {
  const session = await getServerSession();

  if (!session?.user.id) {
    redirect("/auth");
  }

  const directory = await groupService.getDirectory(session.user.id);

  return <GroupsManagementPanel initialDirectory={directory} />;
}
