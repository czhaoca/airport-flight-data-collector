const fs = require('fs').promises;
const path = require('path');

class LocalStorageAdapter {
  constructor(config) {
    this.dataDir = config.dataDir || 'data';
    this.prettyPrint = config.prettyPrint !== false;
  }

  async connect() {
    try {
      await fs.access(this.dataDir);
    } catch (error) {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
    return true;
  }

  async disconnect() {
    return true;
  }

  async saveFlightData(flightRecord) {
    const { airport_code, flight_type, flight_date, flight_data } = flightRecord;
    
    const airportDir = path.join(this.dataDir, airport_code.toLowerCase());
    await fs.mkdir(airportDir, { recursive: true });
    
    const filename = `${airport_code.toLowerCase()}_${flight_type}s_${flight_date}.json`;
    const filepath = path.join(airportDir, filename);
    
    const dataToSave = {
      ...flight_data,
      _metadata: {
        id: flightRecord.id,
        collection_date: flightRecord.collection_date,
        created_at: flightRecord.created_at,
        updated_at: flightRecord.updated_at
      }
    };
    
    const jsonContent = this.prettyPrint 
      ? JSON.stringify(dataToSave, null, 2)
      : JSON.stringify(dataToSave);
    
    await fs.writeFile(filepath, jsonContent, 'utf8');
    
    return {
      success: true,
      filepath,
      id: flightRecord.id
    };
  }

  async getFlightData(queryParams) {
    const { airport_code, flight_type, start_date, end_date } = queryParams;
    const results = [];
    
    try {
      const airports = airport_code 
        ? [airport_code.toLowerCase()]
        : await this._getAirportDirs();
      
      for (const airport of airports) {
        const airportDir = path.join(this.dataDir, airport);
        
        try {
          const files = await fs.readdir(airportDir);
          const jsonFiles = files.filter(f => f.endsWith('.json'));
          
          for (const file of jsonFiles) {
            if (!this._matchesQuery(file, airport, flight_type, start_date, end_date)) {
              continue;
            }
            
            const filepath = path.join(airportDir, file);
            const content = await fs.readFile(filepath, 'utf8');
            const data = JSON.parse(content);
            
            const metadata = data._metadata || {};
            delete data._metadata;
            
            results.push({
              id: metadata.id || this._generateIdFromFilename(file),
              airport_code: airport.toUpperCase(),
              flight_type: this._extractFlightType(file),
              flight_date: this._extractDate(file),
              collection_date: metadata.collection_date,
              flight_data: data,
              created_at: metadata.created_at,
              updated_at: metadata.updated_at,
              source_file: filepath
            });
          }
        } catch (error) {
          console.error(`Error reading airport directory ${airport}:`, error);
        }
      }
    } catch (error) {
      console.error('Error getting flight data:', error);
    }
    
    return results.sort((a, b) => 
      new Date(b.flight_date) - new Date(a.flight_date)
    );
  }

  async updateFlightStatus(updateData) {
    const { flight_id, status } = updateData;
    
    const statusDir = path.join(this.dataDir, '_status_updates');
    await fs.mkdir(statusDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `status_${flight_id}_${timestamp}.json`;
    const filepath = path.join(statusDir, filename);
    
    await fs.writeFile(
      filepath, 
      JSON.stringify(updateData, null, 2),
      'utf8'
    );
    
    return {
      success: true,
      filepath,
      flight_id,
      status
    };
  }

  async healthCheck() {
    try {
      await fs.access(this.dataDir);
      const stats = await fs.stat(this.dataDir);
      
      return {
        accessible: true,
        dataDirectory: this.dataDir,
        isDirectory: stats.isDirectory(),
        lastModified: stats.mtime
      };
    } catch (error) {
      return {
        accessible: false,
        dataDirectory: this.dataDir,
        error: error.message
      };
    }
  }

  async _getAirportDirs() {
    const entries = await fs.readdir(this.dataDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('_'))
      .map(entry => entry.name);
  }

  _matchesQuery(filename, airport, flightType, startDate, endDate) {
    const fileAirport = filename.split('_')[0];
    const fileType = this._extractFlightType(filename);
    const fileDate = this._extractDate(filename);
    
    if (fileAirport !== airport) return false;
    
    if (flightType && fileType !== flightType.toLowerCase()) {
      return false;
    }
    
    if (startDate && fileDate < startDate) return false;
    if (endDate && fileDate > endDate) return false;
    
    return true;
  }

  _extractFlightType(filename) {
    if (filename.includes('departure')) return 'departure';
    if (filename.includes('arrival')) return 'arrival';
    if (filename.includes('flights')) return 'all';
    return 'unknown';
  }

  _extractDate(filename) {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  _generateIdFromFilename(filename) {
    const parts = filename.replace('.json', '').split('_');
    return parts.join('_') + '_' + Date.now();
  }
}

module.exports = LocalStorageAdapter;