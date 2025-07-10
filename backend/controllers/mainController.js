const fs = require('fs').promises; // Use promises-based fs for async file operations
const path = require("path");
const oracledb = require("oracledb");
const xlsx = require("xlsx");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

/**
 * 🔧 Helper Functions
 * These utility functions help sanitize and validate data before inserting into the database.
 * They ensure that invalid or missing data is handled gracefully, preventing database errors.
 */

/**
 * Returns the value or null if the value is undefined or an empty string.
 * Used for VARCHAR2 columns to safely handle text data.
 * @param {any} val - The input value
 * @returns {string|null} - The sanitized value or null
 */
const safeValue = (val) => (val === undefined || val === '' ? null : val);

/**
 * Converts a value to a valid number or returns null if the value is invalid.
 * Used for NUMBER columns to prevent ORA-01722 (invalid number) errors.
 * Logs invalid values for debugging.
 * @param {any} val - The input value
 * @param {string} columnName - The name of the column (for logging)
 * @returns {number|null} - The sanitized number or null
 */
const safeNumber = (val, columnName = 'unknown') => {
  if (typeof val === 'number') return val;
  if (val === undefined || val === null) return null;
  const str = val.toString().trim();
  // Check if the string is a valid number (including integers and decimals)
  if (!str || !/^-?\d*\.?\d+$/.test(str)) {
    console.warn(`Invalid numeric value in ${columnName}: "${str}"`);
    return null;
  }
  return Number(str);
};

/**
 * Converts a value to a valid JavaScript Date object or returns null if invalid.
 * Used for DATE columns to prevent date format errors.
 * @param {any} val - The input value
 * @returns {Date|null} - The sanitized Date object or null
 */
