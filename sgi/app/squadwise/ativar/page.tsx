import { AtivarConviteForm } from "@/modules/wise/identity/components/ativar-convite-form";

export default function AtivarConvitePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return <AtivarConviteForm token={searchParams.token ?? ""} />;
}
