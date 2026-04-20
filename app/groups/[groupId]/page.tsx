import { notFound, redirect } from "next/navigation";

import GroupDetailPanel from "@/components/groups/GroupDetailPanel";
import { getServerSession } from "@/lib/auth/server";
import { groupService } from "@/lib/services/groupService";

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const session = await getServerSession();

  if (!session?.user.id) {
    redirect("/auth");
  }

  const { groupId } = await params;
  let detail;

  try {
    detail = await groupService.getGroupDetail(session.user.id, groupId);
  } catch {
    notFound();
  }

  return <GroupDetailPanel initialDetail={detail} />;
}
