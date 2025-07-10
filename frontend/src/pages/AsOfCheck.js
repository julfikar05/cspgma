import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './AsOfCheck.css';

const AsOfCheck = () => {
  const [file, setFile] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [message, setMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkSeconds, setCheckSeconds] = useState(0);
  const timerRef = useRef(null);
  const [timeVisible, setTimeVisible] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    resetState();
  };

  const resetState = () => {
    setMessage('');
    setDuplicates([]);
    setDownloadUrl('');
    setCheckSeconds(0);
    setTimeVisible(false);
    clearInterval(timerRef.current);
  };

  const handleCheck = async () => {
    if (!file) {
      alert('Please select a file.');
      return;
    }

    resetState();
    setLoading(true);
    setTimeVisible(true);

    let start = Date.now();
    timerRef.current = setInterval(() => {
      setCheckSeconds((prev) => prev + 1);
    }, 1000);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:5000/api/reconciliation/check', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setMessage('✅ No duplicates found.');
      } else {
        setMessage(`⚠️ Found ${res.data.duplicates.length} duplicates.`);
        setDuplicates(res.data.duplicates || []);
        setDownloadUrl(res.data.downloadUrl);
      }
    } catch (err) {
      setMessage('❌ Failed to check file.');
    } finally {
      clearInterval(timerRef.current);
      const duration = Math.round((Date.now() - start) / 1000);
      setCheckSeconds(duration);
      setLoading(false);
    }
  };

  return (
    <div className="asof-container">
      {/* Home + Duration */}
      <div className="asof-header">
        <Link to="/dashboard">
          <button className="home-button">🏠 Home</button>
        </Link>
        {timeVisible && (
          <div className="elapsed-time">⏱ Took: {checkSeconds}s</div>
        )}
      </div>

      <h2>🔍 As of Checking</h2>
      <p>Upload an Excel file to scan for duplicate orders by Order ID + Material + BATCH rules</p>

      {/* File input and Check button */}
      <div className="asof-form-row">
        <label htmlFor="file-upload" className="file-button">
          Choose File
        </label>
        <input id="file-upload" type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        {file && <span className="file-label">{file.name}</span>}
        <button className="check-button" onClick={handleCheck} disabled={loading}>
          {loading ? 'Checking...' : 'Check Duplicates'}
        </button>
      </div>

      {message && <div className="message">{message}</div>}

      {duplicates.length > 0 && (
        <div className="asof-results">
          <h4>🔴 <strong>{duplicates.length}</strong> Duplicate Records Found</h4>

          <div className="table-scroll-x">
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
              <a href={`http://localhost:5000${downloadUrl}`} download target="_blank" rel="noopener noreferrer">
                ⬇️ Download Duplicate Report
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AsOfCheck;