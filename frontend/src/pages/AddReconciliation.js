import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './AddReconciliation.css';

const AddReconciliation = () => {
  const [file, setFile] = useState(null); // State for the selected file
  const [message, setMessage] = useState(''); // State for success/error messages
  const [messageType, setMessageType] = useState(''); // State to track message type (success, error, warning)
  const [loading, setLoading] = useState(false); // State for loading indicator
  const [downloadUrl, setDownloadUrl] = useState(''); // State for duplicate report download URL
  const [duplicates, setDuplicates] = useState([]); // State for duplicate entries
  const fileInputRef = useRef(null); // Ref to reset file input

  /**
   * Handles file selection and resets any previous messages or duplicate data.
   * @param {Object} e - Event object from file input
   */
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
    setMessageType('');
    setDownloadUrl('');
    setDuplicates([]);
  };

  /**
   * Handles the file upload process, including sending the file to the backend and handling responses.
   */
  const handleUpload = async () => {
    if (!file) {
      setMessage('Please choose a file to upload.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', 'admin'); // Optional: Replace with dynamic username if needed

    try {
      const res = await axios.post('http://localhost:5000/api/reconciliation/add', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setMessage(res.data.message); // Display success message
        setMessageType('success');
        setFile(null); // Reset file input
        fileInputRef.current.value = ''; // Clear file input field
      }
    } catch (error) {
      if (error.response) {
        // Handle specific HTTP error statuses
        if (error.response.status === 409) {
          // Handle duplicate entries
          setMessage(`⚠️ ${error.response.data.message}`);
          setMessageType('warning');
          setDuplicates(error.response.data.duplicates || []);
          setDownloadUrl(error.response.data.downloadUrl || '');
        } else if (error.response.status === 400) {
          // Handle bad request errors (e.g., missing columns, invalid data)
          setMessage(`❌ ${error.response.data.message}`);
          setMessageType('error');
          if (error.response.data.invalidRows) {
            // If invalid rows are returned, display them
            setDuplicates(error.response.data.invalidRows);
            setDownloadUrl(''); // No download URL for invalid data
          }
        } else {
          // Handle other errors (e.g., 500 Internal Server Error)
          setMessage(`❌ Upload failed: ${error.response.data.message || 'An unexpected error occurred.'}`);
          setMessageType('error');
        }
      } else {
        // Handle network errors or other issues
        setMessage('❌ Upload failed: Unable to connect to the server. Please try again.');
        setMessageType('error');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the download of the sample Excel file.
   */
  const handleSampleDownload = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/reconciliation/sample', {
        responseType: 'blob', // Important for downloading binary files
      });

      // Create a URL for the blob and trigger a download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sample_reconciliation.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Sample download error:', error);
      setMessage('❌ Failed to download sample file. Please try again.');
      setMessageType('error');
    }
  };

  return (
    <div className="add-container">
      {/* Header */}
      <div className="add-header">
        <Link to="/dashboard">
          <button className="home-button" aria-label="Go to Dashboard">
            🏠 Home
          </button>
        </Link>
      </div>

      <h2>➕ Add Reconciliation</h2>
      <p>Please upload your reconciliation Excel or CSV file.</p>

      {/* Upload Field */}
      <div className="upload-row">
        <label htmlFor="upload-file" className="file-button" aria-label="Choose File">
          Choose File
        </label>
        <input
          id="upload-file"
          type="file"
          onChange={handleFileChange}
          accept=".xlsx,.xls,.csv"
          ref={fileInputRef}
          aria-describedby="file-help"
        />
        {file && <span className="file-label">{file.name}</span>}

        <button
          className="upload-button"
          onClick={handleUpload}
          disabled={loading}
          aria-busy={loading}
          aria-label={loading ? 'Uploading file' : 'Upload file'}
        >
          {loading ? (
            <>
              <span className="spinner" /> Uploading...
            </>
          ) : (
            'Upload'
          )}
        </button>

        {/* Sample Button */}
        <button
          className="sample-button"
          onClick={handleSampleDownload}
          aria-label="Download sample Excel file"
        >
          ⬇️ Sample
        </button>
      </div>
      <p id="file-help" className="file-help">
        Accepted file types: .xlsx, .xls, .csv. Only ORDERNUMBER is required; all other columns are optional. Use the Sample button to download a template.
      </p>

      {/* Status Message */}
      {message && (
        <div className={`upload-message ${messageType}`}>
          {message}
        </div>
      )}

      {/* Duplicate or Invalid Data Table (if any) */}
      {duplicates.length > 0 && (
        <div className="duplicates-section">
          <h4>
            {downloadUrl ? `${duplicates.length} Duplicates Found` : `${duplicates.length} Invalid Rows Found`}
          </h4>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {Object.keys(duplicates[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {duplicates.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j}>{val ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {downloadUrl && (
            <div className="download-link">
              <a href={`http://localhost:5000${downloadUrl}`} download>
                ⬇️ Download Duplicate Report
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddReconciliation;