// app/constants/kinships.js

const kinships = [
    { value: "amiga", label: "Amiga" },
    { value: "amigo", label: "Amigo" },
    { value: "avo", label: "Avô" },
    { value: "avó", label: "Avó" },
    { value: "filha", label: "Filha" },
    { value: "filho", label: "Filho" },
    { value: "enteado", label: "Enteado" },
    { value: "enteada", label: "Enteada" },
    { value: "cunhado", label: "Cunhado" },
    { value: "cunhada", label: "Cunhada" },
    { value: "genro", label: "Genro" },
    { value: "nora", label: "Nora" },
    { value: "neto", label: "Neto" },
    { value: "neta", label: "Neta" },
    { value: "sobrinho", label: "Sobrinho" },
    { value: "sobrinha", label: "Sobrinha" },
    { value: "primo", label: "Primo" },
    { value: "prima", label: "Prima" },
    { value: "irma", label: "Irmã" },
    { value: "irmao", label: "Irmão" },
    { value: "mae", label: "Mãe" },
    { value: "pai", label: "Pai" },
    { value: "marido", label: "Marido" },
    { value: "esposa", label: "Esposa" },
    { value: "tia", label: "Tia" },
    { value: "tio", label: "Tio" },
    { value: "sogro", label: "Sogro" },
    { value: "sogra", label: "Sogra" },
];

module.exports = kinships.sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR")
);
