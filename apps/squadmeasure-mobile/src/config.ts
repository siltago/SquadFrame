import Config from 'react-native-config';

const normalize=(value?:string)=>value?.trim().replace(/\/+$/,'')??'';
export const env={supabaseUrl:normalize(Config.SQUADMEASURE_SUPABASE_URL),anonKey:Config.SQUADMEASURE_SUPABASE_ANON_KEY?.trim()??'',apiUrl:normalize(Config.SQUADMEASURE_API_BASE_URL)};
export const configurationErrors=()=>[
 !/^https:\/\//.test(env.supabaseUrl)&&'URL do Supabase inválida',
 !env.anonKey&&'chave anônima ausente',
 !/^https?:\/\//.test(env.apiUrl)&&'URL da API inválida',
].filter(Boolean) as string[];
