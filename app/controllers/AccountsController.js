const User = require("../models/User")
const mongoose = require("mongoose")
const AdminLog = require("../models/AdminLog")


const AccountsController = {

    // 📌 Listar todos os usuários
    list: async (req, res) => {
        try {
            const userCurrent = req.user

            const page = parseInt(req.query.page) || 1
            const limit = 10
            const skip = (page - 1) * limit

            const search = req.query.search || ""

            const filter = search
                ? {
                    $or: [
                        { firstName: { $regex: search, $options: "i" } },
                        { lastName: { $regex: search, $options: "i" } },
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

            res.render("admin/accounts/index", {
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

            const userCurrent = req.user

            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).send("ID inválido")
            }

            const user = await User.findById(req.params.id).lean()

            if (!user) {
                return res.status(404).send("Usuário não encontrado")
            }

            res.render("admin/accounts/edit", {
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
            const adminUser = req.user

            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).send("ID inválido")
            }

            const oldUser = await User.findById(req.params.id).lean()

            if (!oldUser) {
                return res.status(404).send("Usuário não encontrado")
            }

            const { email, role } = req.body
            await User.findByIdAndUpdate(req.params.id, {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email,
                role
            })

            // 🔎 Detectar mudanças
            const changes = {}

            if (oldUser.firstName !== req.body.firstName) changes.firstName = { before: oldUser.firstName, after: req.body.firstName }
            if (oldUser.lastName !== req.body.lastName) changes.lastName = { before: oldUser.lastName, after: req.body.lastName }
            if (oldUser.email !== email) changes.email = { before: oldUser.email, after: email }
            if (oldUser.role !== role) changes.role = { before: oldUser.role, after: role }

            // 📝 Criar log
            await AdminLog.create({
                adminId: adminUser._id,
                action: "UPDATE_USER",
                targetUserId: req.params.id,
                changes,
                ip: req.ip,
                userAgent: req.headers["user-agent"]
            })

            res.redirect("/admin/accounts")

        } catch (err) {
            console.error("Erro ao atualizar usuário:", err)
            res.status(500).send("Erro ao atualizar usuário")
        }
    },

    // 📌 Excluir usuário
    delete: async (req, res) => {
        try {

            const adminUser = req.user

            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).send("ID inválido")
            }

            if (adminUser._id.toString() === req.params.id) {
                return res.status(400).send("Você não pode excluir sua própria conta")
            }

            const userToDelete = await User.findById(req.params.id).lean()

            if (!userToDelete) {
                return res.status(404).send("Usuário não encontrado")
            }

            const adminCount = await User.countDocuments({ role: "admin" })

            if (userToDelete.role === "admin" && adminCount <= 1) {
                return res.status(400).send("Não é possível remover o último administrador")
            }

            await User.findByIdAndDelete(req.params.id)

            // 📝 Criar log
            await AdminLog.create({
                adminId: adminUser._id,
                action: "DELETE_USER",
                targetUserId: req.params.id,
                changes: {
                    deletedUser: {
                        firstName: userToDelete.firstName,
                        lastName: userToDelete.lastName,
                        email: userToDelete.email,
                        role: userToDelete.role
                    }
                },
                ip: req.ip,
                userAgent: req.headers["user-agent"]
            })

            res.redirect("/admin/accounts")

        } catch (err) {
            console.error("Erro ao excluir usuário:", err)
            res.status(500).send("Erro ao excluir usuário")
        }
    },

    logs: async (req, res) => {
        try {

            const page = parseInt(req.query.page) || 1
            const limit = 20
            const skip = (page - 1) * limit

            const total = await AdminLog.countDocuments()
            const totalPages = Math.ceil(total / limit)

            const logs = await AdminLog.find()
                .populate("adminId", "firstName lastName email")
                .populate("targetUserId", "firstName lastName email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()

            res.render("admin/accounts/logs", {
                logs,
                currentPage: page,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
                prevPage: page - 1,
                nextPage: page + 1
            })

        } catch (err) {
            console.error(err)
            res.status(500).send("Erro ao carregar logs")
        }
    }



}

module.exports = AccountsController
