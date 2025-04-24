const express = require("express");
const router = express.Router();
const clientController = require("../Controller/clientController");

// Routes for client
router.get("/clients", clientController.getAllClients);
router.get("/clients/:id", clientController.getClientById);
router.put("/clients/:id", clientController.updateClient);
router.delete("/clients/:id", clientController.deleteClient);
2
router.post("/register", clientController.register);
router.post("/login", clientController.login);
// Password reset routes
router.post("/forgot-password", clientController.forgotPassword);
router.post("/reset-password", clientController.resetPassword);
router.get("/validate-reset-token/:token/:userId/:userType", clientController.validateResetToken);
module.exports = router;
