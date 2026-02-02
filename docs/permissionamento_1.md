A boa notícia é: **tudo que você descreveu é perfeitamente organizável**, mas só parece confuso porque hoje várias responsabilidades estão misturadas (tipo de memorial, visibilidade, papel do usuário, ação permitida…).

Vou reorganizar tudo em **4 camadas lógicas**, que são o padrão correto para apps com acesso complexo (ex: Notion, Google Drive, Trello, GitHub):

---

# ✅ **CAMADA 1 — Tipo de Memorial (define VISIBILIDADE)**

Cada memorial deve ter um campo que define *quem pode ver* o conteúdo.

Proponho:

```js
visibility: {
  type: String,
  enum: ["public", "private"],
  default: "public"
}
```

Agora, dentro disso, você tem **três comportamentos reais**:

### 🔹 1. Público (public)

* Qualquer pessoa (logada ou não) pode ver.
* Edição só para owner e colaboradores.

### 🔹 2. Privado — Somente leitura (private_readonly)

* Apenas: Owner, colaboradores e **usuários autenticados** (guest logado) podem ver.
* Mas somente owner/colaborator editam.

### 🔹 3. Privado — Edição (private_edit)

* Apenas owner + colaboradores podem ver **e** editar.
* Visitantes autenticados **não** acessam.
* Visitantes anônimos **não** acessam.

👉 Isso pode ser representado com dois campos simples:

```js
visibility: "public" | "private"
primaryAccess: "readonly" | "edit"
```

OU num único campo enum, se preferir:

```js
accessLevel: {
  type: String,
  enum: [
    "public_read", 
    "private_read", 
    "private_edit"
  ],
  default: "public_read"
}
```

---

# ✅ **CAMADA 2 — Roles do usuário (poderes GLOBAIS)**

Agora os usuários têm papéis gerais, **independentes dos memoriais**:

### 🔹 **Admin**

* Pode tudo em qualquer memorial.
* Ignora todas as regras.

### 🔹 **Owner**

* É dono de 1 ou mais memoriais.
* Criou o memorial → é o proprietário.
* Tem acesso total no seu memorial.

### 🔹 **Collaborator**

* Adicionado pelo Owner.
* Tem poderes de edição no memorial específico.

### 🔹 **Guest autenticado**

* Usuário logado, mas que não tem relação com o memorial.
* Pode visualizar memoriais públicos
* Pode visualizar memoriais privados-readonly

### 🔹 **Guest anônimo (não autenticado)**

* Somente leitura em memoriais públicos.

👉 **Ponto importante:**
Esses dois “Guests” **não precisam estar salvos como role no banco**, isso é comportamento, não papel.

Seu backend deduz assim:

* Se `req.user` existe → guest autenticado
* Se `req.user` não existe → guest não autenticado

Então roles reais no banco são apenas:

```js
role: {
  type: String,
  enum: ["admin", "user"],
  default: "user"
}
```

E dentro do memorial você controla owner e colaboradores.

---

# ✅ **CAMADA 3 — Permissão ESPECÍFICA por memorial**

Aqui você relaciona usuários ao memorial:

```js
owner: { type: ObjectId, ref: "User", required: true },
collaborators: [{ type: ObjectId, ref: "User" }]
```

Isso resolve:

* Owner = quem criou
* Collaborator = pessoas com quem o Owner compartilhou
* Guest = qualquer outro usuário

---

# ✅ **CAMADA 4 — Middlewares de controle**

Agora fica muito simples.
Você terá 3 verificações:

---

## **1️⃣ Middleware: pode ver este memorial?**

Regra:

| Tipo         | Guest anon | Guest logado | Collaborator | Owner | Admin |
| ------------ | ---------- | ------------ | ------------ | ----- | ----- |
| public_read  | ✔️         | ✔️           | ✔️           | ✔️    | ✔️    |
| private_read | ❌          | ✔️           | ✔️           | ✔️    | ✔️    |
| private_edit | ❌          | ❌            | ✔️           | ✔️    | ✔️    |

Middleware:

```js
function canViewMemorial(req, res, next) {
  const memorial = req.memorial
  const user = req.user

  if (memorial.accessLevel === "public_read") return next()

  if (!user) return res.status(401).json({ error: "Login necessário" })

  if (user.role === "admin") return next()
  if (String(memorial.owner) === String(user._id)) return next()
  if (memorial.collaborators.includes(user._id)) return next()

  if (memorial.accessLevel === "private_read") return next()

  return res.status(403).json({ error: "Sem permissão para visualizar" })
}
```

---

## **2️⃣ Middleware: pode editar este memorial?**

Regra:

| Tipo         | Guest anon | Guest logado | Collaborator | Owner | Admin |
| ------------ | ---------- | ------------ | ------------ | ----- | ----- |
| public_read  | ❌          | ❌            | ✔️           | ✔️    | ✔️    |
| private_read | ❌          | ❌            | ✔️           | ✔️    | ✔️    |
| private_edit | ❌          | ❌            | ✔️           | ✔️    | ✔️    |

Middleware:

```js
function canEditMemorial(req, res, next) {
  const memorial = req.memorial
  const user = req.user

  if (!user) return res.status(401).json({ error: "Login necessário" })
  if (user.role === "admin") return next()
  if (String(memorial.owner) === String(user._id)) return next()
  if (memorial.collaborators.includes(user._id)) return next()

  return res.status(403).json({ error: "Sem permissão para editar" })
}
```

---

# 📌 **RESUMÃO: a arquitetura perfeita já organizada**

## **1 — Memorial define visibilidade:**

* public_read
* private_read
* private_edit

## **2 — Usuário define privilégio global:**

* admin
* user (owner de seus memoriais / colaborador nos outros)

## **3 — Cada memorial define relacionamento:**

* 1 owner
* 0..N colaboradores

## **4 — Middleware define:**

* quem pode ver
* quem pode editar

---

# 🌟 Agora tudo fica claro e consistente

Você tem:

* **VISIBILIDADE** → controlada pelo memorial
* **ROLE global** → controlada pelo usuário
* **PODERES por memorial** → owner + colaboradores
* **Ações** → validadas pelos middlewares

É exatamente assim que sistemas como Google Drive, Trello e Notion funcionam internamente.

---

# Se quiser, eu monto:

🔹 O schema final completo
🔹 Todos os middlewares prontos
🔹 As rotas organizadas (REST)
🔹 O fluxo da UI (quem vê o quê)

Só pedir!