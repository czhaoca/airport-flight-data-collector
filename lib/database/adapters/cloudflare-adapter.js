const fetch = require('node-fetch');

class CloudflareAdapter {
  constructor(config) {
    this.accountId = config.accountId;
    this.databaseId = config.databaseId;
    this.apiToken = config.apiToken;
    this.workerUrl = config.workerUrl;
    this.environment = config.environment || 'development';
    this.tablePrefix = config.tablePrefix || '';
    this.isConnected = false;
    
    // Build table names with prefix
    this.flightsTable = this._getTableName('flights');
    this.statusTable = this._getTableName('flight_status_history');
    
    // Build base API URL
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;
  }

  _getTableName(baseName) {
    const envPrefix = this.environment === 'production' ? 'prod' : 'dev';
    const prefix = this.tablePrefix ? `${this.tablePrefix}_` : '';
    return `${prefix}${envPrefix}_${baseName}`;
  }

  async connect() {
    try {
      // Initialize schema
      await this._initializeSchema();
      this.isConnected = true;
      return true;
    } catch (error) {
      throw new Error(`Failed to connect to Cloudflare D1: ${error.message}`);
    }
  }

  async disconnect() {
    this.isConnected = false;
    return true;
  }

  async saveFlightData(flightRecord) {
    try {
      // Check if record exists
      const checkSql = `
        SELECT id FROM ${this.flightsTable}
        WHERE airport_code = ? 
        AND flight_type = ? 
        AND flight_date = ?
      `;
      
      const checkResult = await this.executeSql(checkSql, [
        flightRecord.airport_code,
        flightRecord.flight_type,
        flightRecord.flight_date
      ]);
      
      if (checkResult.result && checkResult.result.length > 0) {
        // Update existing record
        const updateSql = `
          UPDATE ${this.flightsTable}
          SET flight_data = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `;
        
        await this.executeSql(updateSql, [
          JSON.stringify(flightRecord.flight_data),
          checkResult.result[0].id
        ]);
        
        return {
          success: true,
          id: checkResult.result[0].id,
          operation: 'update'
        };
      } else {
        // Insert new record
        const insertSql = `
          INSERT INTO ${this.flightsTable} (
            id, airport_code, flight_type, collection_date, 
            flight_date, flight_data, created_at, updated_at
          ) VALUES (
            ?, ?, ?, datetime('now'),
            ?, ?, datetime('now'), datetime('now')
          )
        `;
        
        await this.executeSql(insertSql, [
          flightRecord.id,
          flightRecord.airport_code,
          flightRecord.flight_type,
          flightRecord.flight_date,
          JSON.stringify(flightRecord.flight_data)
        ]);
        
        return {
          success: true,
          id: flightRecord.id,
          operation: 'insert'
        };
      }
    } catch (error) {
      throw new Error(`Failed to save flight data: ${error.message}`);
    }
  }

