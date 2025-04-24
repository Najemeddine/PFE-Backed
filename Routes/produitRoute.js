const express = require('express');
const router = express.Router();
const produitController = require('../Controller/ProduitController');

// Routes for produit
router.get('/produits', produitController.getAllProduits);
router.get('/produits/:id', produitController.getProduitById);
router.post('/produits', produitController.createProduit);
router.put('/produits/:id', produitController.updateProduit);
router.delete('/produits/:id', produitController.deleteProduit);
router.get('/statistics', produitController.getStatistics);

module.exports = router;
