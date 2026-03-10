require("dotenv").config()

const express = require("express")
const cors = require("cors")

const loadRoutes = require("./routes/loads")

const app = express()

app.use(cors())
app.use(express.json())

app.use("/api/loads", loadRoutes)

app.get("/", (req, res) => {
  res.json({ message: "Dispatch API working" })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log("Server running on port " + PORT)
})
