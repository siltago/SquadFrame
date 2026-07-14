import { AuthLayout } from "@/ui/layouts/AuthLayout";
import { Button } from "@/ui/components/Button";

// Fallback global de rota não encontrada — cobre tanto URLs inexistentes
// quanto páginas que chamam notFound() (ex: pedido/obra excluído). No PWA
// instalado não existe chrome de navegador (sem botão "voltar"), então essa
// tela precisa sempre oferecer um caminho de volta para dentro do app.
export default function NotFound() {
  return (
    <AuthLayout
      logoSrc="/logo-system.png"
      logoAlt="SquadSystem"
      logoSize={72}
      title="Página não encontrada"
      description="O link que você acessou não existe mais ou foi removido."
      cardSize="sm"
    >
      <div className="flex flex-col gap-3">
        <Button as="a" href="/" fullWidth>
          Voltar para o início
        </Button>
      </div>
    </AuthLayout>
  );
}
