import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  MenuItem,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  Snackbar,
  Alert,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { Link } from 'react-router-dom'; // Import Link for navigation
import axios from '../api/axios';
import './EditReconciliation.css'; // Import the CSS file

function EditReconciliation() {
  const [filters, setFilters] = useState({
    clubName: '',
    salesDocument: '',
    orderNumber: '',
  });

  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set()); // State for selected rows
  const [selectedRow, setSelectedRow] = useState(null); // State for the row being edited
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // State for error messages
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false); // State for delete confirmation dialog
  const [rowToDelete, setRowToDelete] = useState(null); // State for the row to delete
  const [deleting, setDeleting] = useState(false); // State for delete loading

  const statusOptions = ['Pending', 'Approved', 'Hold', 'Shipped'];
  const orderTypeOptions = ['Standard', 'Urgent', 'Internal', 'Return'];

  /**
   * Handles changes to the filter inputs.
   * @param {Object} e - Event object from input
   */
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  /**
   * Searches for reconciliation records based on the filter criteria.
   */
  const searchData = async () => {
    try {
      const res = await axios.get('/reconciliation/search', {
        params: {
          club_name: filters.clubName,
          salesdocument: filters.salesDocument,
          ordernumber: filters.orderNumber,
        },
      });
      setRows(res.data.data || []);
      setSelectedRows(new Set()); // Reset selected rows on new search
      setSelectedRow(null); // Reset selected row to close edit form
      setErrorMessage(''); // Clear any previous error messages
    } catch (err) {
      console.error('Search error:', err);
      setErrorMessage('Failed to search records. Please try again.');
      setRows([]); // Clear rows on error
    }
  };

  /**
   * Handles selection of a row for editing.
   * Maps the row array to an object with named properties.
   * @param {Array} row - The selected row data
   */
  const handleSelect = (row) => {
    setSelectedRow({
      ordernumber: row[0], // ORDERNUMBER
      salesDocument: row[1], // SALESDOCUMENT
      orderDate: row[2], // ORDERDATE
      batchNumber: row[3], // BATCHNUMBER
      year: row[4], // YEAR
      materialNumber: row[5], // MATERIAL_NUMBER
      clubName: row[6], // CLUB_NAME
      orderType: row[7], // ORDERTYPE
      status: row[8], // STATUS
      cdd: row[9], // CDD
      shipOutDate: row[10], // SHIPOUTDATE
      trackingNumber: row[11], // UPSTRACKINGNUMBER
    });
  };

  /**
   * Handles changes to the edit form inputs.
   * @param {Object} e - Event object from input
   */
  const handleEditChange = (e) => {
    setSelectedRow({ ...selectedRow, [e.target.name]: e.target.value });
  };

  /**
   * Updates the selected row in the database.
   */
  const updateRow = async () => {
    if (!selectedRow) {
      setErrorMessage('No row selected for update.');
      return;
    }

    try {
      const response = await axios.put(`/reconciliation/edit/${selectedRow.ordernumber}`, {
        salesdocument: selectedRow.salesDocument,
        orderdate: selectedRow.orderDate,
        batchnumber: selectedRow.batchNumber,
        year: selectedRow.year,
        material_number: selectedRow.materialNumber,
        club_name: selectedRow.clubName,
        ordertype: selectedRow.orderType,
        status: selectedRow.status,
        cdd: selectedRow.cdd,
        shipoutdate: selectedRow.shipOutDate,
        upstrackingnumber: selectedRow.trackingNumber,
      });
      setUpdateSuccess(true);
      setErrorMessage(''); // Clear any previous error messages
      searchData(); // Refresh the search results
    } catch (err) {
      console.error('Update failed:', err);
      setErrorMessage(`Failed to update record: ${err.response?.data?.message || err.message}`);
    }
  };

  /**
   * Opens the delete confirmation dialog for a specific row.
   * @param {string} orderNumber - The ORDERNUMBER of the row to delete
   */
  const confirmDeleteRow = (orderNumber) => {
    setRowToDelete(orderNumber);
    setDeleteConfirmOpen(true);
  };

  /**
   * Closes the delete confirmation dialog.
   */
  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setRowToDelete(null);
  };

  /**
   * Deletes a specific row from the database.
   */
  const handleDeleteConfirm = async () => {
    if (!rowToDelete) return;

    setDeleting(true);
    try {
      await axios.delete(`/reconciliation/delete/${rowToDelete}`);
      setDeleteMessage(`Deleted ORDERNUMBER ${rowToDelete}`);
      setErrorMessage(''); // Clear any previous error messages
      searchData(); // Refresh the search results
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleteMessage('Failed to delete');
      setErrorMessage(`Failed to delete record: ${err.response?.data?.message || err.message}`);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setRowToDelete(null);
    }
  };

  /**
   * Handles the "Select All" checkbox.
   * @param {Object} event - Event object from checkbox
   */
  const handleSelectAll = (event) => {
    const checked = event.target.checked;
    if (checked) {
      const newSelectedRows = new Set(rows.map((row) => row[0])); // Select all rows by ORDERNUMBER
      setSelectedRows(newSelectedRows);
    } else {
      setSelectedRows(new Set());
    }
  };

  /**
   * Handles the selection of an individual row.
   * @param {string} orderNumber - The ORDERNUMBER of the row
   */
  const handleSelectRow = (orderNumber) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(orderNumber)) {
      newSelectedRows.delete(orderNumber);
    } else {
      newSelectedRows.add(orderNumber);
    }
    setSelectedRows(newSelectedRows);
  };

  /**
   * Checks if a row is selected.
   * @param {string} orderNumber - The ORDERNUMBER of the row
   * @returns {boolean} - Whether the row is selected
   */
  const isRowSelected = (orderNumber) => selectedRows.has(orderNumber);

  return (
    <Container className="edit-reconciliation-container">
      {/* Header with Home Menu */}
      <Box className="edit-reconciliation-header">
        <Link to="/dashboard">
          <Button variant="contained" color="primary" aria-label="Go to Dashboard">
            🏠 Home
          </Button>
        </Link>
      </Box>

      {/* Search Box */}
      <Paper className="edit-reconciliation-search-box">
        <Typography variant="h6">Search Reconciliation Records</Typography>
        <Box className="edit-reconciliation-search-fields">
          <TextField
            label="Order Number"
            name="orderNumber"
            value={filters.orderNumber}
            onChange={handleFilterChange}
          />
          <TextField
            label="Club Name"
            name="clubName"
            value={filters.clubName}
            onChange={handleFilterChange}
          />
          <TextField
            label="Sales Document"
            name="salesDocument"
            value={filters.salesDocument}
            onChange={handleFilterChange}
          />
          <Button variant="contained" onClick={searchData}>
            SEARCH
          </Button>
        </Box>
      </Paper>

      {/* Results Table */}
      {rows.length > 0 && (
        <Paper className="edit-reconciliation-results">
          <Typography variant="h6">Search Results</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedRows.size === rows.length && rows.length > 0}
                      onChange={handleSelectAll}
                      indeterminate={selectedRows.size > 0 && selectedRows.size < rows.length}
                    />
                  </TableCell>
                  <TableCell>Order Number</TableCell>
                  <TableCell>Sales Doc</TableCell>
                  <TableCell>Club</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Select</TableCell>
                  <TableCell>Delete</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isRowSelected(row[0])}
                        onChange={() => handleSelectRow(row[0])}
                      />
                    </TableCell>
                    <TableCell>{row[0]}</TableCell> {/* ORDERNUMBER */}
                    <TableCell>{row[1]}</TableCell> {/* SALESDOCUMENT */}
                    <TableCell>{row[6]}</TableCell> {/* CLUB_NAME */}
                    <TableCell>{row[8]}</TableCell> {/* STATUS */}
                    <TableCell>{row[7]}</TableCell> {/* ORDERTYPE */}
                    <TableCell>
                      <Button size="small" onClick={() => handleSelect(row)}>
                        Select
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => confirmDeleteRow(row[0])}
                        disabled={deleting}
                      >
                        {deleting && rowToDelete === row[0] ? (
                          <CircularProgress size={20} />
                        ) : (
                          'Delete'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Edit Form */}
      {selectedRow && (
        <Paper className="edit-reconciliation-form">
          <Typography variant="h6">Edit Selected Row</Typography>
          <Box className="edit-reconciliation-form-fields">
            <TextField
              label="Order Number"
              value={selectedRow.ordernumber}
              disabled
              fullWidth
            />
            <TextField
              label="Sales Document"
              name="salesDocument"
              value={selectedRow.salesDocument || ''}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              label="Order Date"
              name="orderDate"
              value={selectedRow.orderDate || ''}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              label="Batch Number"
              name="batchNumber"
              value={selectedRow.batchNumber || ''}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              label="Year"
              name="year"
              value={selectedRow.year || ''}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              label="Material Number"
              name="materialNumber"
              value={selectedRow.materialNumber || ''}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              label="Club Name"
              name="clubName"
              value={selectedRow.clubName || ''}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              select
              fullWidth
              label="Order Type"
              name="orderType"
              value={selectedRow.orderType || ''}
              onChange={handleEditChange}
            >
              {orderTypeOptions.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Status"
              name="status"
              value={selectedRow.status || ''}
              onChange={handleEditChange}
            >
              {statusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="CDD"
              name="cdd"
              value={selectedRow.cdd || ''}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              label="Ship Out Date"
              name="shipOutDate"
              value={selectedRow.shipOutDate || ''}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              label="Tracking Number"
              name="trackingNumber"
              value={selectedRow.trackingNumber || ''}
              onChange={handleEditChange}
              fullWidth
            />
            <Button variant="contained" onClick={updateRow}>
              Update Record
            </Button>
          </Box>
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-confirm-title"
        aria-describedby="delete-confirm-description"
      >
        <DialogTitle id="delete-confirm-title" className="edit-reconciliation-dialog-title">
          Warning: Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-confirm-description" className="edit-reconciliation-dialog-content">
            <strong>Warning:</strong> Are you sure you want to delete the record with ORDERNUMBER{' '}
            <strong>{rowToDelete}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar: Update ✔️ */}
      <Snackbar
        open={updateSuccess}
        autoHideDuration={3000}
        onClose={() => setUpdateSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setUpdateSuccess(false)}>
          Updated successfully!
        </Alert>
      </Snackbar>

      {/* Snackbar: Delete ✔️ */}
      <Snackbar
        open={!!deleteMessage}
        autoHideDuration={3000}
        onClose={() => setDeleteMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="info" onClose={() => setDeleteMessage('')}>
          {deleteMessage}
        </Alert>
      </Snackbar>

      {/* Snackbar: Error ❌ */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={5000}
        onClose={() => setErrorMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default EditReconciliation;