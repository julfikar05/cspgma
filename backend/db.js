const oracledb = require('oracledb');
require('dotenv').config();

async function initConnection() {
  try {
    await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTION_STRING,
      poolMin: 10,
      poolMax: 10,
      poolIncrement: 0
    });
    console.log('🟢 OracleDB Connected.');
  } catch (err) {
    console.error('🔴 OracleDB Connection Failed', err);
  }
}

module.exports = initConnection;