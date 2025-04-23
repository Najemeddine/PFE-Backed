const express = require('express');
const router = express.Router();
const admincontroller = require('../Controller/ProduitController');

// Routes for produit
router.get('/produit', admincontroller.getAllCommandes);
router.get('/produit/:id', admincontroller.getCommandeById);
router.post('/produit', admincontroller.createCommande);
router.put('/produit/:id', admincontroller.updateCommande);
router.delete('/produit/:id', admincontroller.deleteCommande);


module.exports = router;
