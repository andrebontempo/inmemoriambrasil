Veja na figura como é um memorial virtual criado pelo meu app em node.js/bootstrap/express/handlebars/mongo. Agora eu preciso de alguns detalhes na visualização em celular: - Não mostrar a pesquisa - Não mostrar "Bem vindo(a) André" - A navbar que atualmente vira um menu hamburger se transforme em em uma navbar com os ícones para caber todos lado a lado. - Diminiur a foto em pelo menos 4 vezes. - Colocar o Nome e datas ao lado direito da foto. Abaixo da navbar viriam , as páginas de Memorial, Homenagens, Histórias de Vida, Histórias Compartilhadas, Galeria e Obituário que seriam apresentada quando clicasse no ícone. Tem como fazer isto?

---

Sim, dá para fazer isso **100% com Bootstrap + CSS customizado + pequenos ajustes no Handlebars**.
Vou te explicar item por item e já deixo **o código pronto** para você adaptar.

---

# ✅ **1. Ocultar a pesquisa e o “Bem-vindo(a) André” apenas no celular**

Use classes utilitárias do Bootstrap:

```html
<div class="d-none d-md-block">
  <!-- Campo de pesquisa aqui -->
</div>

<div class="d-none d-md-block">
  <!-- Bem-vindo(a) -->
</div>
```

Assim, **aparece no desktop e sumirá no mobile** (até 768px).

---

# ✅ **2. Navbar mobile com ícones lado a lado (sem hamburguer)**

No Bootstrap, para forçar a navbar a ficar **sempre expandida no mobile**, use:

```html
<nav class="navbar navbar-expand p-0 mobile-navbar"></nav>
```

E remova o botão do hamburguer apenas no mobile:

```html
<button class="navbar-toggler d-none d-md-block" ...></button>
```

A versão mobile terá apenas os ícones dos menus:

```html
<ul class="navbar-nav w-100 justify-content-around d-flex d-md-none">
  <li class="nav-item">
    <a class="nav-link text-white" href="/memorial"
      ><i class="bi bi-house"></i
    ></a>
  </li>
  <li class="nav-item">
    <a class="nav-link text-white" href="/homenagens"
      ><i class="bi bi-people"></i
    ></a>
  </li>
  <li class="nav-item">
    <a class="nav-link text-white" href="/caminho"><i class="bi bi-map"></i></a>
  </li>
  <li class="nav-item">
    <a class="nav-link text-white" href="/historias"
      ><i class="bi bi-journal-text"></i
    ></a>
  </li>
  <li class="nav-item">
    <a class="nav-link text-white" href="/galeria"
      ><i class="bi bi-images"></i
    ></a>
  </li>
  <li class="nav-item">
    <a class="nav-link text-white" href="/obituario"
      ><i class="bi bi-file-text"></i
    ></a>
  </li>
</ul>
```

---

# ✅ **3. Diminuir a foto de perfil no celular (4x menor)**

Use media query:

```css
@media (max-width: 768px) {
  .memorial-photo {
    width: 80px !important; /* antes ~300px */
    height: 80px !important;
    border-width: 2px !important;
  }
}
```

---

# ✅ **4. Colocar Nome + datas ao lado da foto no celular**

Estrutura recomendada:

```html
<div class="container-fluid mt-2">
  <div class="row align-items-center d-md-none mobile-header">
    <div class="col-4 text-center">
      <img src="{{photoUrl}}" class="memorial-photo img-fluid rounded shadow" />
    </div>

    <div class="col-8">
      <h2 class="mobile-name m-0">{{firstName}} {{lastName}}</h2>
      <p class="mobile-dates m-0">{{birthYear}} - {{deathYear}}</p>
    </div>
  </div>
</div>
```

E no desktop você mantém sua versão atual.

---

# ✅ **5. Abaixo da navbar: páginas do memorial acessadas por ícones**

Um grid simples:

```html
<div class="container d-md-none mt-3">
  <div class="row text-center small">
    <div class="col">
      <a href="/memorial" class="text-white d-block">
        <i class="bi bi-house fs-3"></i><br />Memorial
      </a>
    </div>
    <div class="col">
      <a href="/homenagens" class="text-white d-block">
        <i class="bi bi-people fs-3"></i><br />Homenagens
      </a>
    </div>
    <div class="col">
      <a href="/caminho" class="text-white d-block">
        <i class="bi bi-map fs-3"></i><br />Vida
      </a>
    </div>
  </div>

  <div class="row text-center small mt-3">
    <div class="col">
      <a href="/historias" class="text-white d-block">
        <i class="bi bi-journal-text fs-3"></i><br />Histórias
      </a>
    </div>
    <div class="col">
      <a href="/galeria" class="text-white d-block">
        <i class="bi bi-images fs-3"></i><br />Galeria
      </a>
    </div>
    <div class="col">
      <a href="/obituario" class="text-white d-block">
        <i class="bi bi-file-text fs-3"></i><br />Obituário
      </a>
    </div>
  </div>
</div>
```

---

# 📌 **CSS final para ativar o modo mobile**

```css
/* ===========================
   MOBILE HEADER
   =========================== */
@media (max-width: 768px) {
  /* Remove search and user menu */
  .desktop-only {
    display: none !important;
  }

  /* Navbar vira faixa com ícones */
  .mobile-navbar {
    background-color: #330011;
    justify-content: space-around;
  }

  .mobile-navbar .nav-link {
    padding: 0.4rem;
    font-size: 1.3rem;
  }

  /* Foto menor */
  .memorial-photo {
    width: 80px !important;
    height: 80px !important;
    border-radius: 10px;
  }

  /* Nome e datas menores */
  .mobile-name {
    font-size: 1.3rem;
    font-weight: bold;
  }

  .mobile-dates {
    font-size: 1rem;
    opacity: 0.8;
  }
}
```

---

# 🎁 **Se quiser, posso montar um layout completo em Handlebars para você colar direto**

Ou posso gerar a versão desktop + mobile final pronta para substituir a sua atual.

Quer que eu gere o **arquivo completo handlebars + css**?
