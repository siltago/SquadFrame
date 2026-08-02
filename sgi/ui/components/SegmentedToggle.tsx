// Toggle de duas (ou mais) opções lado a lado, com a opção ativa em
// bg-primary — usado pra alternar "Cor única/Por item" e "Do catálogo/Item
// externo" em Compras. O wrapper (display/raio/tamanho de texto) é
// configurável via className pra caber no visual de cada tela sem mudar
// nada perceptível.
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className = "inline-flex rounded-md border border-border overflow-hidden text-xs",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 transition-colors ${i > 0 ? "border-l border-border" : ""} ${
            value === opt.value ? "bg-primary text-white" : "bg-surface text-text-2 hover:bg-bg"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
