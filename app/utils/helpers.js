const moment = require("moment-timezone")
require("moment/locale/pt-br") // <-- IMPORTANTE
moment.locale("pt-br") // <-- Define PT-BR como padrão

// Função para formatar datas
const formatDate = (date, format) => {
  if (!date || isNaN(new Date(date))) return "Data inválida"

  const data = moment.utc(date).tz("America/Sao_Paulo", true) // Convertendo para o fuso horário correto

  if (format === "year") {
    return data.year()
  }

  const dia = data.date().toString().padStart(2, "0")
  const mes = data.format("MMMM") // Nome do mês em português
  const ano = data.year()

  return `${dia} de ${mes} de ${ano}`
}

// Função para formatar data e hora completa (para logs)
const formatFullDateTime = (date) => {
  if (!date || isNaN(new Date(date))) return "Data inválida"
  const data = moment.utc(date).tz("America/Sao_Paulo", true)
  return data.format("DD/MM/YYYY HH:mm:ss")
}

// Função para formatar datas
const formatDateTribute = (date, format) => {
  if (!date || isNaN(new Date(date))) return "Data inválida"

  const data = moment.utc(date).tz("America/Sao_Paulo") // Convertendo para o fuso horário correto

  if (format === "year") {
    return data.year()
  }

  const dia = data.date().toString().padStart(2, "0")
  const mes = data.format("MMMM") // Nome do mês em português
  const ano = data.year()

  return `${dia} de ${mes} de ${ano}`
}

// Função para calcular a idade
const calcularIdade = (dataNascimento, dataFalecimento) => {
  if (!dataNascimento || !dataFalecimento) return null

  const nascimento = moment.utc(dataNascimento).tz("America/Sao_Paulo", true)
  const falecimento = moment.utc(dataFalecimento).tz("America/Sao_Paulo", true)

  let anos = falecimento.diff(nascimento, "years")
  let meses = falecimento.diff(nascimento, "months") % 12

  if (meses === 0) {
    return `${anos} ano${anos !== 1 ? "s" : ""}`
  } else if (anos === 0) {
    return `${meses} ${meses === 1 ? "mês" : "meses"}`
  } else {
    return `${anos} ano${anos !== 1 ? "s" : ""} e ${meses} ${meses === 1 ? "mês" : "meses"
      }`
  }
}

// Função para comparação simples
const eq = (a, b) => a === b

// Função para comparação condicional no Handlebars
const ifEquals = function (a, b, options) {
  return a === b ? options.fn(this) : options.inverse(this)
}

const array = function () {
  return Array.prototype.slice.call(arguments, 0, -1)
}

// Retorna parte de uma string (para detectar rota ativa)
const substr = (str, start, length) => {
  if (typeof str !== "string") return ""
  return length ? str.substring(start, start + length) : str.slice(start)
}
const json = (context) => {
  return JSON.stringify(context, null, 2)
}


const range = (start, end) => {
  let arr = []
  for (let i = start; i <= end; i++) {
    arr.push(i)
  }
  return arr
}

// Exporta todas as funções
module.exports = {
  formatDate,
  formatDateTribute,
  formatFullDateTime,
  calcularIdade,
  eq,
  ifEquals,
  array,
  substr,
  json,
  range
}
