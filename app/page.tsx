import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/authOptions";
import { getPostAuthRedirectPath } from "@/lib/getPostAuthRedirectPath";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  redirect(getPostAuthRedirectPath(session?.user));
}
