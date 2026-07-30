"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resolverCodigosImportadosAction,
  listarLinhasAction,
  listarTiposLinhaAction,
  criarProdutoRapidoAction,
  criarLinhaRapidaAction,
  descartarCodigoXmlAction,
  criarAliasParaCodigoXmlAction,
} from "@/modules/squadframe/package-procurement/actions";
import { parseNecessidadesXml } from "@/modules/squadframe/package-procurement/lib/xml-necessidades";
import { calcularBarras, KERF_MM, COMPRIMENTO_BARRA_PADRAO_MM } from "@/modules/squadframe/package-procurement/lib/otimizacao-corte";
import { lerArquivoXml } from "@/modules/squadframe/lib/xml-tipologias";
import { criarSolicitacao } from "@/modules/squadframe/actions/compras/solicitacoes";
import type { ItemXmlResolvido, DecisaoItemXml } from "@/modules/squadframe/package-procurement/types";

type ProdutoBusca = { id: string; codigo_mestre: string; nome: string; unidade: string; tamanho_mm: number | null };

type LinhaRevisao = ReturnType<typeof parseNecessidadesXml>[number] & {
  incluir: boolean;
  produto_id: string | null;
  produto_codigo_mestre: string | null;
  produto_nome: string | null;
  tamanho_mm: number | null;
  cor_id: string | null;
  jaResolvido: boolean;
  precisaCriarAlias: boolean;
  cadastrando: boolean;
};

function ItemResolvidoCount({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
      {n} já resolvido{n > 1 ? "s" : ""} automaticamente
    </span>
  );
}

