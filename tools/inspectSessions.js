require("dotenv").config()
const mongoose = require("mongoose")

async function run() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error("MONGO_URI not set in environment.")
    process.exit(1)
  }
  await mongoose.connect(uri)
  console.log("Connected to MongoDB")
  const db = mongoose.connection.db
  const collections = await db.listCollections().toArray()
  console.log("Collections:", collections.map((c) => c.name).join(", "))
  const possible = [
    "sessions",
    "session",
    "mySessions",
    "connect.sessions",
    "sessions.collection",
    "sessionsCollection",
  ]
  // find likely session collections
  const sessionCols = collections
    .map((c) => c.name)
    .filter(
      (n) =>
        /sess/i.test(n) ||
        /session/i.test(n) ||
        n.toLowerCase().includes("session")
    )
  console.log("Likely session collections:", sessionCols)
  for (const col of sessionCols) {
    const docs = await db.collection(col).find({}).limit(10).toArray()
    console.log(`\n--- ${col} (up to 10 docs) ---`)
    docs.forEach((d) => {
      console.log("doc _id:", d._id)
    })
  }
  await mongoose.disconnect()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
