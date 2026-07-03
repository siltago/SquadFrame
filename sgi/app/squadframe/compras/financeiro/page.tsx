import { redirect } from "next/navigation";

export default function FinanceiroLegacyRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const aba = searchParams.aba ?? "dashboard";
  redirect(`/squadframe/financeiro?aba=${aba}`);
}