  async getFlightData(queryParams) {
    try {
      let sql = `
        SELECT id, airport_code, flight_type, 
               collection_date, flight_date, flight_data,
               created_at, updated_at
        FROM ${this.flightsTable}
        WHERE 1=1
      `;
      
      const params = [];
      
      if (queryParams.airport_code) {
        sql += ' AND airport_code = ?';
        params.push(queryParams.airport_code);
      }
      
      if (queryParams.flight_type) {
        sql += ' AND flight_type = ?';
        params.push(queryParams.flight_type);
      }
      
      if (queryParams.start_date) {
        sql += ' AND flight_date >= ?';
        params.push(queryParams.start_date);
      }
      
      if (queryParams.end_date) {
        sql += ' AND flight_date <= ?';
        params.push(queryParams.end_date);
      }
      
      sql += ' ORDER BY flight_date DESC, collection_date DESC';
      
      if (queryParams.limit) {
        sql += ' LIMIT ?';
        params.push(queryParams.limit);
      }
      
      const result = await this.executeSql(sql, params);
      
      if (!result.result) {
        return [];
      }
      
      return result.result.map(row => ({
        id: row.id,
        airport_code: row.airport_code,
        flight_type: row.flight_type,
        collection_date: row.collection_date,
        flight_date: row.flight_date,
        flight_data: JSON.parse(row.flight_data),
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      throw new Error(`Failed to retrieve flight data: ${error.message}`);
    }
  }

  async updateFlightStatus(updateData) {
    try {
      // Insert status history
      const insertSql = `
        INSERT INTO ${this.statusTable} (
          flight_id, status, status_time, created_at
        ) VALUES (
          ?, ?, ?, datetime('now')
        )
      `;
      
      await this.executeSql(insertSql, [
        updateData.flight_id,
        updateData.status,
        updateData.status_time
      ]);
      
      // Update flight record
      const updateSql = `
        UPDATE ${this.flightsTable}
        SET updated_at = datetime('now')
        WHERE id = ?
      `;
      
      await this.executeSql(updateSql, [updateData.flight_id]);
      
      return {
        success: true,
        flight_id: updateData.flight_id,
        status: updateData.status
      };
    } catch (error) {
      throw new Error(`Failed to update flight status: ${error.message}`);
    }
  }

  async healthCheck() {
    if (!this.isConnected) {
      return {
        accessible: false,
        status: 'disconnected'
      };
    }
    
    try {
      const result = await this.executeSql('SELECT 1 as health_check');
      
      return {
        accessible: true,
        status: 'healthy',
        environment: this.environment,
        tablePrefix: this.tablePrefix,
        tables: {
          flights: this.flightsTable,
          status: this.statusTable
        }
      };
    } catch (error) {
      return {
        accessible: false,
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async bulkInsert(records) {
    try {
      // D1 doesn't support true bulk inserts, so we'll batch them
      const batchSize = 100;
      const results = {
        success: true,
        rowsInserted: 0,
        errors: []
      };
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        // Build multi-insert SQL
        const placeholders = batch.map(() => '(?, ?, ?, datetime("now"), ?, ?, datetime("now"), datetime("now"))').join(', ');
        const sql = `
          INSERT INTO ${this.flightsTable} (
            id, airport_code, flight_type, collection_date, 
            flight_date, flight_data, created_at, updated_at
          ) VALUES ${placeholders}
        `;
        
        const params = [];
        batch.forEach(record => {
          params.push(
            record.id,
            record.airport_code,
            record.flight_type,
            record.flight_date,
            JSON.stringify(record.flight_data)
          );
        });
        
        try {
          await this.executeSql(sql, params);
          results.rowsInserted += batch.length;
        } catch (error) {
          results.errors.push({
            batch: `${i}-${i + batch.length}`,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Bulk insert failed: ${error.message}`);
    }
  }

  async executeSql(sql, params = []) {
    if (this.workerUrl) {
      // Use Worker URL if available
      return this._executeViaWorker(sql, params);
    } else {
      // Use REST API directly
      return this._executeViaRest(sql, params);
    }
  }

  async _executeViaRest(sql, params = []) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql, params })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${error}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Query failed: ${JSON.stringify(data.errors)}`);
    }
    
    return data;
  }

  async _executeViaWorker(sql, params = []) {
    const response = await fetch(`${this.workerUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`
      },
      body: JSON.stringify({ sql, params })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Worker error: ${error}`);
    }
    
    return response.json();
  }

  async _initializeSchema() {
    try {
      // Create flights table
      const createFlightsTable = `
        CREATE TABLE IF NOT EXISTS ${this.flightsTable} (
          id TEXT PRIMARY KEY,
          airport_code TEXT NOT NULL,
          flight_type TEXT NOT NULL,
          collection_date TEXT NOT NULL,
          flight_date TEXT NOT NULL,
          flight_data TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await this.executeSql(createFlightsTable);
      
      // Create indexes
      const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_${this.flightsTable}_airport_date ON ${this.flightsTable}(airport_code, flight_date)`,
        `CREATE INDEX IF NOT EXISTS idx_${this.flightsTable}_collection_date ON ${this.flightsTable}(collection_date)`,
        `CREATE INDEX IF NOT EXISTS idx_${this.flightsTable}_flight_type ON ${this.flightsTable}(flight_type)`
      ];
      
      for (const index of indexes) {
        await this.executeSql(index);
      }
      
      // Create status history table
      const createStatusTable = `
        CREATE TABLE IF NOT EXISTS ${this.statusTable} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          flight_id TEXT NOT NULL,
          status TEXT NOT NULL,
          status_time TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (flight_id) REFERENCES ${this.flightsTable}(id)
        )
      `;
      
      await this.executeSql(createStatusTable);
      
      // Create index for status table
      await this.executeSql(
        `CREATE INDEX IF NOT EXISTS idx_${this.statusTable}_flight ON ${this.statusTable}(flight_id)`
      );
      
    } catch (error) {
      console.error('Schema initialization error:', error);
      throw error;
    }
  }
}

module.exports = CloudflareAdapter;