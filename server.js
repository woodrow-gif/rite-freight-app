const express = require("express");
const cors = require("cors");

const driverRoutes = require("./routes/drivers");
const loadRoutes = require("./routes/loads");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/drivers", driverRoutes);
app.use("/loads", loadRoutes);

app.get("/", (req, res) => {
  res.send("TMS API running 🚛");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
