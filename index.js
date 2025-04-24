const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const fournisseurRoutes = require("./Routes/fournisseurRoutes");
const clientRoutes = require("./Routes/clientRoutes");
const commandeRoutes = require("./Routes/commandeRoutes");
const adminRoutes = require("./Routes/adminRoute");
const categorie = require("./Routes/categorieRoute");
const modepai = require("./Routes/modepaiRoute");
const paiement = require("./Routes/paimentRoute");
const produit = require("./Routes/produitRoute");

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.json());
require("dotenv").config();
app.get("/", (req, res) => {
  res.send("Welcome to Express & MySQL!");
});

app.use("/api/", fournisseurRoutes);
app.use("/api/", clientRoutes);
app.use("/api/", commandeRoutes);
app.use("/api/", adminRoutes);
app.use("/api/", categorie);
app.use("/api/", modepai);
app.use("/api/", paiement);
app.use("/api/", produit);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
