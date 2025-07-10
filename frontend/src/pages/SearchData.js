import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import './SearchData.css';

const SearchData = () => {
  const [form, setForm] = useState({ ordernumber: '', salesdocument: '' });
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');
  const [isSearched, setIsSearched] = useState(false);
  const [filters, setFilters] = useState({});
  const [selectedRow, setSelectedRow] = useState(null);

  const handleSearch = async () => {
    if (!form.ordernumber && !form.salesdocument) {
      alert("Please enter ORDERNUMBER or SALESDOCUMENT");
      return;
    }

    setResults([]);
    setMessage('');
    setIsSearched(true);

    try {
      const res = await axios.get('http://localhost:5000/api/reconciliation/datasearch', {
        params: form
      });

      if (res.data.success && res.data.data.length > 0) {
        setResults(res.data.data);
      } else {
        setMessage('No matching records found.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Search failed. Please try again.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleExport = () => {
    if (results.length === 0) {
      alert('No results to export!');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    XLSX.writeFile(workbook, "reconciliation_search_results.xlsx");
  };

  const filteredResults = results.filter(row =>
    Object.keys(filters).every((key) =>
      !filters[key] || (row[key]?.toString().toLowerCase().includes(filters[key].toLowerCase()))
    )
  );

  return (
    <div className="search-page">
      {/* Top Buttons */}
      <div className="header-btns">
        <Link to="/dashboard">
          <button className="home-button">🏠 Home</button>
        </Link>
        <button className="export-button" onClick={handleExport}>⬇️ Export</button>
      </div>

      {/* Search bar */}
      <div className={`search-wrapper ${isSearched ? 'moved-up' : ''}`}>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="ORDERNUMBER"
            value={form.ordernumber}
            onChange={(e) => setForm({ ...form, ordernumber: e.target.value })}
            onKeyDown={handleKeyDown}
          />
          <input
            type="text"
            placeholder="SALESDOCUMENT"
            value={form.salesdocument}
            onChange={(e) => setForm({ ...form, salesdocument: e.target.value })}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
      </div>

      {/* Message */}
      {message && <div className="message">{message}</div>}

      {/* Table */}
      {results.length > 0 && (
        <div className="table-scroll-container">
          <div className="table">
            {/* Header with Filters */}
            <div className="table-header">
              {Object.keys(results[0]).map((key, i) => (
                <div key={i} className="table-header-cell">
                  <div className="column-title">{key}</div>
                  <input
                    type="text"
                    placeholder="Filter"
                    value={filters[key] || ''}
                    onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            {/* Filtered Rows */}
            {filteredResults.map((row, rowIndex) => (
              <div
                className="table-row"
                key={rowIndex}
                onClick={() => setSelectedRow(row)}
              >
                {Object.values(row).map((val, colIndex) => (
                  <div key={colIndex} className="table-cell">{val ?? '—'}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Detail Viewer */}
      {selectedRow && (
        <div className="record-details-popup">
          <h3>📋 Record Details</h3>
          <button onClick={() => setSelectedRow(null)} className="close-button">×</button>
          <div className="record-detail-content">
            {Object.entries(selectedRow).map(([key, val]) => (
              <div key={key} className="detail-item">
                <strong>{key}:</strong> <span>{val ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchData;