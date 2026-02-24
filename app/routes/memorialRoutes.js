const express = require("express")
const router = express.Router()

// Controllers
const MemorialController = require("../controllers/MemorialController")
const TributeController = require("../controllers/TributeController")
const LifeStoryController = require("../controllers/LifeStoryController")
const SharedStoryController = require("../controllers/SharedStoryController")
const GalleryController = require("../controllers/GalleryController")
const MemberController = require("../controllers/MemberController")
const InviteController = require("../controllers/InviteController")

// Middlewares
const AuthMiddleware = require("../middlewares/AuthMiddleware")
const { upload, uploadToR2 } = require("../middlewares/UploadMiddleware")
const { loadMemorial, canViewMemorial, canEditMemorial, setAdminMenuPermission } = require("../middlewares/MemorialMiddleware")

// --------- ROTAS PÚBLICAS (BUSCA) ---------
router.get("/pesquisa", MemorialController.searchMemorial)
router.get("/search", MemorialController.searchMemorial)

// --------- CRIAÇÃO DE MEMORIAL (REQUER LOGIN) ---------
router.get("/create-step1", MemorialController.renderStep1)
router.post("/create-step1", AuthMiddleware, MemorialController.createStep1)

router.get("/create-step2", AuthMiddleware, MemorialController.renderStep2)
router.post("/create-step2", AuthMiddleware, MemorialController.createStep2)

router.get("/create-step3", AuthMiddleware, MemorialController.renderStep3)
router.post("/create-step3", AuthMiddleware, MemorialController.createStep3)

router.get("/create-step4", AuthMiddleware, MemorialController.renderStep4)
router.post("/create-step4", AuthMiddleware, upload.single("file"), uploadToR2, MemorialController.createStep4)

// Atalho legível
router.get("/create-memorial", AuthMiddleware, (req, res) => res.redirect("/memorial/create-step1"))

// --------- ROTAS DO MEMORIAL (SLUG-DEPENDENT) ---------

// Visualização Pública/Privada (Página Principal)
router.get("/:slug/about", loadMemorial, setAdminMenuPermission, canViewMemorial, MemorialController.showMemorial)
router.get("/:slug", (req, res) => res.redirect(`/memorial/${req.params.slug}/about`))

// Convites
router.post("/:slug/invite", AuthMiddleware, loadMemorial, canEditMemorial, InviteController.sendInvite)

// Edição Básica do Memorial
router.get("/:slug/edit", AuthMiddleware, loadMemorial, setAdminMenuPermission, canEditMemorial, MemorialController.editMemorial)
router.post("/:slug/update", AuthMiddleware, loadMemorial, canEditMemorial, MemorialController.updateMemorial)

// Configurações de Privacidade e Tema
router.get("/:slug/privacy/edit", AuthMiddleware, loadMemorial, setAdminMenuPermission, canEditMemorial, MemorialController.editPrivacy)
router.post("/:slug/privacy/update", AuthMiddleware, loadMemorial, canEditMemorial, MemorialController.updatePrivacy)

router.get("/:slug/theme/edit", AuthMiddleware, loadMemorial, setAdminMenuPermission, canEditMemorial, MemorialController.editTheme)
router.post("/:slug/theme/update", AuthMiddleware, loadMemorial, canEditMemorial, MemorialController.updateTheme)

// Foto Principal
router.get("/:slug/photo/edit", AuthMiddleware, loadMemorial, setAdminMenuPermission, canEditMemorial, MemorialController.editFotoPrincipal)
router.post("/:slug/photo/update", AuthMiddleware, loadMemorial, canEditMemorial, upload.single("file"), uploadToR2, MemorialController.updateFotoPrincipal)

// Deleção do Memorial
router.post("/:slug/delete", AuthMiddleware, loadMemorial, canEditMemorial, MemorialController.deleteMemorial)

// --------- SUB-RECURSOS (GALERIA, TRIBUTOS, HISTÓRIAS) ---------

