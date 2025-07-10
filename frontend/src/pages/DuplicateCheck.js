import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './DuplicateCheck.css';

const DuplicateCheck = () => {
  const [data, setData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleDuplicateCheck = async () => {
    setData([]);
    setMessage('');
    setSelectedRow(null);
    setLoading(true);

    try {
      const res = await axios.get('http://localhost:5000/api/reconciliation/true-duplicates');
      if (res.data.success && res.data.data.length > 0) {
        setData(res.data.data);
      } else {
        setMessage('✅ No true duplicates found.');
      }
    } catch (err) {
      setMessage('❌ Error checking duplicates.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="duplicate-container">
      {/* Header */}
      <div className="duplicate-header">
        <Link to="/dashboard">
          <button className="home-button">🏠 Home</button>
        </Link>
        <button className="check-button" onClick={handleDuplicateCheck} disabled={loading}>
          🔁 Duplicate Check
        </button>
      </div>

      {message && <div className="message">{message}</div>}

      {/* Table Data */}
      {data.length > 0 && (
        <div className="duplicate-table">
          <div className="table-scrollable">
            <table>
              <thead>
                <tr>
                  {Object.keys(data[0]).map((key, index) => (
                    <th key={index}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr key={rowIndex} onClick={() => setSelectedRow(row)}>
                    {Object.values(row).map((val, keyIndex) => (
                      <td key={keyIndex}>{val ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Details */}
      {selectedRow && (
        <div className="record-details-popup">
          <h3>📋 Record Details</h3>
          <button className="close-button" onClick={() => setSelectedRow(null)}>×</button>
          <div className="record-detail-content">
            {Object.entries(selectedRow).map(([key, value]) => (
              <div key={key} className="detail-item">
                <strong>{key}:</strong> <span>{value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DuplicateCheck;