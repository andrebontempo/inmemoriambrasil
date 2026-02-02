const express = require("express")
const router = express.Router()
const MemorialController = require("../controllers/MemorialController")
const MemorialFETController = require("../controllers/MemorialFETController")
const TributeController = require("../controllers/TributeController")
const LifeStoryController = require("../controllers/LifeStoryController")
const SharedStoryController = require("../controllers/SharedStoryController")
const GalleryController = require("../controllers/GalleryController")
const authMiddleware = require("../middlewares/authMiddleware")
const { upload, uploadToR2 } = require("../middlewares/uploadMiddleware")
const { r2, PutObjectCommand, DeleteObjectCommand } = require("../../config/r2")
const InviteController = require("../controllers/InviteController")

//Middlewares para o Permissionamento dos Memoriais
const loadMemorial = require("../middlewares/loadMemorial")
const canViewMemorial = require("../middlewares/canViewMemorial")

//*********ROTAS PARA O ENVIO DE EMAIL***********
router.post("/:slug/invite", InviteController.sendInvite)

//*********ROTAS PARA O GALELRY CONTROLLER***********
router.get("/:slug/gallery", GalleryController.showGallery)
router.post(
  "/:slug/gallery/update/:tipo",
  upload.single("file"),
  authMiddleware,
  GalleryController.updateGallery
)
router.get(
  "/:slug/gallery/edit/:id",
  authMiddleware,
  GalleryController.editGallery
)
router.post(
  "/:slug/gallery/delete/:tipo",
  authMiddleware,
  GalleryController.deleteFile
)

//*********ROTAS PARA O SHAREDSTORY CONTROLLER***********
router.post(
  "/:slug/sharedstory/create",
  authMiddleware,
  upload.single("file"),
  uploadToR2, // 3) Envia o arquivo para o Cloudflare R2
  SharedStoryController.createSharedStory
)
router.get("/:slug/sharedstory", SharedStoryController.showSharedStory)
router.get("/:slug/sharedstory/edit/:id", SharedStoryController.editSharedStory)
router.post(
  "/:slug/sharedstory/update/:id",
  authMiddleware,
  upload.single("file"),
  uploadToR2, // 3) Envia o arquivo para o Cloudflare R2
  SharedStoryController.updateSharedStory
)
router.post(
  "/:slug/sharedstory/delete/:id",
  SharedStoryController.deleteSharedStory
)

//*********ROTAS PARA O LIFESTORY CONTROLLER***********
router.post(
  "/:slug/lifestory/create",
  authMiddleware,
  upload.single("file"),
  uploadToR2, // 3) Envia o arquivo para o Cloudflare R2
  LifeStoryController.createLifeStory
)
router.get("/:slug/lifestory", loadMemorial, canViewMemorial, LifeStoryController.showLifeStory)
router.get("/:slug/lifestory/edit/:id", LifeStoryController.editLifeStory)
router.post(
  "/:slug/lifestory/update/:id",
  authMiddleware,
  upload.single("file"),
  uploadToR2, // 3) Envia o arquivo para o Cloudflare R2
  LifeStoryController.updateLifeStory
)
router.post("/:slug/lifestory/delete/:id", LifeStoryController.deleteLifeStory)

//*********ROTAS PARA O TRIBUTE CONTROLLER***********
router.get("/:slug/tribute", loadMemorial, canViewMemorial, TributeController.showTribute)
router.post(
  "/:slug/tribute/create",
  authMiddleware,
  TributeController.createTribute
)
router.get(
  "/:slug/tribute/edit/:id",
  authMiddleware,
  TributeController.editTribute
)
router.post(
  "/:slug/tribute/update/:id",
  (req, res) => {
    // Verificar se o campo _method existe e se é 'PUT'
    if (req.body._method && req.body._method === "PUT") {
      // Chama o controller de atualização se o _method for PUT
      return TributeController.updateTribute(req, res)
    }
    // Caso contrário, retorna um erro de método não permitido
    res.status(400).send("Método não permitido")
  },
  authMiddleware,
  TributeController.updateTribute
)
router.post(
  "/:slug/tribute/delete/:id",
  authMiddleware,
  TributeController.deleteTribute
)

//*********ROTAS PARA O MEMORIAL - FOTO, EPITÁFIO E TEMA CONTROLLER***********
router.get("/:slug/memorial-fet/edit", MemorialFETController.editMemorialFET)
router.post(
  "/:slug/memorial-fet/update",
  upload.single("file"),
  uploadToR2,
  MemorialFETController.updateMemorialFET
)

//*********ROTAS PARA O MEMORIAL CONTROLLER***********
// Etapa 1: Nome e Sobrenome (Verificar se o usuário está cadastrado)
router.get("/create-step1", authMiddleware, MemorialController.renderStep1) // Mostrar o formulário da etapa 1
router.post("/create-step1", authMiddleware, MemorialController.createStep1) // Processar os dados da etapa 1

// Etapa 2: Dados de Nascimento, Falecimento, Sexo e Parentesco
router.get("/create-step2", authMiddleware, MemorialController.renderStep2) // Mostrar o formulário da etapa 2
router.post("/create-step2", authMiddleware, MemorialController.createStep2) // Processar os dados da etapa 2

// Etapa 3: Escolha do Plano
router.get("/create-step3", authMiddleware, MemorialController.renderStep3) // Mostrar o formulário da etapa 3 (escolha do plano)
router.post("/create-step3", authMiddleware, MemorialController.createStep3) // Processar a escolha do plano e criar o memorial

// Etapa 4: Foto de Capa, Epitáfio e Tema
router.get("/create-step4", authMiddleware, MemorialController.renderStep4) // Mostrar o formulário da etapa 4 (personalização)

router.post(
  "/create-step4",
  authMiddleware, // 1) Garante login
  upload.single("file"), // 2) Captura o arquivo via multer
  uploadToR2, // 3) Envia o arquivo para o Cloudflare R2
  MemorialController.createStep4) // 4) Salva no banco e finaliza
router.get("/pesquisa", MemorialController.searchMemorial)
router.get("/create-memorial", MemorialController.createStep1)
router.get("/:slug/about", loadMemorial, canViewMemorial, MemorialController.showMemorial)
router.get("/:slug/memorial/edit", MemorialController.editMemorial)
router.post(
  "/:slug/memorial/update",
  (req, res) => {
    // Verificar se o campo _method existe e se é 'PUT'
    if (req.body._method && req.body._method === "PUT") {
      // Chama o controller de atualização se o _method for PUT
      return MemorialController.updateMemorial(req, res)
    }
    // Caso contrário, retorna um erro de método não permitido
    res.status(400).send("Método não permitido")
  },
  MemorialController.updateMemorial
)
router.post("/:slug/delete", (req, res) => {
  if (req.body._method && req.body._method === "DELETE") {
    return MemorialController.deleteMemorial(req, res)
  }
  res.status(400).send("Método não permitido")
})
// Rota genérica para /memorial/:slug/about"
router.get("/:slug", (req, res) => {
  res.redirect(`/memorial/${req.params.slug}/about`)
})

module.exports = router
