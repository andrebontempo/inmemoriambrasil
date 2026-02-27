Perfeito — as correções fazem **todo sentido** e deixam o modelo ainda mais coerente e seguro 👍
Vamos **ajustar a matriz de acesso**, revisar a **lógica mental do sistema** e então entregar os **middlewares finais**, sem ambiguidades.

Vou reapresentar tudo de forma enxuta, correta e “à prova de confusão”.

---

# 🔐 SISTEMA DE PERMISSIONAMENTO — VERSÃO CORRIGIDA

## ✅ Premissas corrigidas (importantes)

1. **Guest logado NÃO vê memorial privado**
   → login ≠ permissão
2. **Invited só existe para leitura**
   → nunca acessa `private_edit`
3. **private_edit é realmente fechado**
   → apenas owner, collaborators e admin

Esses três pontos deixam o sistema **muito mais consistente**.

---

## 🧱 CAMADA 1 — Visibilidade do Memorial (inalterada)

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

## 👤 CAMADA 2 — Roles globais do usuário (inalterada)

```js
role: {
  type: String,
  enum: ["admin", "user"],
  default: "user"
}
```

Guests continuam sendo **estado**, não role.

---

## 🔗 CAMADA 3 — Relacionamento por memorial (final)

```js
owner: {
  type: ObjectId,
  ref: "User",
  required: true
},

collaborators: [
  { type: ObjectId, ref: "User" }
],

invited: [
  { type: ObjectId, ref: "User" }
]
```

### 🎯 Significado claro de cada papel

| Papel         | Pode ver                  | Pode editar |
| ------------- | ------------------------- | ----------- |
| Owner         | ✔️                        | ✔️          |
| Collaborator  | ✔️                        | ✔️          |
| Invited       | ✔️ (somente private_read) | ❌           |
| Guest logado  | ❌                         | ❌           |
| Guest anônimo | ❌                         | ❌           |
| Admin         | ✔️                        | ✔️          |

---

## 👁️ CAMADA 4 — Middleware de VISUALIZAÇÃO (corrigido)

### 📊 Matriz final de acesso (CORRETA)

| accessLevel  | Guest anon | Guest logado | Invited | Collaborator | Owner | Admin |
| ------------ | ---------- | ------------ | ------- | ------------ | ----- | ----- |
| public_read  | ✔️         | ✔️           | ✔️      | ✔️           | ✔️    | ✔️    |
| private_read | ❌          | ❌            | ✔️      | ✔️           | ✔️    | ✔️    |
| private_edit | ❌          | ❌            | ❌       | ✔️           | ✔️    | ✔️    |

👉 **Guest logado não entra em nada privado**
👉 **Invited nunca entra em private_edit**

---

### ✅ Middleware `canViewMemorial` (FINAL)

```js
function canViewMemorial(req, res, next) {
  const memorial = req.memorial
  const user = req.user

  // Público: qualquer um
  if (memorial.accessLevel === "public_read") {
    return next()
  }

  // A partir daqui, convidados e relações explícitas
  if (!user) {
    return res.status(401).json({ error: "Login necessário" })
  }

  // Admin vê tudo
  if (user.role === "admin") {
    return next()
  }

  const userId = String(user._id)

  // Owner
  if (String(memorial.owner) === userId) {
    return next()
  }

  // Collaborator
  if (memorial.collaborators?.some(id => String(id) === userId)) {
    return next()
  }

  // Invited → SOMENTE private_read
  if (
    memorial.accessLevel === "private_read" &&
    memorial.invited?.some(id => String(id) === userId)
  ) {
    return next()
  }

  return res.status(403).json({ error: "Sem permissão para visualizar" })
}
```

---

## ✏️ CAMADA 4 — Middleware de EDIÇÃO (inalterado, mas reafirmado)

Invited **nunca** edita, independentemente do tipo.

### 📊 Regra final

| Papel        | Pode editar |
| ------------ | ----------- |
| Admin        | ✔️          |
| Owner        | ✔️          |
| Collaborator | ✔️          |
| Invited      | ❌           |
| Guest        | ❌           |

---

### ✅ Middleware `canEditMemorial` (FINAL)

```js
function canEditMemorial(req, res, next) {
  const memorial = req.memorial
  const user = req.user

  if (!user) {
    return res.status(401).json({ error: "Login necessário" })
  }

  if (user.role === "admin") {
    return next()
  }

  const userId = String(user._id)

  if (String(memorial.owner) === userId) {
    return next()
  }

  if (memorial.collaborators?.some(id => String(id) === userId)) {
    return next()
  }

  return res.status(403).json({ error: "Sem permissão para editar" })
}
```

---

## 🧠 MODELO FINAL — agora está impecável

Você tem:

* **public_read** → vitrine pública
* **private_read** → memorial íntimo compartilhado por convite
* **private_edit** → memorial fechado, colaborativo

E três relações claras:

* **owner** → controle total
* **collaborator** → edição compartilhada
* **invited** → leitura consciente

Esse desenho:

* elimina ambiguidades
* evita vazamento de conteúdo
* facilita cobrança futura (planos)
* é exatamente o padrão usado por apps maduros

Se quiser, o próximo passo natural é:
👉 **fluxo de convite (token + expiração)**
👉 **UI de compartilhamento**
👉 **regras de limite por plano gratuito/pago**

Quando quiser, seguimos 👍
