require("dotenv").config()
const mongoose = require("mongoose")
const id = process.argv[2] || "g912_XQ9dQSYJeK0tIjzyLlv6r1jSMng"
;(async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI not set")
      process.exit(1)
    }
    await mongoose.connect(process.env.MONGO_URI)
    const db = mongoose.connection.db
    const doc = await db.collection("sessions").findOne({ _id: id })
    console.log("search id:", id)
    console.log("found:", !!doc)
    if (doc) console.log(JSON.stringify(doc, null, 2))
    await mongoose.disconnect()
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})()
