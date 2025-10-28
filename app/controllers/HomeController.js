const Memorial = require("../models/Memorial")
const Tribute = require("../models/Tribute")
const LifeStory = require("../models/LifeStory")
const SharedStory = require("../models/SharedStory")

const HomeController = {
  index: async (req, res, next) => {
    try {
      const totalMemoriais = await Memorial.countDocuments()
      const totalTributos = await Tribute.countDocuments()
      const totalHistorias = await LifeStory.countDocuments()
      const totalCompartilhadas = await SharedStory.countDocuments()

      // Visitas: você pode salvar visitas em um campo no modelo Memorial
      const memoriais = await Memorial.find({}, "visits")
      const totalVisitas = memoriais.reduce(
        (sum, m) => sum + (m.visits || 0),
        0
      )

      res.render("statics/home", {
        totalMemoriais,
        totalTributos,
        totalHistorias,
        totalCompartilhadas,
        totalVisitas,
      })
    } catch (err) {
      next(err)
    }
  },
}

module.exports = HomeController
