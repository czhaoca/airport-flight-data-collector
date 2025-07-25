const DataCollectionInterface = require('./interface');
const databaseConfig = require('../../config/database');
const FlightModel = require('./models/flight-model');

let dbInterface = null;

async function getDatabase() {
  if (!dbInterface) {
    const config = databaseConfig.getConfig();
    dbInterface = new DataCollectionInterface(config);
    await dbInterface.initialize();
  }
  
  return dbInterface;
}

async function closeDatabase() {
  if (dbInterface) {
    await dbInterface.disconnect();
    dbInterface = null;
  }
}

module.exports = {
  getDatabase,
  closeDatabase,
  DataCollectionInterface,
  FlightModel
};