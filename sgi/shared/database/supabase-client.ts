import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // supabase-js só chama realtime.setAuth() nos eventos TOKEN_REFRESHED e
  // SIGNED_IN (ver _handleTokenChanged) — uma sessão restaurada de cookie
  // (@supabase/ssr, sem sign-in acontecer nesta aba) só dispara
  // INITIAL_SESSION, que é ignorado. Sem isso, o socket do Realtime nunca
  // tem o JWT do usuário anexado, então toda tabela com RLS fica invisível
  // pra ele (auth.uid() = null) até o refresh automático do token, até 1h
  // depois — é por isso que nenhum canal (RealtimeRefresher, notificações,
  // kanban) atualizava sozinho logo após carregar a página.
  client.auth.getSession().then(({ data: { session } }) => {
    if (session) client.realtime.setAuth(session.access_token);
  });

  return client;
}
