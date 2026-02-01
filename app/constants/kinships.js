// app/constants/kinships.js

const kinships = [
    { value: "amiga", label: "Amiga" },
    { value: "amigo", label: "Amigo" },
    { value: "avo", label: "Avô" },
    { value: "avó", label: "Avó" },
    { value: "filha", label: "Filha" },
    { value: "filho", label: "Filho" },
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
