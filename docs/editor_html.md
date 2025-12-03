# ✅ criar um editor de texto (Quill / TinyMCE)

Perfeito — **um editor de texto como Quill ou TinyMCE é exatamente o que você precisa** para permitir **parágrafos, negrito, itálico, listas, links etc.**
E **sim, o MongoDB aceita perfeitamente texto formatado em HTML**, então funciona 100% no seu app.

A seguir te mostro **como implementar o Quill do zero** usando **Handlebars** e **como salvar no MongoDB**.

---

# ✅ **1. Instalar Quill (via CDN — o mais fácil)**

No arquivo Handlebars onde você edita ou cria a biografia, coloque no `<head>`:

```html
<!-- QUILL CSS -->
<link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet" />
```

E no final da página:

```html
<!-- QUILL JS -->
<script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
```

---

# ✅ **2. Colocar o editor na view Handlebars**

No formulário:

```html
<div id="editor" style="height: 250px;">{{{biography}}}</div>

<!-- Campo oculto que vai receber o HTML final -->
<input type="hidden" name="biography" id="biographyInput" />
```

---

# ✅ **3. Inicializar o editor e enviar o HTML ao backend**

No final da página:

```html
<script>
  const quill = new Quill("#editor", {
    theme: "snow",
  })

  // Quando enviar o formulário
  const form = document.querySelector("form")
  form.onsubmit = function () {
    const htmlContent = quill.root.innerHTML
    document.getElementById("biographyInput").value = htmlContent
  }
</script>
```

---

# ✅ **4. No MongoDB (Mongoose)**

Seu schema pode ser assim:

```js
biography: { type: String },
```

Nada mais.
E sim: **o HTML será salvo normalmente**.

---

# ✅ **5. Exibir a biografia formatada**

NA VIEW:

```hbs
{{#if biography}}
  {{{biography}}}
  <!-- TRÊS CHAVES = renderizar HTML -->
{{else}}
  A biografia de
  <strong>{{firstName}} {{lastName}}</strong>
  ainda não foi adicionada.
{{/if}}
```

✔️ Usar `{{{ }}}` é essencial — porque `{{ }}` escapa o HTML.

---

# ⚠️ **6. Segurança – importante!**

Quando você aceita HTML do usuário, é fortemente recomendado sanitizar:

- no backend com **sanitize-html**

```bash
npm install sanitize-html
```

```js
const sanitizeHtml = require("sanitize-html")
const cleaned = sanitizeHtml(req.body.biography)
memorial.biography = cleaned
```

Evita XSS.

---

# 🎉 Pronto!

Você agora tem:

✔️ campo com HTML
✔️ editor WYSIWYG
✔️ formulário enviando conteúdo formatado
✔️ Handlebars exibindo corretamente
✔️ MongoDB aceitando sem problemas

Se quiser, posso gerar:

✅ a rota completa
✅ o controller
✅ a view Handlebars final
✅ o sanitizador no backend
✅ estilo / CSS do editor dentro do seu layout

Só pedir!
