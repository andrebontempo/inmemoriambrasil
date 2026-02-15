const Memorial = require("../models/Memorial")
const Tribute = require("../models/Tribute")
const LifeStory = require("../models/LifeStory")
const SharedStory = require("../models/SharedStory")
const User = require("../models/User")
const AdminLog = require("../models/AdminLog")

const AdminController = {
    index: async (req, res) => {
        try {
            // 1. Estatísticas Gerais
            const totalMemoriais = await Memorial.countDocuments()
            const totalTributos = await Tribute.countDocuments()
            const totalHistorias = await LifeStory.countDocuments()
            const totalCompartilhadas = await SharedStory.countDocuments()
            const totalUsers = await User.countDocuments()

            const memoriaisVisits = await Memorial.find({}, "visits")
            const totalVisitas = memoriaisVisits.reduce((sum, m) => sum + (m.visits || 0), 0)

            // 2. Dados Recentes para o Dashboard
            const recentUsers = await User.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()

            const recentLogs = await AdminLog.find()
                .populate("adminId", "firstName lastName email")
                .populate("targetUserId", "firstName lastName email")
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()

            res.render("admin/index", {
                title: "Painel Administrativo - In Memoriam Brasil",
                stats: {
                    totalMemoriais,
                    totalTributos,
                    totalHistorias,
                    totalCompartilhadas,
                    totalVisitas,
                    totalUsers
                },
                recentUsers,
                recentLogs,
                activeAdmin: true
            })
        } catch (err) {
            console.error("Erro no Admin Dashboard:", err)
            res.status(500).render("error", {
                message: "Erro ao carregar o painel administrativo."
            })
        }
    }
}

module.exports = AdminController
