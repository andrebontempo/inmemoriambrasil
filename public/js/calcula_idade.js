window.onload = function () {
  // Recebe a data de nascimento e falecimento no formato "19 de maio de 1950"
  const birthDateString = "{{birth.date}}" // Data de nascimento no formato "19 de maio de 1950"
  const deathDateString = "{{death.date}}" // Data de falecimento no formato "14 de agosto de 2020"

  // Função para calcular a idade a partir das datas
  function calculateAge(birthDateString, deathDateString) {
    // Mapeia os meses por extenso para o número do mês
    const months = {
      janeiro: "01",
      fevereiro: "02",
      março: "03",
      abril: "04",
      maio: "05",
      junho: "06",
      julho: "07",
      agosto: "08",
      setembro: "09",
      outubro: "10",
      novembro: "11",
      dezembro: "12",
    }

    // Função para converter a data no formato "19 de maio de 1950" para "1950-05-19"
    function convertToDate(dateString) {
      const parts = dateString.split(" de ")
      const day = parts[0].trim()
      const month = months[parts[1].toLowerCase().trim()]
      const year = parts[2].trim()
      return `${year}-${month}-${day}`
    }

    // Converte as datas de nascimento e falecimento para o formato YYYY-MM-DD
    const birthDate = new Date(convertToDate(birthDateString))
    const deathDate = deathDateString
      ? new Date(convertToDate(deathDateString))
      : new Date() // Usa a data atual se não houver falecimento

    // Verificar se as datas são válidas
    if (isNaN(birthDate.getTime()) || isNaN(deathDate.getTime())) {
      return "Data inválida" // Retorna "Data inválida" se as datas não forem válidas
    }

    // Calcular a idade
    let age = deathDate.getFullYear() - birthDate.getFullYear()
    const month = deathDate.getMonth() - birthDate.getMonth()

    // Ajustar a idade se ainda não fez aniversário neste ano
    if (
      month < 0 ||
      (month === 0 && deathDate.getDate() < birthDate.getDate())
    ) {
      age--
    }

    return age
  }

  // Calcular a idade com base nas datas fornecidas
  const age = calculateAge(birthDateString, deathDateString)

  // Exibir a idade ou mensagem de erro
  const ageInfo = document.getElementById("age-info")
  if (age === "Data inválida") {
    ageInfo.innerHTML = "Data de nascimento ou falecimento inválida"
  } else {
    ageInfo.innerHTML = `<i class="bi bi-calendar-fill"></i> <strong>Idade:</strong> ${age} anos`
  }
}
