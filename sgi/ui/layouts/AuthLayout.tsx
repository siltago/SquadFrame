import { ReactNode } from "react";
import { cn } from "@/ui/lib/cn";
import Image from "next/image";

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  logoSrc?: string;
  logoAlt?: string;
  logoSize?: number;
  cardSize?: "sm" | "md" | "lg";
  className?: string;
}

const cardSizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

/**
 * Layout centrado para telas de autenticação (login, cadastro, recuperação).
 */
export function AuthLayout({
  children,
  title,
  description,
  logoSrc,
  logoAlt = "Logo",
  logoSize = 48,
  cardSize = "md",
  className,
}: AuthLayoutProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center p-4",
        "bg-bg",
        className
      )}
    >
      <div className={cn("w-full", cardSizes[cardSize])}>
        {/* Branding */}
        {(logoSrc || title) && (
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            {logoSrc && (
              <Image src={logoSrc} alt={logoAlt} width={logoSize} height={logoSize} />
            )}
            {title && (
              <div>
                <h1 className="text-xl font-bold text-text">{title}</h1>
                {description && <p className="mt-1 text-sm text-text-2">{description}</p>}
              </div>
            )}
          </div>
        )}

        {/* Card */}
        <div className="card p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
