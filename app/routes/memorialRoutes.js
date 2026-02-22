const express = require("express")
const router = express.Router()

// Controllers
const MemorialController = require("../controllers/MemorialController")
const MemorialFETController = require("../controllers/MemorialFETController")
const TributeController = require("../controllers/TributeController")
const LifeStoryController = require("../controllers/LifeStoryController")
const SharedStoryController = require("../controllers/SharedStoryController")
const GalleryController = require("../controllers/GalleryController")
const InviteController = require("../controllers/InviteController")

// Middlewares
const AuthMiddleware = require("../middlewares/AuthMiddleware")
const { upload, uploadToR2 } = require("../middlewares/UploadMiddleware")
const { loadMemorial, canViewMemorial, canEditMemorial, setAdminMenuPermission } = require("../middlewares/MemorialMiddleware")

// --------- ROTAS PÚBLICAS (BUSCA) ---------
router.get("/pesquisa", MemorialController.searchMemorial)
router.get("/search", MemorialController.searchMemorial)

// --------- CRIAÇÃO DE MEMORIAL (REQUER LOGIN) ---------
router.get("/create-step1", AuthMiddleware, MemorialController.renderStep1)
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
router.get("/:slug/memorial/edit", AuthMiddleware, loadMemorial, setAdminMenuPermission, canEditMemorial, MemorialController.editMemorial)
router.post("/:slug/memorial/update", AuthMiddleware, loadMemorial, canEditMemorial, MemorialController.updateMemorial)

// Configurações de Privacidade e Tema
router.get("/:slug/memorial/privacy/edit", AuthMiddleware, loadMemorial, setAdminMenuPermission, canEditMemorial, MemorialController.editPrivacy)
router.post("/:slug/privacy/update", AuthMiddleware, loadMemorial, canEditMemorial, MemorialController.updatePrivacy)

router.get("/:slug/theme/edit", AuthMiddleware, loadMemorial, setAdminMenuPermission, canEditMemorial, MemorialController.editTheme)
router.post("/:slug/theme/update", AuthMiddleware, loadMemorial, canEditMemorial, MemorialController.updateTheme)

// Foto Principal (FET)
router.get("/:slug/memorial-fet/edit", AuthMiddleware, loadMemorial, setAdminMenuPermission, canEditMemorial, MemorialFETController.editMemorialFET)
router.post("/:slug/memorial-fet/update", AuthMiddleware, loadMemorial, canEditMemorial, upload.single("file"), uploadToR2, MemorialFETController.updateMemorialFET)

// Deleção do Memorial
router.post("/:slug/delete", AuthMiddleware, loadMemorial, canEditMemorial, MemorialController.deleteMemorial)

// --------- SUB-RECURSOS (GALERIA, TRIBUTOS, HISTÓRIAS) ---------

// Galeria
router.get("/:slug/gallery", loadMemorial, setAdminMenuPermission, canViewMemorial, GalleryController.showGallery)
router.get("/:slug/gallery/edit/:id", AuthMiddleware, loadMemorial, setAdminMenuPermission, canEditMemorial, GalleryController.editGallery)
router.post("/:slug/gallery/update/:tipo", AuthMiddleware, loadMemorial, canEditMemorial, upload.single("file"), uploadToR2, GalleryController.updateGallery)
router.post("/:slug/gallery/delete/:tipo", AuthMiddleware, loadMemorial, canEditMemorial, GalleryController.deleteFile)
router.post("/:slug/gallery/caption/:tipo", AuthMiddleware, loadMemorial, canEditMemorial, GalleryController.updateCaption)

// Histórias Compartilhadas (Shared Stories)
router.get("/:slug/sharedstory", loadMemorial, setAdminMenuPermission, canViewMemorial, SharedStoryController.showSharedStory)
router.get("/:slug/sharedstory/edit/:id", AuthMiddleware, loadMemorial, canEditMemorial, SharedStoryController.editSharedStory)
router.post("/:slug/sharedstory/create", AuthMiddleware, loadMemorial, upload.single("file"), uploadToR2, SharedStoryController.createSharedStory)
router.post("/:slug/sharedstory/update/:id", AuthMiddleware, loadMemorial, canEditMemorial, upload.single("file"), uploadToR2, SharedStoryController.updateSharedStory)
router.post("/:slug/sharedstory/delete/:id", AuthMiddleware, loadMemorial, canEditMemorial, SharedStoryController.deleteSharedStory)

// Histórias de Vida (Life Stories)
router.get("/:slug/lifestory", loadMemorial, setAdminMenuPermission, canViewMemorial, LifeStoryController.showLifeStory)
router.get("/:slug/lifestory/edit/:id", AuthMiddleware, loadMemorial, canEditMemorial, LifeStoryController.editLifeStory)
router.post("/:slug/lifestory/create", AuthMiddleware, loadMemorial, upload.single("file"), uploadToR2, LifeStoryController.createLifeStory)
router.post("/:slug/lifestory/update/:id", AuthMiddleware, loadMemorial, canEditMemorial, upload.single("file"), uploadToR2, LifeStoryController.updateLifeStory)
router.post("/:slug/lifestory/delete/:id", AuthMiddleware, loadMemorial, canEditMemorial, LifeStoryController.deleteLifeStory)

// Tributos
router.get("/:slug/tribute", loadMemorial, setAdminMenuPermission, canViewMemorial, TributeController.showTribute)
router.get("/:slug/tribute/edit/:id", AuthMiddleware, loadMemorial, TributeController.editTribute) // Usuário logado edita seu tributo
router.post("/:slug/tribute/create", AuthMiddleware, loadMemorial, TributeController.createTribute)
router.post("/:slug/tribute/update/:id", AuthMiddleware, loadMemorial, TributeController.updateTribute)
router.post("/:slug/tribute/delete/:id", AuthMiddleware, loadMemorial, TributeController.deleteTribute)

module.exports = router
