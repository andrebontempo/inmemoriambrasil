document.addEventListener("DOMContentLoaded", function () {
  const menuItems = document.querySelectorAll("#navbarMenu .nav-item")
  const currentPath = window.location.pathname // Obtém o caminho atual da URL

  menuItems.forEach((item) => {
    const link = item.querySelector(".nav-link")
    const linkPath = link.getAttribute("href")

    // Verifica se o link corresponde ao caminho atual
    if (currentPath === linkPath) {
      item.classList.add("active") // Adiciona a classe 'active' ao item correspondente
    }

    // Adiciona o evento de clique para destacar o item clicado
    item.addEventListener("click", function () {
      menuItems.forEach((i) => i.classList.remove("active")) // Remove a classe 'active' de todos os itens
      item.classList.add("active") // Adiciona a classe 'active' ao item clicado
    })
  })
})
