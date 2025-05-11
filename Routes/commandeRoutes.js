const express = require('express');
const router = express.Router();
const commandeController = require('../Controller/CommandeController');

// Routes for commande
router.get('/commandes', commandeController.getAllCommandes);
router.get('/commandes/:id', commandeController.getCommandeById);
router.get('/commandes/client/:clientId', commandeController.getCommandesByClientId);
router.post('/commandes', commandeController.createCommande);
router.put('/commandes/:id', commandeController.updateCommande);
router.delete('/commandes/:id', commandeController.deleteCommande);

module.exports = router;