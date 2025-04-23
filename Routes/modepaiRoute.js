const express = require('express');
const router = express.Router();
const admincontroller = require('../Controller/modepaiController');

// Routes for modepai
router.get('/modepai', admincontroller.getAllCommandes);
router.get('/modepai/:id', admincontroller.getCommandeById);
router.post('/modepai', admincontroller.createCommande);
router.put('/modepai/:id', admincontroller.updateCommande);
router.delete('/modepai/:id', admincontroller.deleteCommande);


module.exports = router;
