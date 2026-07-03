import { redirect } from "next/navigation";

export default function ExtratoLegacyRedirect({ params }: { params: { carteiraId: string } }) {
  redirect(`/squadframe/financeiro/carteiras/${params.carteiraId}`);
}
