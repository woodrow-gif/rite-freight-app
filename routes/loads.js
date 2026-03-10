const express = require("express")
const router = express.Router()

const {
  getLoads,
  createLoad
} = require("../controllers/loadsController")

router.get("/", getLoads)
router.post("/", createLoad)

module.exports = router
