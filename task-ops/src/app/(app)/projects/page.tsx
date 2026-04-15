"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";

export default function ProjectsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [joinId, setJoinId] = useState("");
  const [joinMsg, setJoinMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const r = await fetch("/api/projects", { cache: "no-store" });
      if (!r.ok) throw new Error("failed");
      return r.json() as Promise<{
        projects: {
          id: string;
          name: string;
          description: string | null;
          archived: boolean;
          _count: { tasks: number };
          members?: { role: string; user?: { name?: string | null; email?: string | null } }[];
        }[];
      }>;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const create = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc || undefined }),
      });
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setName("");
      setDesc("");
    },
  });

  const join = useMutation({
    mutationFn: async (payload: { projectId?: string; inviteToken?: string }) => {
      const r = await fetch("/api/projects/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "加入失败");
      return j as { ok: true; project: { id: string; name: string } };
    },
    onSuccess: async (res) => {
      setJoinMsg(`已加入项目：${res.project.name}`);
      setJoinId("");
      await qc.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/project/${res.project.id}`);
    },
    onError: (e) => {
      setJoinMsg(e instanceof Error ? e.message : "加入失败");
    },
  });

  useEffect(() => {
    const inviteToken = new URLSearchParams(window.location.search).get("invite");
    if (!inviteToken || join.isPending) return;
    setJoinMsg("检测到邀请链接，正在加入项目...");
    join.mutate({ inviteToken });
    // no deps on join.mutate reference by design
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyInvite = useMutation({
    mutationFn: async (projectId: string) => {
      const r = await fetch(`/api/projects/${projectId}/invite`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.inviteUrl) throw new Error(j?.error || "生成邀请链接失败");
      return j as { inviteUrl: string };
    },
    onSuccess: async ({ inviteUrl }) => {
      await navigator.clipboard.writeText(inviteUrl);
      setJoinMsg("邀请链接已复制，可发给其他账号加入同一项目");
    },
    onError: (e) => {
      setJoinMsg(e instanceof Error ? e.message : "生成邀请链接失败");
    },
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">加载项目…</div>;
  }

  const projects = data?.projects ?? [];
  const joinByInput = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setJoinMsg(null);
    if (v.startsWith("http://") || v.startsWith("https://")) {
      try {
        const token = new URL(v).searchParams.get("invite");
        if (token) {
          join.mutate({ inviteToken: token });
          return;
        }
      } catch {}
    }
    const matched = projects.find((p) => p.id === v || p.name === v);
    join.mutate({ projectId: matched?.id ?? v });
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-6">
      <div className="rounded-xl border bg-card p-4">
        <h1 className="text-xl font-semibold">项目</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          上方管理项目；向下可查看项目列表。风格已按你原来的网页布局还原。
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">加入项目</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            输入项目 ID 或完整项目名称；也可以直接粘贴邀请链接。
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-full max-w-md"
              placeholder="项目 ID / 名称 / 邀请链接"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
            />
            <Button
              variant="default"
              disabled={!joinId.trim() || join.isPending}
              onClick={() => joinByInput(joinId)}
            >
              {join.isPending ? "加入中..." : "加入并打开"}
            </Button>
          </div>
          {joinMsg ? <p className="text-sm text-muted-foreground">{joinMsg}</p> : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>+ 新建项目</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建项目</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>名称</Label>
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>描述</Label>
                <Textarea className="mt-1" value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
              <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button variant="outline" disabled>
          + 串联项目（待接入）
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr className="border-b">
                  <th className="px-4 py-3 font-medium">名称</th>
                  <th className="px-4 py-3 font-medium">负责人 / 成员</th>
                  <th className="px-4 py-3 font-medium">项目 ID</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                      暂无项目，请点上方「+ 新建项目」。
                    </td>
                  </tr>
                ) : null}
                {projects.map((p) => {
                  const owner =
                    p.members?.find((m) => m.role === "ADMIN")?.user?.name ||
                    p.members?.[0]?.user?.name ||
                    p.members?.find((m) => m.role === "ADMIN")?.user?.email ||
                    "—";
                  const memberCount = p.members?.length ?? 0;
                  return (
                    <tr key={p.id} className="border-b align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        {p.archived ? (
                          <span className="mt-1 inline-block rounded border px-2 py-0.5 text-xs text-muted-foreground">
                            已归档
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {owner} / {memberCount} 人
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm">
                            <Link href={`/project/${p.id}`}>打开</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={copyInvite.isPending}
                            onClick={() => copyInvite.mutate(p.id)}
                          >
                            复制分享链接
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/projects/${p.id}/settings`}>编辑</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
