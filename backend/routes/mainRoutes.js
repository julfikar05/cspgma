const express = require('express');
const router = express.Router();
const controller = require('../controllers/mainController');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

// ========== 🔐 AUTH ==========
router.post('/login', controller.login);

// ========== 📤 ADD RECONCILIATION ==========
router.post('/reconciliation/add', upload.single('file'), controller.addReconciliation);
router.get('/reconciliation/download-duplicate-report', controller.downloadDuplicateReport);

// ========== ✏️ EDIT RECONCILIATION ==========
router.get('/reconciliation/search-for-edit', controller.searchForEdit); // Used for edit page search
router.put('/reconciliation/edit/:ordernumber', controller.editReconciliation);
router.delete('/reconciliation/delete/:ordernumber', controller.deleteReconciliation);

// ========== 🧪 AS OF CHECKING ==========
router.post('/reconciliation/check', upload.single('file'), controller.checkAsOfDuplicates);
router.get('/reconciliation/asof-duplicate-report', controller.downloadAsOfDuplicateReport);

// ========== 🔍 DATA SEARCH ==========
router.get('/reconciliation/datasearch', controller.searchReconciliationData); // Renamed from /datasearch

// ========== 🧪 DEBUG ==========
router.get('/test-db', controller.testDB);
// router.get('/debug/users', controller.debugUsers);

// ========== 📄 SAMPLE DOWNLOAD ==========
router.get('/reconciliation/sample', controller.downloadSampleExcel);

// ========== Duplicate Report Download ==========
router.get('/reconciliation/true-duplicates', controller.checkTrueDuplicates);

module.exports = router;