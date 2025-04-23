const express = require('express');
const router = express.Router();
const admincontroller = require('../Controller/paiementController');

// Routes for paiment
router.get('/paiment', admincontroller.getAllCommandes);
router.get('/paiment/:id', admincontroller.getCommandeById);
router.post('/paiment', admincontroller.createCommande);
router.put('/paiment/:id', admincontroller.updateCommande);
router.delete('/paiment/:id', admincontroller.deleteCommande);


module.exports = router;
