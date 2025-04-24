const express = require('express');
const router = express.Router();
const fournisseurController = require('../Controller/FournisseurController');

router.get('/fournisseurs', fournisseurController.getAllFournisseurs);
router.get('/fournisseurs/:id', fournisseurController.getFournisseurById);
router.post('/fournisseurs', fournisseurController.createFournisseur);
router.put('/fournisseurs/:id', fournisseurController.updateFournisseur);
router.delete('/fournisseurs/:id', fournisseurController.deleteFournisseur);
//router.post("/login", fournisseurController.login);

module.exports = router;
