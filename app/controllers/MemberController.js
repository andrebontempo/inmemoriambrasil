const Memorial = require("../models/Memorial")
const User = require("../models/User")
const Tribute = require("../models/Tribute")
const LifeStory = require("../models/LifeStory")
const SharedStory = require("../models/SharedStory")
const Gallery = require("../models/Gallery")
const { calcularIdade } = require("../utils/helpers")
const kinships = require("../constants/kinships")

const MemberController = {
    // 👉 Lista membros (Colaboradores e Convidados)
    listMembers: async (req, res) => {
        const { slug } = req.params
        try {
            const memorial = await Memorial.findOne({ slug })
                .populate("owner", "firstName lastName")
                .populate("collaborators", "firstName lastName email")
                .populate("invited", "firstName lastName email")
                .lean()

            if (!memorial) {
                req.flash("error_msg", "Memorial não encontrado")
                return res.redirect("/auth/dashboard")
            }

            // Buscar as photos relacionadas ao memorial para a sidebar
            const galeria = await Gallery.findOne({ memorial: memorial._id })
                .populate({ path: "user", select: "firstName lastName" })
                .select("photos audios videos")
                .lean()

            const galleryData = galeria || {
                photos: [],
                audios: [],
                videos: [],
            }

            // Buscar contagens para estatísticas
            const totalTributos = await Tribute.countDocuments({ memorial: memorial._id })
            const totalHistorias = await LifeStory.countDocuments({ memorial: memorial._id })
            const totalHistoriasCom = await SharedStory.countDocuments({ memorial: memorial._id })

            // Variavel de compatibilidade com layout
            res.render("memorial/edit/members", {
                layout: "memorial-layout",
                memorial,
                slug: memorial.slug,
                id: memorial._id,
                firstName: memorial.firstName,
                lastName: memorial.lastName,
                mainPhoto: memorial.mainPhoto,
                qrCode: memorial.qrCode,
                plan: memorial.plan,
                theme: memorial.theme || "vinho",
                collaborators: memorial.collaborators || [],
                invited: memorial.invited || [],
                idade: calcularIdade(memorial.birth?.date, memorial.death?.date),
                birth: {
                    date: memorial.birth?.date
                        ? new Date(memorial.birth.date).toISOString().split("T")[0]
                        : "",
                    city: memorial.birth?.city || "Cidade não informada",
                    state: memorial.birth?.state || "Estado não informado",
                    country: memorial.birth?.country || "Brasil",
                },
                death: {
                    date: memorial.death?.date
                        ? new Date(memorial.death.date).toISOString().split("T")[0]
                        : "",
                    city: memorial.death?.city || "Cidade não informada",
                    state: memorial.death?.state || "Estado não informado",
                    country: memorial.death?.country || "Brasil",
                },
                gallery: galleryData,
                estatisticas: {
                    totalVisitas: memorial.visits || 0,
                    totalTributos,
                    totalHistorias,
                    totalHistoriasCom,
                },
            })
        } catch (err) {
            console.error("Erro ao listar membros:", err)
            res.status(500).send("Erro ao listar membros")
        }
    },

    // 👉 Adiciona um membro (colaborador ou convidado)
    addMember: async (req, res) => {
        const { slug, role } = req.params // role: collaborators ou invited
        const { email } = req.body

        try {
            const memorial = await Memorial.findOne({ slug })
            if (!memorial) return res.status(404).json({ error: "Memorial não encontrado" })

            // Busca o usuário pelo e-mail
            const userToAdd = await User.findOne({ email: email.toLowerCase() })
            if (!userToAdd) {
                req.flash("error_msg", "Usuário não encontrado. Ele precisa ter uma conta no sistema.")
                return res.redirect(`/memorial/${slug}/members`)
            }

            // Evita o próprio dono
            if (userToAdd._id.toString() === memorial.owner.toString()) {
                req.flash("error_msg", "Você já é o proprietário deste memorial.")
                return res.redirect(`/memorial/${slug}/members`)
            }

            const roleKey = role === "collab" ? "collaborators" : "invited"

            // Verifica se já está na lista
            if (memorial[roleKey].includes(userToAdd._id)) {
                req.flash("error_msg", "Este usuário já está na lista.")
                return res.redirect(`/memorial/${slug}/members`)
            }

            // Adiciona
            memorial[roleKey].push(userToAdd._id)
            await memorial.save()

            req.flash("success_msg", "Membro adicionado com sucesso!")
            res.redirect(`/memorial/${slug}/members`)
        } catch (err) {
            console.error("Erro ao adicionar membro:", err)
            req.flash("error_msg", "Erro técnico ao adicionar membro.")
            res.redirect(`/memorial/${slug}/members`)
        }
    },

    // 👉 Remove um membro
    removeMember: async (req, res) => {
        const { slug, role, userId } = req.params

        try {
            const memorial = await Memorial.findOne({ slug })
            if (!memorial) return res.status(404).json({ error: "Memorial não encontrado" })

            const roleKey = role === "collab" ? "collaborators" : "invited"

            memorial[roleKey] = memorial[roleKey].filter(id => id.toString() !== userId)
            await memorial.save()

            req.flash("success_msg", "Membro removido com sucesso.")
            res.redirect(`/memorial/${slug}/members`)
        } catch (err) {
            console.error("Erro ao remover membro:", err)
            req.flash("error_msg", "Erro ao remover membro.")
            res.redirect(`/memorial/${slug}/members`)
        }
    }
}

module.exports = MemberController
