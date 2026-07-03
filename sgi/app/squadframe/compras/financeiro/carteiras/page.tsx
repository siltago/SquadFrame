import { redirect } from "next/navigation";

export default function CarteirasLegacyRedirect() {
  redirect("/squadframe/financeiro?aba=carteiras");
}
