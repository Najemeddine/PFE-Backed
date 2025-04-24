const express = require('express');
const router = express.Router();
const adminController = require('../Controller/AdminController');

// Routes for client
// router.get('/admin', admincontroller.getAllClients);
router.get('/admin/:id', adminController.getClientById);
router.post('/admin', adminController.createadmin);
router.put('/admin/:id', adminController.updateAdmin);
router.delete('/admin/:id', adminController.deleteAdmin);
// Admin Routes
router.get('/clients', adminController.getAllClients);
router.delete('/deleteclient/:id', adminController.deleteClient);
router.get('/admin-statistics', adminController.getAdminStatistics);

//router.post("/login", admincontroller.login);

module.exports = router;
