import { NextResponse } from "next/server";
import { requireUser, getProjectRole } from "@/lib/api-context";
import { generateProjectInviteToken } from "@/lib/project-invite";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await ctx.params;

  const role = await getProjectRole(user.id, projectId);
  if (user.globalRole !== "ADMIN" && !role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = generateProjectInviteToken(projectId);
  const origin = new URL(req.url).origin;
  const inviteUrl = `${origin}/projects?invite=${encodeURIComponent(token)}`;
  return NextResponse.json({ token, inviteUrl });
}
