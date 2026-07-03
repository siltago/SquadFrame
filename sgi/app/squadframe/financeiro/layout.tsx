export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[calc(100dvh-56px-env(safe-area-inset-top))]">{children}</div>;
}