// Galeria
router.get("/:slug/gallery", loadMemorial, setAdminMenuPermission, canViewMemorial, GalleryController.showGallery)
router.get("/:slug/gallery/edit/:id", AuthMiddleware, loadMemorial, setAdminMenuPermission, canEditMemorial, GalleryController.editGallery)
router.post("/:slug/gallery/update/:tipo", AuthMiddleware, loadMemorial, canEditMemorial, upload.single("file"), uploadToR2, GalleryController.updateGallery)
router.post("/:slug/gallery/delete/:tipo", AuthMiddleware, loadMemorial, canEditMemorial, GalleryController.deleteFile)
router.post("/:slug/gallery/caption/:tipo", AuthMiddleware, loadMemorial, canEditMemorial, GalleryController.updateCaption)
router.post("/:slug/gallery/save-all", AuthMiddleware, loadMemorial, canEditMemorial, GalleryController.saveAllCaptions)

// Gestão de Membros (Premium)
router.get("/:slug/members", AuthMiddleware, loadMemorial, setAdminMenuPermission, canEditMemorial, MemberController.listMembers)
router.post("/:slug/members/add/:role", AuthMiddleware, loadMemorial, canEditMemorial, MemberController.addMember)
router.post("/:slug/members/remove/:role/:userId", AuthMiddleware, loadMemorial, canEditMemorial, MemberController.removeMember)

// Histórias Compartilhadas (Shared Stories)
router.get("/:slug/sharedstory", loadMemorial, setAdminMenuPermission, canViewMemorial, SharedStoryController.showSharedStory)
router.get("/:slug/sharedstory/edit/:id", AuthMiddleware, loadMemorial, setAdminMenuPermission, canEditMemorial, SharedStoryController.editSharedStory)
router.post("/:slug/sharedstory/create", AuthMiddleware, loadMemorial, upload.single("file"), uploadToR2, SharedStoryController.createSharedStory)
router.post("/:slug/sharedstory/update/:id", AuthMiddleware, loadMemorial, canEditMemorial, upload.single("file"), uploadToR2, SharedStoryController.updateSharedStory)
router.post("/:slug/sharedstory/delete/:id", AuthMiddleware, loadMemorial, canEditMemorial, SharedStoryController.deleteSharedStory)

// Histórias de Vida (Life Stories)
router.get("/:slug/lifestory", loadMemorial, setAdminMenuPermission, canViewMemorial, LifeStoryController.showLifeStory)
router.get("/:slug/lifestory/edit/:id", AuthMiddleware, loadMemorial, setAdminMenuPermission, canEditMemorial, LifeStoryController.editLifeStory)
router.post("/:slug/lifestory/create", AuthMiddleware, loadMemorial, upload.single("file"), uploadToR2, LifeStoryController.createLifeStory)
router.post("/:slug/lifestory/update/:id", AuthMiddleware, loadMemorial, canEditMemorial, upload.single("file"), uploadToR2, LifeStoryController.updateLifeStory)
router.post("/:slug/lifestory/delete/:id", AuthMiddleware, loadMemorial, canEditMemorial, LifeStoryController.deleteLifeStory)

// Tributos
router.get("/:slug/tribute", loadMemorial, setAdminMenuPermission, canViewMemorial, TributeController.showTribute)
router.get("/:slug/tribute/edit/:id", AuthMiddleware, loadMemorial, setAdminMenuPermission, canViewMemorial, TributeController.editTribute) // Usuário logado edita seu tributo
router.post("/:slug/tribute/create", AuthMiddleware, loadMemorial, TributeController.createTribute)
router.post("/:slug/tribute/update/:id", AuthMiddleware, loadMemorial, TributeController.updateTribute)
router.post("/:slug/tribute/delete/:id", AuthMiddleware, loadMemorial, TributeController.deleteTribute)

module.exports = router
