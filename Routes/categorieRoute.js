const express = require('express');
const router = express.Router();
const admincontroller = require('../Controller/categorieController');

// Routes for categories
router.get('/categories', admincontroller.getAllCommandes);
router.get('/categories/:id', admincontroller.getCommandeById);
router.post('/categories', admincontroller.createCommande);
router.put('/categories/:id', admincontroller.updateCommande);
router.delete('/categories/:id', admincontroller.deleteCommande);


module.exports = router;
