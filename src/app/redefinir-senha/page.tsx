import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/auth/session";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Nova senha — Vektra" };

export default async function ResetPasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login?erro=link");

  return (
    <div className="flex min-h-dvh flex-col px-6 py-8 md:px-12">
      <Logo />
      <div className="flex flex-1 items-center justify-center py-12">
        <ResetPasswordForm email={session.email} />
      </div>
    </div>
  );
}