const safeDate = (val) => {
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

/**
 * Controller Functions
 * These functions handle HTTP requests, interact with the database, and process file uploads.
 * Each function is responsible for a specific feature of the application, such as testing the database connection,
 * handling user login, uploading reconciliation data, etc.
 */

/**
 * 1️⃣ Test DB Connection
 * Tests the database connection by executing a simple query against the DUAL table.
 * This is useful for verifying that the database is reachable and the connection configuration is correct.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.testDB = async (req, res) => {
  let conn; // Database connection object
  try {
    conn = await oracledb.getConnection(); // Get a connection from the pool
    const result = await conn.execute("SELECT 1 FROM dual"); // Execute a simple query
    res.json({ success: true, data: result.rows }); // Return success response
  } catch (err) {
    console.error("DB Test Error:", err); // Log the error for debugging
    res.status(500).json({ error: err.message }); // Return error response
  } finally {
    if (conn) await conn.close(); // Always close the connection
  }
};

/**
 * 2️⃣ User Login
 * Authenticates a user by checking their username and password against the SAP_USERS table.
 * This function is used to implement user login functionality.
 * @param {Object} req - Express request object (contains username and password in body)
 * @param {Object} res - Express response object
 */
exports.login = async (req, res) => {
  const { username, password } = req.body; // Extract username and password from request body
  let conn; // Database connection object
  try {
    conn = await oracledb.getConnection(); // Get a connection from the pool
    const result = await conn.execute(
      `SELECT * FROM SYSTEM.SAP_USERS WHERE username = :username AND password = :password`,
      { username, password }, // Bind variables for security
      { outFormat: oracledb.OUT_FORMAT_OBJECT } // Return results as objects
    );

    if (result.rows.length > 0) {
      res.json({ success: true }); // User authenticated successfully
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" }); // Authentication failed
    }
  } catch (err) {
    console.error("Login Error:", err); // Log the error for debugging
    res.status(500).json({ error: err.message }); // Return error response
  } finally {
    if (conn) await conn.close(); // Always close the connection
  }
};

/**
 * 3️⃣ Add Reconciliation (Excel Upload)
 * Processes an uploaded Excel file, checks for duplicates, and inserts valid data into the RECONCILIATION table.
 * If duplicates or invalid data are found, the upload is rejected, and a report is generated.
 * Only ORDERNUMBER is required; other columns are optional.
 * @param {Object} req - Express request object (contains file and username in body)
 * @param {Object} res - Express response object
 */
exports.addReconciliation = async (req, res) => {
  try {
    const username = req.body.username || "unknown"; // Default to "unknown" if username is not provided

    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const filePath = req.file.path; // Path to the uploaded file
    const workbook = xlsx.readFile(filePath); // Read the Excel file
    const sheet = workbook.Sheets[workbook.SheetNames[0]]; // Get the first sheet
    const jsonData = xlsx.utils.sheet_to_json(sheet); // Convert sheet to JSON

    // Check if the file is empty
    if (jsonData.length === 0) {
      await fs.unlink(filePath); // Clean up the uploaded file
      return res.status(400).json({ success: false, message: "Uploaded file is empty." });
    }

    // Validate required columns in the Excel file (only ORDERNUMBER is required)
    const requiredColumns = ["ORDERNUMBER"];
    const missingColumns = requiredColumns.filter(col => !Object.keys(jsonData[0]).includes(col));
    if (missingColumns.length > 0) {
      await fs.unlink(filePath); // Clean up the uploaded file
      return res.status(400).json({
        success: false,
        message: `Missing required column in Excel file: ${missingColumns.join(", ")}`,
      });
    }

    // Validate numeric data and ORDERNUMBER presence before any database operations
    const invalidRows = [];
    jsonData.forEach((row, index) => {
      const ordernumber = safeValue(row["ORDERNUMBER"]);
      const salesdocumentRaw = row["SALESDOCUMENT"];
      const yearRaw = row["YEAR"];
      const salesdocument = safeNumber(salesdocumentRaw, "SALESDOCUMENT");
      const year = safeNumber(yearRaw, "YEAR");

      // Log raw and processed values for debugging
      console.log(`Row ${index + 1}:`);
      console.log(`  ORDERNUMBER: ${ordernumber}`);
      console.log(`  SALESDOCUMENT: raw=${salesdocumentRaw}, processed=${salesdocument}`);
      console.log(`  YEAR: raw=${yearRaw}, processed=${year}`);

      // Check if ORDERNUMBER is missing or empty
      if (!ordernumber) {
        invalidRows.push({ row: index + 1, error: "ORDERNUMBER is required" });
      }

      // Collect invalid numeric data in SALESDOCUMENT or YEAR (if provided)
      if (salesdocument === null && salesdocumentRaw !== undefined) {
        invalidRows.push({ row: index + 1, ORDERNUMBER: ordernumber, SALESDOCUMENT: salesdocumentRaw });
      }
      if (year === null && yearRaw !== undefined) {
        invalidRows.push({ row: index + 1, ORDERNUMBER: ordernumber, YEAR: yearRaw });
      }
    });

    // If there are invalid rows, reject the upload
    if (invalidRows.length > 0) {
      await fs.unlink(filePath); // Clean up the uploaded file
      return res.status(400).json({
        success: false,
        message: `Found ${invalidRows.length} rows with invalid data. Upload rejected.`,
        invalidRows,
      });
    }

    const conn = await oracledb.getConnection(); // Get a database connection
    const duplicateList = []; // Array to store duplicate entries

    // Check for duplicates in the database
    for (let row of jsonData) {
      const order = row["ORDERNUMBER"];
      const material = row["MATERIAL_NUMBER"];
      if (!order || !material) continue; // Skip rows with missing order or material

      const check = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM SYSTEM.RECONCILIATION WHERE ORDERNUMBER = :ord AND MATERIAL_NUMBER = :mat`,
        { ord: order, mat: material }, // Bind variables for security
        { outFormat: oracledb.OUT_FORMAT_OBJECT } // Return results as objects
      );

      if (check.rows[0].CNT > 0) {
        duplicateList.push({ ORDERNUMBER: order, MATERIAL_NUMBER: material, ...row }); // Add to duplicate list
      }
    }

    // If duplicates exist, generate a report and stop processing
    if (duplicateList.length > 0) {
      const exportPath = path.join(__dirname, "../exports/duplicates_report.csv"); // Path for duplicate report

      const csvWriter = createCsvWriter({
        path: exportPath,
        header: Object.keys(duplicateList[0]).map(key => ({ id: key, title: key })) // CSV headers
      });

      await csvWriter.writeRecords(duplicateList); // Write duplicates to CSV
      await conn.close(); // Close the database connection
      await fs.unlink(filePath); // Clean up the uploaded file

      return res.status(409).json({
        success: false,
        message: `🚫 Found ${duplicateList.length} duplicate entries.`,
        duplicates: duplicateList,
        downloadUrl: "/api/reconciliation/download-duplicate-report" // URL to download the report
      });
    }

    // No duplicates → process inserts
    let insertedCount = 0; // Counter for successfully inserted records

    for (let row of jsonData) {
      // Log the values being inserted for debugging
      const salesdocument = safeNumber(row["SALESDOCUMENT"], "SALESDOCUMENT");
      const year = safeNumber(row["YEAR"], "YEAR");
      console.log(`Inserting row with ORDERNUMBER=${row["ORDERNUMBER"]}:`);
      console.log(`  SALESDOCUMENT: ${salesdocument}`);
      console.log(`  YEAR: ${year}`);

      // Insert the row into the database
      await conn.execute(
        `INSERT INTO SYSTEM.RECONCILIATION (
          ORDERNUMBER, SALESDOCUMENT, ORDERDATE, BATCHNUMBER, YEAR,
          MATERIAL_NUMBER, CLUB_NAME, ORDERTYPE, STATUS, CDD,
          SHIPOUTDATE, UPSTRACKINGNUMBER, USER_SAP
        ) VALUES (
          :ordernumber, :salesdocument, :orderdate, :batchnumber, :year,
          :material_number, :club_name, :ordertype, :status, :cdd,
          :shipoutdate, :upstrackingnumber, :username
        )`,
        {
          ordernumber: safeValue(row["ORDERNUMBER"]),
          salesdocument,
          orderdate: safeDate(row["ORDERDATE"]),
          batchnumber: safeValue(row["BATCHNUMBER"]),
          year,
          material_number: safeValue(row["MATERIAL_NUMBER"]),
          club_name: safeValue(row["CLUB_NAME"]),
          ordertype: safeValue(row["ORDERTYPE"]),
          status: safeValue(row["STATUS"]),
          cdd: safeValue(row["CDD"]),
          shipoutdate: safeDate(row["SHIPOUTDATE"]),
          upstrackingnumber: safeValue(row["UPSTRACKINGNUMBER"]),
          username
        },
        { autoCommit: true } // Commit the transaction immediately
      );

      insertedCount++; // Increment the counter
    }

    await conn.close(); // Close the database connection
    await fs.unlink(filePath); // Clean up the uploaded file

    // Return success response
    res.json({ success: true, message: `✅ ${insertedCount} record(s) inserted.` });

  } catch (err) {
    console.error("💥 Upload Error:", err); // Log the error for debugging
    if (req.file) await fs.unlink(req.file.path).catch(err => console.error('Error deleting file:', err)); // Clean up the uploaded file
    if (err.errorNum === 1722) { // Handle ORA-01722 (invalid number) specifically
      res.status(400).json({
        success: false,
        message: "Invalid numeric data in SALESDOCUMENT or YEAR column. Please check the uploaded file.",
      });
    } else {
      res.status(500).json({ success: false, message: "Internal server error." }); // Generic error response
    }
  }
};

/**
 * 4️⃣ Download Duplicate Report
 * Allows the client to download a CSV report of duplicate entries found during the upload process.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.downloadDuplicateReport = async (req, res) => {
  const filePath = path.join(__dirname, "../exports/duplicates_report.csv"); // Path to the duplicate report
  try {
    await fs.access(filePath); // Check if the file exists (asynchronous)
    res.download(filePath, "duplicates_report.csv"); // Send the file for download
  } catch (err) {
    res.status(404).send("🔍 No export file found."); // Return error if file does not exist
  }
};

/**
 * 5️⃣ Edit Reconciliation by ORDERNUMBER
 * Updates an existing record in the RECONCILIATION table based on the ORDERNUMBER.
 * @param {Object} req - Express request object (contains ordernumber in params and updates in body)
 * @param {Object} res - Express response object
 */
exports.editReconciliation = async (req, res) => {
  const { salesDocument, updated_data } = req.body;
  const { ordernumber } = req.params;

  let connection;

  try {
    connection = await oracledb.getConnection();

    // Update salesdocument column (if it's supposed to be updated)
    await connection.execute(
      `UPDATE reconciliation SET
         salesdocument = :salesDoc,
         orderdate = TO_DATE(:orderDate, 'YYYY-MM-DD'),
         batchnumber = :batchNumber,
         year = :year,
         material_number = :materialNumber,
         club_name = :clubName,
         ordertype = :orderType,
         status = :status,
         cdd = :cdd,
         shipoutdate = TO_DATE(:shipoutDate, 'YYYY-MM-DD'),
         upstrackingnumber = :trackingNumber
       WHERE ordernumber = :ordernumber`,
      {
        salesDoc: salesDocument,
        orderDate: updated_data.ORDERDATE,
        batchNumber: updated_data.BATCHNUMBER,
        year: updated_data.YEAR,
        materialNumber: updated_data.MATERIAL_NUMBER,
        clubName: updated_data.CLUB_NAME,
        orderType: updated_data.ORDERTYPE,
        status: updated_data.STATUS,
        cdd: updated_data.CDD,
        shipoutDate: updated_data.SHIPOUTDATE,
        trackingNumber: updated_data.UPSTRACKINGNUMBER,
        ordernumber: ordernumber
      },
      { autoCommit: true }
    );

    res.json({ success: true, message: '✅ Record updated successfully.' });

  } catch (err) {
    console.error('❌ Edit failed:', err);
    res.status(500).json({ success: false, message: '❌ Update failed, check backend logs.' });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
};

exports.deleteReconciliation = async (req, res) => {
  const { ordernumber } = req.params;
  const connection = await oracledb.getConnection();

  try {
    await connection.execute(
      'DELETE FROM reconciliation WHERE ordernumber = :ordernumber',
      [ordernumber],
      { autoCommit: true }
    );
    res.json({ success: true, message: 'Record deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  } finally {
    await connection.close();
  }
};

/**
 * 6️⃣ Search Reconciliation (Edit Page)
 * Searches for records in the RECONCILIATION table based on ORDERNUMBER or BATCHNUMBER.
 * This is used to retrieve data for editing.
 * @param {Object} req - Express request object (contains ordernumber and batchnumber in query)
 * @param {Object} res - Express response object
 */
exports.searchForEdit = async (req, res) => {
  const { ordernumber, batchnumber } = req.query; // Extract query parameters

  // Validate input
  if (!ordernumber && !batchnumber) {
    return res.status(400).json({ success: false, message: "Please provide ORDERNUMBER or BATCHNUMBER." });
  }

  const conn = await oracledb.getConnection(); // Get a database connection

  try {
    const result = await conn.execute(
      `SELECT * FROM SYSTEM.RECONCILIATION WHERE 
        (:ordernumber IS NULL OR ORDERNUMBER = :ordernumber)
        AND (:batchnumber IS NULL OR BATCHNUMBER = :batchnumber)`,
      {
        ordernumber: ordernumber || null,
        batchnumber: batchnumber || null
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT } // Return results as objects
    );

    res.json({ success: true, data: result.rows }); // Return search results
  } catch (err) {
    res.status(500).json({ success: false, message: err.message }); // Return error response
  } finally {
    await conn.close(); // Always close the connection
  }
};

/**
 * 7️⃣ As-of Checking Page (with BATCH logic)
 * Processes an uploaded Excel file to check for duplicates based on ORDERNUMBER, MATERIAL_NUMBER, and BATCHNUMBER.
 * Generates a report if duplicates are found.
 * @param {Object} req - Express request object (contains file)
 * @param {Object} res - Express response object
 */
exports.checkAsOfDuplicates = async (req, res) => {
  // Check if a file was uploaded
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const filePath = req.file.path; // Path to the uploaded file
  const workbook = xlsx.readFile(filePath); // Read the Excel file
  const sheet = workbook.Sheets[workbook.SheetNames[0]]; // Get the first sheet
  const rows = xlsx.utils.sheet_to_json(sheet); // Convert sheet to JSON

  const conn = await oracledb.getConnection(); // Get a database connection
  const duplicates = []; // Array to store duplicate entries

  try {
    for (let row of rows) {
      // Extract and sanitize data from the Excel file
      const ordernumber = row['Order ID']?.toString().trim();
      const material = row['Material']?.toString().trim();
      const batch = row['BATCHNUMBER']?.toString().trim() || null;

      if (!ordernumber || !material) continue; // Skip rows with missing order or material

      // Check if the ordernumber and material exist in the database
      const dbResult = await conn.execute(
        `SELECT BATCHNUMBER FROM SYSTEM.RECONCILIATION WHERE ORDERNUMBER = :ord AND MATERIAL_NUMBER = :mat`,
        { ord: ordernumber, mat: material },
        { outFormat: oracledb.OUT_FORMAT_OBJECT } // Return results as objects
      );

      const dbBatches = dbResult.rows.map(r => r.BATCHNUMBER?.toString()?.trim());

      // A duplicate is found if the ordernumber and material exist but the batch is different
      const isDuplicate = dbResult.rows.length > 0 && !dbBatches.includes(batch);

      if (isDuplicate) {
        duplicates.push({
          ORDERNUMBER: ordernumber,
          MATERIAL_NUMBER: material,
          BATCHNUMBER: batch,
          ...row
        });
      }
    }

    await conn.close(); // Close the database connection
    await fs.unlink(filePath); // Clean up the uploaded file

    // If duplicates were found, generate a report
    if (duplicates.length > 0) {
      const reportPath = path.join(__dirname, '../exports/asof_check_duplicates.csv'); // Path for duplicate report

      const csvWriter = createCsvWriter({
        path: reportPath,
        header: Object.keys(duplicates[0]).map(key => ({ id: key, title: key })) // CSV headers
      });

      await csvWriter.writeRecords(duplicates); // Write duplicates to CSV

      return res.status(200).json({
        success: false,
        message: `⚠️ Found ${duplicates.length} duplicates.`,
        duplicates,
        downloadUrl: '/api/reconciliation/asof-duplicate-report' // URL to download the report
      });
    }

    // No duplicates found
    return res.status(200).json({
      success: true,
      message: '✅ No duplicates found.'
    });

  } catch (err) {
    console.error("As of Checking Error:", err); // Log the error for debugging
    res.status(500).json({ success: false, message: 'Internal server error.' }); // Return error response
  } finally {
    try {
      await fs.access(filePath); // Check if the file exists
      await fs.unlink(filePath); // Clean up the uploaded file
    } catch (err) {
      console.error('Error deleting file in finally block:', err);
    }
  }
};

/**
 * 8️⃣ Download As-of Duplicate CSV
 * Allows the client to download a CSV report of duplicates found during the as-of check.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.downloadAsOfDuplicateReport = async (req, res) => {
  const reportPath = path.join(__dirname, '../exports/asof_check_duplicates.csv'); // Path to the duplicate report

  try {
    await fs.access(reportPath); // Check if the file exists (asynchronous)
    res.download(reportPath, 'asof_check_duplicates.csv'); // Send the file for download
  } catch (err) {
    res.status(404).send('No As of duplicate report found.'); // Return error if file does not exist
  }
};

/**
 * 9️⃣ Reconciliation Data Search
 * Searches for records in the RECONCILIATION table based on ORDERNUMBER or SALESDOCUMENT.
 * This is used to retrieve data for general searching purposes.
 * @param {Object} req - Express request object (contains ordernumber and salesdocument in query)
 * @param {Object} res - Express response object
 */
exports.searchReconciliationData = async (req, res) => {
  const { ordernumber, salesdocument } = req.query;

  console.log('Search request received:', { ordernumber, salesdocument });

  if (!ordernumber && !salesdocument) {
    return res.status(400).json({ success: false, message: "Please provide ordernumber or salesdocument." });
  }

  const conn = await oracledb.getConnection();

  try {
    const result = await conn.execute(
      `SELECT ORDERNUMBER, SALESDOCUMENT, ORDERDATE, BATCHNUMBER, YEAR,
              MATERIAL_NUMBER, CLUB_NAME, ORDERTYPE, STATUS, CDD,
              SHIPOUTDATE, UPSTRACKINGNUMBER
       FROM SYSTEM.RECONCILIATION
       WHERE (:ordernumber IS NULL OR UPPER(ORDERNUMBER) = UPPER(:ordernumber))
         AND (:salesdocument IS NULL OR SALESDOCUMENT = :salesdocument)`,
      {
        ordernumber: ordernumber || null,
        salesdocument: salesdocument || null,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Convert array of objects to array of arrays in the expected order
    const rows = result.rows.map(row => [
      row.ORDERNUMBER,
      row.SALESDOCUMENT,
      row.ORDERDATE,
      row.BATCHNUMBER,
      row.YEAR,
      row.MATERIAL_NUMBER,
      row.CLUB_NAME,
      row.ORDERTYPE,
      row.STATUS,
      row.CDD,
      row.SHIPOUTDATE,
      row.UPSTRACKINGNUMBER,
    ]);

    console.log('Search results:', rows);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  } finally {
    await conn.close();
  }
};

/**
 * 10️⃣ Download Sample Excel File
 * Generates and serves a sample Excel file with the required columns and example data.
 * This helps users prepare their data correctly.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.downloadSampleExcel = async (req, res) => {
  try {
    // Define the sample data structure
    const sampleData = [
      {
        ORDERNUMBER: "ORD123",
        SALESDOCUMENT: 1001,
        ORDERDATE: "2023-10-01",
        BATCHNUMBER: "BATCH001",
        YEAR: 2023,
        MATERIAL_NUMBER: "MAT123",
        CLUB_NAME: "Club A",
        ORDERTYPE: "Type A",
        STATUS: "Open",
        CDD: "CDD1",
        SHIPOUTDATE: "2023-10-05",
        UPSTRACKINGNUMBER: "TRK123"
      },
      {
        ORDERNUMBER: "ORD124",
        SALESDOCUMENT: "",
        ORDERDATE: "",
        BATCHNUMBER: "",
        YEAR: "",
        MATERIAL_NUMBER: "",
        CLUB_NAME: "",
        ORDERTYPE: "",
        STATUS: "",
        CDD: "",
        SHIPOUTDATE: "",
        UPSTRACKINGNUMBER: ""
      }
    ];

    // Create a new workbook and worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(sampleData);

    // Add a note in the worksheet indicating that only ORDERNUMBER is required
    const note = "Note: Only ORDERNUMBER is required. All other columns are optional.";
    xlsx.utils.sheet_add_aoa(worksheet, [[note]], { origin: -1 });

    // Add the worksheet to the workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sample Data");

    // Generate a buffer for the Excel file
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename="sample_reconciliation.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Send the Excel file buffer
    res.send(excelBuffer);
  } catch (err) {
    console.error("Sample Excel Download Error:", err); // Log the error for debugging
    res.status(500).json({ success: false, message: "Internal server error." }); // Return error response
  }
};

/**
 * 🔁 Real Duplicate Check
 * Finds potential duplicates where ORDERNUMBER + MATERIAL_NUMBER appear more than once
 * with multiple BATCHNUMBERs (based on your smart SQL)
 */
exports.checkTrueDuplicates = async (req, res) => {
  const conn = await oracledb.getConnection();

  try {
    const result = await conn.execute(
      `WITH ReconciliationData AS (
         SELECT
           ORDERNUMBER,
           MATERIAL_NUMBER,
           BATCHNUMBER,
           STATUS,
           COUNT(*) OVER (PARTITION BY ORDERNUMBER, MATERIAL_NUMBER) AS PotentialDuplicateCount,
           COUNT(DISTINCT BATCHNUMBER) OVER (PARTITION BY ORDERNUMBER, MATERIAL_NUMBER) AS DistinctBatchCount
         FROM Reconciliation
       )
       SELECT
         ORDERNUMBER,
         MATERIAL_NUMBER,
         BATCHNUMBER,
         STATUS,
         PotentialDuplicateCount AS DUPLICATECOUNT
       FROM ReconciliationData
       WHERE PotentialDuplicateCount > 1
         AND DistinctBatchCount > 1
       ORDER BY
         ORDERNUMBER, MATERIAL_NUMBER, BATCHNUMBER, STATUS`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("📛 Error running duplicate check:", err);
    res.status(500).json({ success: false, message: "Failed to run duplicate query." });
  } finally {
    await conn.close();
  }
};