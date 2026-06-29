// Migra títulos de tarefas de pedido de "Pedido xxx — rascunho" para "Pedido xxx — <obra>"
// Uso: node scripts/migrate-titulo-tarefas-pedido.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gtirigvwvzucneqrsmqh.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Defina SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Busca todas as tarefas de pedido com título contendo "rascunho"
  const { data: tarefas, error } = await db
    .from("tarefas")
    .select("id, titulo, pedido_id, obra_id")
    .eq("entidade_ref", "pedido")
    .ilike("titulo", "%rascunho%")
    .is("deleted_at", null);

  if (error) throw new Error(`Erro ao buscar tarefas: ${error.message}`);
  if (!tarefas?.length) {
    console.log("Nenhuma tarefa com 'rascunho' no título encontrada.");
    return;
  }

  console.log(`${tarefas.length} tarefas encontradas. Atualizando...`);

  // Busca pedidos para obter o número
  const pedidoIds = [...new Set(tarefas.map((t) => t.pedido_id).filter(Boolean))];
  const { data: pedidos, error: errPedidos } = await db
    .from("pedidos_compra")
    .select("id, numero, obra_id")
    .in("id", pedidoIds);

  if (errPedidos) throw new Error(`Erro ao buscar pedidos: ${errPedidos.message}`);

  // Busca obras únicas
  const obraIds = [...new Set(pedidos.map((p) => p.obra_id).filter(Boolean))];
  let obrasMap = {};
  if (obraIds.length) {
    const { data: obras, error: errObras } = await db
      .from("obras")
      .select("id, nome")
      .in("id", obraIds);
    if (errObras) throw new Error(`Erro ao buscar obras: ${errObras.message}`);
    obrasMap = Object.fromEntries(obras.map((o) => [o.id, o.nome]));
  }

  const pedidosMap = Object.fromEntries(pedidos.map((p) => [p.id, p]));

  let atualizadas = 0;
  let ignoradas = 0;

  for (const tarefa of tarefas) {
    const pedido = pedidosMap[tarefa.pedido_id];
    if (!pedido) {
      console.warn(`  SKIP tarefa ${tarefa.id}: pedido não encontrado`);
      ignoradas++;
      continue;
    }

    const obraId = pedido.obra_id ?? tarefa.obra_id;
    const nomeObra = obraId ? obrasMap[obraId] : null;

    const novoTitulo = nomeObra
      ? `Pedido ${pedido.numero} — ${nomeObra}`
      : `Pedido ${pedido.numero}`;

    if (novoTitulo === tarefa.titulo) {
      ignoradas++;
      continue;
    }

    const { error: errUpdate } = await db
      .from("tarefas")
      .update({ titulo: novoTitulo })
      .eq("id", tarefa.id);

    if (errUpdate) {
      console.error(`  ERRO tarefa ${tarefa.id}: ${errUpdate.message}`);
    } else {
      console.log(`  OK  "${tarefa.titulo}" → "${novoTitulo}"`);
      atualizadas++;
    }
  }

  console.log(`\nConcluído: ${atualizadas} atualizadas, ${ignoradas} ignoradas.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
