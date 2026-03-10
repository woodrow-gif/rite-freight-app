const prisma = require("../config/db")

// GET ALL LOADS
exports.getLoads = async (req, res) => {
  try {
    const loads = await prisma.load.findMany({
      include: {
        pickupLocation: true,
        deliveryLocation: true
      }
    })

    res.json(loads)

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}


// CREATE LOAD
exports.createLoad = async (req, res) => {
  try {

    const {
      loadNumber,
      rate,
      pickupLocationId,
      deliveryLocationId,
      pickupDate,
      createdById
    } = req.body


    const load = await prisma.load.create({
      data: {
        loadNumber,
        rate,
        pickupLocationId,
        deliveryLocationId,
        pickupDate: new Date(pickupDate),
        createdById
      }
    })

    res.json(load)

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
