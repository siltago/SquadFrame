# Autenticação

Login usa Supabase GoTrue por e-mail/senha. Tokens ficam em `EncryptedSharedPreferences`, protegidos por chave no Android Keystore. O refresh token renova uma sessão expirada. O bootstrap resolve `usuarios.auth_id` e exige `squadmeasure.visualizar`.
