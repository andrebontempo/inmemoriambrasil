const User = require("../models/User")
const mongoose = require("mongoose")
const AdminLog = require("../models/AdminLog")


const AccountsController = {

    // 📌 Listar todos os usuários
    list: async (req, res) => {
        try {
            const userCurrent = req.session.user

            const page = parseInt(req.query.page) || 1
            const limit = 10
            const skip = (page - 1) * limit

            const search = req.query.search || ""

            const filter = search
                ? {
                    $or: [
                        { name: { $regex: search, $options: "i" } },
                        { email: { $regex: search, $options: "i" } }
                    ]
                }
                : {}

            const totalUsers = await User.countDocuments(filter)

            const users = await User.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()

            const totalPages = Math.ceil(totalUsers / limit)

            res.render("statics/accounts/index", {
                users,
                userCurrent,
                search,
                currentPage: page,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
                prevPage: page - 1,
                nextPage: page + 1
            })

        } catch (err) {
            console.error(err)
            res.status(500).send("Erro ao carregar usuários")
        }
    },

    // 📌 Formulário de edição
    editForm: async (req, res) => {
        try {

            const userCurrent = req.session.user

            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).send("ID inválido")
            }

            const user = await User.findById(req.params.id).lean()

            if (!user) {
                return res.status(404).send("Usuário não encontrado")
            }

            res.render("statics/accounts/edit", {
                user,
                userCurrent
            })

        } catch (err) {
            console.error("Erro ao carregar edição:", err)
            res.status(500).send("Erro ao carregar usuário")
        }
    },

    // 📌 Atualizar usuário
    update: async (req, res) => {
        try {

            const { name, email, role } = req.body

            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).send("ID inválido")
            }

            await User.findByIdAndUpdate(req.params.id, {
                name,
                email,
                role
            })

            res.redirect("/accounts")

        } catch (err) {
            console.error("Erro ao atualizar usuário:", err)
            res.status(500).send("Erro ao atualizar usuário")
        }
    },

    // 📌 Excluir usuário
    delete: async (req, res) => {
        try {

            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).send("ID inválido")
            }

            // Evita admin excluir a si mesmo
            if (req.session.user._id.toString() === req.params.id) {
                return res.status(400).send("Você não pode excluir sua própria conta")
            }

            // Evita remover o último admin
            const adminCount = await User.countDocuments({ role: "admin" })

            const userToDelete = await User.findById(req.params.id)

            if (userToDelete?.role === "admin" && adminCount <= 1) {
                return res.status(400).send("Não é possível remover o último administrador")
            }

            await User.findByIdAndDelete(req.params.id)

            res.redirect("/accounts")

        } catch (err) {
            console.error("Erro ao excluir usuário:", err)
            res.status(500).send("Erro ao excluir usuário")
        }
    }

}

module.exports = AccountsController
