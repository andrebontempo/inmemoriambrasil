const Memorial = require("../models/Memorial")
const Tribute = require("../models/Tribute")
const LifeStory = require("../models/LifeStory")
const SharedStory = require("../models/SharedStory")
const User = require("../models/User")
const AdminLog = require("../models/AdminLog")
const { escapeRegex } = require("../utils/regexHelpers")

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
    },

    listMemoriais: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 10
            const skip = (page - 1) * limit
            const query = req.query.q ? req.query.q.trim() : ""

            let searchFilter = {}
            if (query) {
                const escapedQuery = escapeRegex(query)
                searchFilter = {
                    $or: [
                        { firstName: { $regex: escapedQuery, $options: "i" } },
                        { lastName: { $regex: escapedQuery, $options: "i" } },
                        { slug: { $regex: escapedQuery, $options: "i" } }
                    ]
                }
            }

            const totalMemoriais = await Memorial.countDocuments(searchFilter)
            const totalPages = Math.ceil(totalMemoriais / limit)

            const memoriais = await Memorial.find(searchFilter)
                .populate("owner", "firstName lastName email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()

            res.render("admin/memoriallist", {
                title: "Gerenciar Memoriais - In Memoriam Brasil",
                memoriais,
                activeAdmin: true,
                pagination: {
                    total: totalMemoriais,
                    totalPages,
                    currentPage: page,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    nextPage: page + 1,
                    prevPage: page - 1,
                    limit
                },
                query
            })
        } catch (err) {
            console.error("Erro ao listar memoriais (Admin):", err)
            res.status(500).render("error", {
                message: "Erro ao carregar a lista de memoriais."
            })
        }
    }
}

module.exports = AdminController
