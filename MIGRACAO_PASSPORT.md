# Migração para Passport.js Concluída

A migração do sistema de autenticação manual para **Passport.js** foi realizada com sucesso. O sistema agora suporta autenticação híbrida (Local + Google OAuth) mantendo a compatibilidade com sessões do MongoDB.

## Alterações Realizadas

### 1. Configuração do Passport
- Criado arquivo `config/passport.js` com duas estratégias:
  - **LocalStrategy**: Autenticação via email e senha (usando `bcrypt`).
  - **GoogleStrategy**: Autenticação via conta Google, com vinculação automática se o e-mail já existir no banco.
- Implementada serialização (`serializeUser`/`deserializeUser`) para gerenciar a sessão.

### 2. Atualização do Servidor (`server.js`)
- Inicialização do Passport (`passport.initialize()` e `passport.session()`).
- [CORREÇÃO CRÍTICA] Ajuste na configuração do cookie de sessão:
  ```javascript
  cookie: {
    secure: isProduction ? "auto" : false, // Permite funcionamento em localhost (HTTP) e Produção (HTTPS)
    // ...
  }
  ```
  *Anteriormente, a flag `secure: true` forçada impedia o login local em desenvolvimento.*

### 3. Refatoração do `AuthController.js`
- **Login**: Agora usa `passport.authenticate("local")` para delegar a verificação.
- **Registro**: Usa `req.logIn()` para autenticar automaticamente o usuário após o cadastro.
- **Logout**: Atualizado para usar `req.logout()` do Passport.
- **Dashboard**: Atualizado para ler o usuário de `req.user` (padrão Passport) em vez de `req.session.user`.

### 4. Atualização de Rotas e Middlewares
- **`authRoutes.js`**: Adicionadas rotas `/auth/google` e `/auth/google/callback`.
- **`authMiddleware.js`**: Simplificado para usar `req.isAuthenticated()`.
- **Controllers**: Todas as referências a `req.session.user` foram substituídas por `req.user` nos controladores (Memorial, Accounts, Tribute, SharedStory, Gallery, LifeStory).

## Verificação e Testes

Os testes confirmaram o funcionamento correto de todas as etapas:

### ✅ Login Local
- Login com email/senha redireciona corretamente para o Dashboard.
- **Correção Aplicada**: Adicionado `req.session.save()` antes do redirecionamento para evitar condição de corrida (race condition) com o banco de dados.
- **Configuração de Cookie**: Ajustada para `secure: isProduction ? "auto" : false` (ou apenas `isProduction`), garantindo funcionamento em localhost (HTTP) e produção (HTTPS).
> [!NOTE]
> Se um usuário criar conta via Google, o login por senha será bloqueado por padrão, a menos que uma senha seja definida posteriormente. O sistema exibirá: *"Esta conta usa login via Google"*.

### ✅ Login com Google
- Botão "Entrar com Google" redireciona para a autenticação do Google.
- Callback processado corretamente.

### ✅ Proteção de Rotas
- Acesso a páginas protegidas (ex: `/memorial/create-step1`) sem login redireciona para `/auth/login`.

### ✅ Logout
- Botão "Sair" encerra a sessão e redireciona para a Home.

> [!TIP]
> **Para o Google OAuth em Produção**: Lembre-se de adicionar a URL de callback de produção (`https://seudominio.com/auth/google/callback`) no Console do Google Cloud.

---
## Evidências

### Login Local com Sucesso
A sessão local foi estabelecida corretamente após a correção do cookie:
![Login Sucesso](/home/bontempo/.gemini/antigravity/brain/0177f133-6514-4369-a0d6-a0cd7203294f/.system_generated/click_feedback/click_feedback_1771162124301.png)

### Redirecionamento Google OAuth
O fluxo de OAuth foi iniciado corretamente:
![Google OAuth](/home/bontempo/.gemini/antigravity/brain/0177f133-6514-4369-a0d6-a0cd7203294f/.system_generated/click_feedback/click_feedback_1771161468975.png)
