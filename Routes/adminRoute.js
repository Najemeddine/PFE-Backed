const express = require('express');
const router = express.Router();
const admincontroller = require('../Controller/AdminController');

// Routes for client
router.get('/admin', admincontroller.getAllClients);
router.get('/admin/:id', admincontroller.getClientById);
router.post('/admin', admincontroller.createadmin);
router.put('/admin/:id', admincontroller.updateClient);
router.delete('/admin/:id', admincontroller.deleteClient);

//router.post("/login", admincontroller.login);

module.exports = router;