// Mesmo fluxo de import de XML de necessidades já usado no SquadWise
// (resolve código→produto automaticamente por codigo_mestre/alias, revisão
// manual só do que sobrou), mas o "Confirmar importação" aqui vira uma
// Solicitação de Compra de verdade (criarSolicitacao) em vez de uma
// necessidade Wise — é exatamente o que "importar ordem de compra do Wise"
// deveria fazer no lado de Compras.
export function ImportarSolicitacaoXml({ obraId, loteId }: { obraId: string; loteId?: string }) {
  const router = useRouter();
  const [linhas, setLinhas] = useState<{ id: string; nome: string; tipo: string }[]>([]);
  const [tiposLinha, setTiposLinha] = useState<{ nome: string; slug: string }[]>([]);
  const [itens, setItens] = useState<LinhaRevisao[] | null>(null);
  const [resolvidosAuto, setResolvidosAuto] = useState<ItemXmlResolvido[]>([]);
  const [ignoradosAuto, setIgnoradosAuto] = useState(0);
  // Filtro de origem — só controla o que aparece e o que é enviado na
  // confirmação, não muda nada no que já foi lido/resolvido do XML. Trocar
  // o filtro não precisa reimportar.
  const [filtroOrigem, setFiltroOrigem] = useState<"todos" | "perfil" | "componente">("todos");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const itensFiltrados = (itens ?? []).filter((i) => filtroOrigem === "todos" || i.origem === filtroOrigem);
  const resolvidosAutoFiltrados = resolvidosAuto.filter((r) => filtroOrigem === "todos" || r.origem === filtroOrigem);

  useEffect(() => {
    listarLinhasAction().then(setLinhas).catch(() => setLinhas([]));
    listarTiposLinhaAction().then(setTiposLinha).catch(() => setTiposLinha([]));
  }, []);

  function adicionarLinha(l: { id: string; nome: string; tipo: string }) {
    setLinhas((prev) => (prev.some((x) => x.id === l.id) ? prev : [...prev, l]));
  }

  function handleXmlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setErro(null);
    setCarregando(true);
    lerArquivoXml(file)
      .then(async (text) => {
        const parsed = parseNecessidadesXml(text);
        if (parsed.length === 0) { setErro("Nenhum material encontrado no XML."); return; }
        const resolucao = await resolverCodigosImportadosAction(parsed);
        setResolvidosAuto(resolucao.resolvidos);
        setIgnoradosAuto(resolucao.ignorados);
        const pendentesRevisao: LinhaRevisao[] = resolucao.pendentes.map((p) => ({
          ...p, incluir: true, produto_id: null, produto_codigo_mestre: null,
          produto_nome: null, tamanho_mm: null, jaResolvido: false,
          precisaCriarAlias: false, cadastrando: false,
        }));
        if (pendentesRevisao.length === 0 && resolucao.resolvidos.length === 0) {
          setErro("Todos os itens do XML já foram importados ou marcados como não incluir anteriormente.");
          return;
        }
        setItens(pendentesRevisao);
      })
      .catch(() => setErro("Erro ao ler o arquivo XML."))
      .finally(() => setCarregando(false));
  }

  function cancelar() {
    setItens(null);
    setResolvidosAuto([]);
    setIgnoradosAuto(0);
    setFiltroOrigem("todos");
    setErro(null);
  }

  function patch(key: number, fn: (i: LinhaRevisao) => LinhaRevisao) {
    setItens((prev) => prev?.map((i) => (i._key === key ? fn(i) : i)) ?? null);
  }

  function toggleIncluir(key: number) {
    patch(key, (i) => ({ ...i, incluir: !i.incluir }));
  }

  // Diferente de "incluir" (só decide se entra nesta solicitação, não
  // persiste nada): descartar marca o código como definitivamente
  // irrelevante — não aparece mais em nenhuma importação futura de XML,
  // pra qualquer obra/lote (mesma memória global já usada no Wise).
  function descartar(item: LinhaRevisao) {
    startTransition(async () => {
      const res = await descartarCodigoXmlAction(item.codigo);
      if (!res.ok) { setErro(res.erro); return; }
      setItens((prev) => prev?.filter((i) => i._key !== item._key) ?? null);
    });
  }

  function updateOrigem(key: number, origem: "componente" | "perfil") {
    patch(key, (i) => ({ ...i, origem }));
  }

  function selecionarProduto(key: number, p: ProdutoBusca) {
    patch(key, (i) => ({
      ...i, produto_id: p.id, produto_codigo_mestre: p.codigo_mestre,
      produto_nome: p.nome, tamanho_mm: p.tamanho_mm, precisaCriarAlias: true, cadastrando: false,
    }));
  }

  function abrirCadastro(key: number) {
    patch(key, (i) => ({ ...i, cadastrando: true }));
  }

  function confirmarCadastro(key: number, produto: { id: string; codigo_mestre: string; nome: string; tamanho_mm: number | null }) {
    patch(key, (i) => ({
      ...i, produto_id: produto.id, produto_codigo_mestre: produto.codigo_mestre,
      produto_nome: produto.nome, tamanho_mm: produto.tamanho_mm, precisaCriarAlias: true, cadastrando: false,
    }));
  }

  function confirmar() {
    if (!itens) return;
    setErro(null);
    for (const i of itensFiltrados) {
      if (i.incluir && !i.produto_id) {
        setErro(`Item "${i.codigo}" precisa de um código mestre (ou desmarque "incluir").`);
        return;
      }
    }
    // Só o que está visível no filtro atual entra nesta solicitação (ex:
    // filtro em "Perfis" ignora os componentes por enquanto). Como
    // criarSolicitacao redireciona pra tela da solicitação criada, pra
    // importar os componentes também é preciso reabrir e reimportar o
    // mesmo XML depois, com o filtro em "Componentes" — nada se perde,
    // já que só ficam de fora itens nunca marcados como incluídos.
    const decisoesRevisao: DecisaoItemXml[] = itensFiltrados.filter((i) => i.incluir).map((i) => ({
      _key: i._key, origem: i.origem, codigo: i.codigo, descricao: i.descricao,
      quantidade: i.quantidade, unidade: i.unidade, cortesMm: i.cortesMm, cor_id: i.cor_id,
      incluir: i.incluir, produto_id: i.produto_id, tamanho_mm: i.tamanho_mm,
      precisa_criar_alias: i.precisaCriarAlias,
    }));
    const decisoesResolvidas: DecisaoItemXml[] = resolvidosAutoFiltrados.map((r) => ({
      _key: r._key, origem: r.origem, codigo: r.codigo, descricao: r.descricao,
      quantidade: r.quantidade, unidade: r.unidade, cortesMm: r.cortesMm, cor_id: r.cor_id,
      incluir: true, produto_id: r.produto_id, tamanho_mm: r.tamanho_mm,
      precisa_criar_alias: false,
    }));
    const decisoes = [...decisoesResolvidas, ...decisoesRevisao];
    if (decisoes.length === 0) { setErro("Nenhum item incluído."); return; }

    // Perfil vem do XML em metros de corte (cortesMm) — a solicitação
    // precisa da quantidade em barras comerciais, não em metros (mesma
    // conversão que confirmarImportacaoXml já faz pro Wise).
    const fd = new FormData();
    fd.set("obra_id", obraId);
    fd.set("origem", "OBRA");
    fd.set("prioridade", "NORMAL");
    fd.set("observacoes", "Importado via XML");
    fd.set("itens", JSON.stringify(decisoes.map((d) => {
      const ehPerfil = d.origem === "perfil";
      const quantidade = ehPerfil
        ? calcularBarras(d.cortesMm, d.tamanho_mm ?? COMPRIMENTO_BARRA_PADRAO_MM, KERF_MM).barras
        : d.quantidade;
      const unidade = ehPerfil ? "barra" : d.unidade;
      return {
        produto_id: d.produto_id,
        quantidade,
        unidade,
        observacoes: `${d.codigo} — ${d.descricao}`,
        cor_id: d.cor_id,
      };
    })));
    if (loteId) {
      fd.set("lote_id", loteId);
      fd.set("origem_contexto", "PRODUCAO_PACOTE");
    }

    // Código resolvido manualmente na revisão (produto escolhido na busca
    // ou recém-cadastrado) precisa virar alias (código XML → produto,
    // fornecedor "Preference") — sem isso, o mesmo código pede confirmação
    // de novo em toda importação futura, mesmo já tendo sido resolvido aqui.
    const paraCriarAlias = decisoes.filter((d) => d.precisa_criar_alias && d.produto_id);

    startTransition(async () => {
      try {
        await Promise.all(paraCriarAlias.map((d) => criarAliasParaCodigoXmlAction(d.codigo, d.produto_id!)));
        await criarSolicitacao(fd);
        cancelar();
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Não foi possível criar a solicitação.");
      }
    });
  }

  if (itens !== null) {
    const totalPerfil = itens.filter((i) => i.origem === "perfil").length + resolvidosAuto.filter((r) => r.origem === "perfil").length;
    const totalComponente = itens.filter((i) => i.origem === "componente").length + resolvidosAuto.filter((r) => r.origem === "componente").length;
    return (
      <div className="space-y-3 rounded-lg border border-primary/30 bg-primary-soft p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-text">
              {itensFiltrados.length > 0 ? `${itensFiltrados.length} código(s) para revisar` : "Nada para revisar"}
            </p>
            <ItemResolvidoCount n={resolvidosAutoFiltrados.length} />
            {ignoradosAuto > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {ignoradosAuto} ignorado{ignoradosAuto > 1 ? "s" : ""} anteriormente
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={confirmar}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Criando solicitação…" : "Confirmar e criar solicitação"}
            </button>
            <button type="button" onClick={cancelar} className="text-xs text-text-3 hover:text-text-2">
              Cancelar
            </button>
          </div>
        </div>

        {/* Escopo desta solicitação — tudo, só perfis ou só componentes.
            Trocar aqui não perde nada do que já foi lido/resolvido do XML. */}
        <div className="flex items-center gap-1.5">
          {([
            ["todos", `Tudo (${itens.length + resolvidosAuto.length})`],
            ["perfil", `Só perfis (${totalPerfil})`],
            ["componente", `Só componentes (${totalComponente})`],
          ] as const).map(([valor, label]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltroOrigem(valor)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                filtroOrigem === valor ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-2 hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {itensFiltrados.length > 0 && (
          <div className="max-h-96 space-y-1.5 overflow-y-auto">
            {itensFiltrados.map((i) => (
              <LinhaRevisaoRow
                key={i._key}
                item={i}
                linhas={linhas}
                tiposLinha={tiposLinha}
                onLinhaCriada={adicionarLinha}
                onToggleIncluir={() => toggleIncluir(i._key)}
                onOrigemChange={(o) => updateOrigem(i._key, o)}
                onSelecionarProduto={(p) => selecionarProduto(i._key, p)}
                onAbrirCadastro={() => abrirCadastro(i._key)}
                onFecharCadastro={() => patch(i._key, (x) => ({ ...x, cadastrando: false }))}
                onConfirmarCadastro={(p) => confirmarCadastro(i._key, p)}
                onDescartar={() => descartar(i)}
              />
            ))}
          </div>
        )}
        {erro && <p className="text-xs text-danger">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={carregando}
        onClick={() => fileRef.current?.click()}
        className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
      >
        {carregando ? "Lendo XML…" : "Importar solicitação"}
      </button>
      <input ref={fileRef} type="file" accept=".xml,text/xml" className="hidden" onChange={handleXmlChange} />
      {erro && <span className="text-xs text-danger">{erro}</span>}
    </div>
  );
}

function LinhaRevisaoRow({
  item, linhas, tiposLinha, onLinhaCriada, onToggleIncluir, onOrigemChange, onSelecionarProduto, onAbrirCadastro, onFecharCadastro, onConfirmarCadastro, onDescartar,
}: {
  item: LinhaRevisao;
  linhas: { id: string; nome: string; tipo: string }[];
  tiposLinha: { nome: string; slug: string }[];
  onLinhaCriada: (l: { id: string; nome: string; tipo: string }) => void;
  onToggleIncluir: () => void;
  onOrigemChange: (o: "componente" | "perfil") => void;
  onSelecionarProduto: (p: ProdutoBusca) => void;
  onAbrirCadastro: () => void;
  onFecharCadastro: () => void;
  onConfirmarCadastro: (p: { id: string; codigo_mestre: string; nome: string; tamanho_mm: number | null }) => void;
  onDescartar: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={item.incluir} onChange={onToggleIncluir} className="shrink-0" title="Incluir nesta solicitação?" />
        <span className="shrink-0 font-mono text-[11px] text-text-3 w-24 truncate" title={item.codigo}>{item.codigo}</span>
        <span className="flex-1 min-w-0 truncate" title={item.descricao}>{item.descricao}</span>
        <button
          type="button"
          onClick={onDescartar}
          title="Descartar este código pra sempre — não aparece mais em nenhuma importação futura"
          className="shrink-0 rounded-md border border-transparent px-1.5 py-1 text-[11px] font-medium text-text-3 hover:border-danger/40 hover:text-danger"
        >
          Descartar
        </button>
        <select
          value={item.origem}
          onChange={(e) => onOrigemChange(e.target.value as "componente" | "perfil")}
          disabled={!item.incluir}
          className="shrink-0 rounded-md border border-border bg-bg px-1.5 py-1 text-[11px] disabled:opacity-50"
        >
          <option value="componente">componente</option>
          <option value="perfil">perfil</option>
        </select>
        <div className="w-56 shrink-0">
          {!item.incluir ? (
            <span className="text-xs text-text-3">não incluir</span>
          ) : item.produto_id ? (
            <span className="flex items-center gap-1 truncate rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700" title={item.produto_nome ?? ""}>
              <span className="font-mono">{item.produto_codigo_mestre}</span>
              <span className="truncate">— {item.produto_nome}</span>
            </span>
          ) : item.cadastrando ? null : (
            <div className="flex items-center gap-1">
              <ProdutoMestreBusca onSelect={onSelecionarProduto} />
              <button
                type="button"
                onClick={onAbrirCadastro}
                className="shrink-0 rounded-md border border-primary/40 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
              >
                Cadastrar
              </button>
            </div>
          )}
        </div>
      </div>
      {item.incluir && item.cadastrando && !item.produto_id && (
        <CadastroInline
          codigoXml={item.codigo}
          origem={item.origem}
          linhas={linhas}
          tiposLinha={tiposLinha}
          onLinhaCriada={onLinhaCriada}
          onCancelar={onFecharCadastro}
          onCriado={onConfirmarCadastro}
        />
      )}
    </div>
  );
}

function ProdutoMestreBusca({ onSelect }: { onSelect: (p: ProdutoBusca) => void }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ProdutoBusca[]>([]);
  const [aberto, setAberto] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResultados([]); return; }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/produtos/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((data: ProdutoBusca[]) => { setResultados(data); setAberto(true); })
        .catch(() => setResultados([]));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="relative flex-1 min-w-0">
      <input
        className="w-full rounded-md border border-border bg-bg px-2 py-1 text-xs"
        placeholder="código mestre…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => resultados.length > 0 && setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      />
      {aberto && resultados.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-56 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
          {resultados.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(p); setQuery(""); setResultados([]); setAberto(false); }}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-bg"
            >
              <span className="shrink-0 font-mono text-text-3">{p.codigo_mestre}</span>
              <span className="flex-1 truncate">{p.nome}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CadastroInline({
  codigoXml, origem, linhas, tiposLinha, onLinhaCriada, onCancelar, onCriado,
}: {
  codigoXml: string;
  origem: "componente" | "perfil";
  linhas: { id: string; nome: string; tipo: string }[];
  tiposLinha: { nome: string; slug: string }[];
  onLinhaCriada: (l: { id: string; nome: string; tipo: string }) => void;
  onCancelar: () => void;
  onCriado: (p: { id: string; codigo_mestre: string; nome: string; tamanho_mm: number | null }) => void;
}) {
  const linhasOrdenadas = [...linhas].sort((a, b) => {
    const prioridade = (t: string) => (origem === "perfil" ? (t === "PERFIL" ? 0 : 1) : (t === "PERFIL" ? 1 : 0));
    return prioridade(a.tipo) - prioridade(b.tipo);
  });

  const [codigoMestre, setCodigoMestre] = useState(codigoXml);
  const [nomeTecnico, setNomeTecnico] = useState("");
  const [linha, setLinha] = useState<{ id: string; nome: string; tipo: string } | null>(linhasOrdenadas[0] ?? null);
  const [unidade, setUnidade] = useState(origem === "perfil" ? "BARRA" : "UN");
  const [comprimentoBarraMm, setComprimentoBarraMm] = useState(6000);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function salvar() {
    if (!codigoMestre.trim() || !nomeTecnico.trim() || !linha) {
      setErro("Preencha código mestre, nome técnico e linha.");
      return;
    }
    setErro(null);
    setSalvando(true);
    criarProdutoRapidoAction({
      linha_id: linha.id,
      codigo_mestre: codigoMestre.trim(),
      nome_tecnico: nomeTecnico.trim(),
      unidade,
      tamanho_mm: origem === "perfil" ? comprimentoBarraMm : null,
    })
      .then((p) => onCriado({ id: p.id, codigo_mestre: p.codigo_mestre, nome: p.nome, tamanho_mm: origem === "perfil" ? comprimentoBarraMm : null }))
      .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível cadastrar o produto."))
      .finally(() => setSalvando(false));
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-md border border-primary/30 bg-primary-soft/50 p-2">
      <input
        className="w-32 rounded-md border border-border bg-bg px-2 py-1 text-xs"
        placeholder="código mestre"
        value={codigoMestre}
        onChange={(e) => setCodigoMestre(e.target.value)}
      />
      <input
        className="w-40 flex-1 min-w-32 rounded-md border border-border bg-bg px-2 py-1 text-xs"
        placeholder="nome técnico"
        value={nomeTecnico}
        onChange={(e) => setNomeTecnico(e.target.value)}
      />
      <LinhaCombobox
        linhas={linhasOrdenadas}
        tiposLinha={tiposLinha}
        origem={origem}
        valor={linha}
        onSelecionar={setLinha}
        onCriada={(l) => { onLinhaCriada(l); setLinha(l); }}
      />
      <input
        className="w-16 rounded-md border border-border bg-bg px-2 py-1 text-xs"
        placeholder="unidade"
        value={unidade}
        onChange={(e) => setUnidade(e.target.value)}
      />
      {origem === "perfil" && (
        <label className="flex items-center gap-1 text-[11px] text-text-3">
          barra (mm)
          <input
            type="number"
            min="1"
            className="w-20 rounded-md border border-border bg-bg px-2 py-1 text-xs"
            value={comprimentoBarraMm}
            onChange={(e) => setComprimentoBarraMm(parseFloat(e.target.value) || 0)}
          />
        </label>
      )}
      <button
        type="button"
        disabled={salvando}
        onClick={salvar}
        className="rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {salvando ? "Salvando…" : "Salvar"}
      </button>
      <button type="button" onClick={onCancelar} className="text-[11px] text-text-3 hover:text-text-2">
        cancelar
      </button>
      {erro && <span className="w-full text-[11px] text-danger">{erro}</span>}
    </div>
  );
}

// Campo de linha digitável: filtra as linhas existentes por nome enquanto o
// usuário digita; se não achar nenhuma, oferece criar uma nova linha ali
// mesmo (nome pré-preenchido, tipo pré-selecionado pela origem — sempre
// editável).
function LinhaCombobox({
  linhas, tiposLinha, origem, valor, onSelecionar, onCriada,
}: {
  linhas: { id: string; nome: string; tipo: string }[];
  tiposLinha: { nome: string; slug: string }[];
  origem: "componente" | "perfil";
  valor: { id: string; nome: string; tipo: string } | null;
  onSelecionar: (l: { id: string; nome: string; tipo: string }) => void;
  onCriada: (l: { id: string; nome: string; tipo: string }) => void;
}) {
  const [query, setQuery] = useState(valor?.nome ?? "");
  const [aberto, setAberto] = useState(false);
  const [criandoNova, setCriandoNova] = useState(false);
  const [tipoNova, setTipoNova] = useState(
    tiposLinha.find((t) => t.slug.toUpperCase() === (origem === "perfil" ? "PERFIL" : "COMPONENTES"))?.slug
      ?? tiposLinha[0]?.slug
      ?? ""
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const filtradas = query.trim()
    ? linhas.filter((l) => l.nome.toLowerCase().includes(query.trim().toLowerCase()))
    : linhas;
  const matchExato = linhas.find((l) => l.nome.toLowerCase() === query.trim().toLowerCase());

  function selecionar(l: { id: string; nome: string; tipo: string }) {
    onSelecionar(l);
    setQuery(l.nome);
    setAberto(false);
    setCriandoNova(false);
  }

  function criar() {
    if (!query.trim()) { setErro("Informe o nome da linha."); return; }
    if (!tipoNova) { setErro("Selecione a aba do catálogo."); return; }
    setErro(null);
    setSalvando(true);
    criarLinhaRapidaAction({ nome: query.trim(), tipo: tipoNova })
      .then((l) => { onCriada(l); selecionar(l); })
      .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível criar a linha."))
      .finally(() => setSalvando(false));
  }

  return (
    <div className="relative w-40">
      <input
        className="w-full rounded-md border border-border bg-bg px-2 py-1 text-xs"
        placeholder="linha…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setAberto(true); setCriandoNova(false); }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      />
      {aberto && (
        <div className="absolute z-10 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div className="max-h-40 overflow-y-auto">
            {filtradas.map((l) => (
              <button
                key={l.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selecionar(l)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-bg"
              >
                <span className="flex-1 truncate">{l.nome}</span>
                <span className="shrink-0 text-[10px] text-text-3">{l.tipo}</span>
              </button>
            ))}
            {filtradas.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-text-3">Nenhuma linha encontrada.</p>
            )}
          </div>
          {!matchExato && (
            <div className="border-t border-border bg-bg p-2">
              {!criandoNova ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setCriandoNova(true)}
                  disabled={!query.trim()}
                  className="w-full rounded-md border border-primary/40 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  + Criar linha "{query.trim()}"
                </button>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <select
                    value={tipoNova}
                    onChange={(e) => setTipoNova(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full rounded-md border border-border bg-surface px-1.5 py-1 text-[11px]"
                  >
                    {tiposLinha.map((t) => (
                      <option key={t.slug} value={t.slug}>{t.nome}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={salvando}
                    onClick={criar}
                    className="w-full rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {salvando ? "Criando…" : "Confirmar criação"}
                  </button>
                </div>
              )}
              {erro && <p className="mt-1 text-[11px] text-danger">{erro}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
