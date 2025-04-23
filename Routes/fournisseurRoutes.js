const express = require('express');
const router = express.Router();
const fournisseurController = require('../Controller/FournisseurController');

// Routes for fournisseur
router.get('/fournisseurs', fournisseurController.getAllFournisseurs);
router.get('/getfourn/:id', fournisseurController.getFournisseurById);
router.post('/fournisseurs', fournisseurController.createFournisseur);
router.put('/fournisseurs/:id', fournisseurController.updateFournisseur);
router.delete('/deletefourn/:id', fournisseurController.deleteFournisseur);
//router.post("/login", fournisseurController.login);

module.exports = router;
