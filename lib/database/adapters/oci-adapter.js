const oracledb = require('oracledb');

class OCIAdapter {
  constructor(config) {
    this.config = config;
    this.pool = null;
    this.isConnected = false;
    this.environment = config.environment || 'development';
    this.tablePrefix = config.tablePrefix || '';
    
    // Build table names with prefix
    this.flightsTable = this._getTableName('flights');
    this.statusTable = this._getTableName('flight_status_history');
    
    // Configure Oracle client
    if (this.config.walletLocation) {
      oracledb.initOracleClient({
        configDir: this.config.walletLocation
      });
    }
    
    // Set Oracle DB options
    oracledb.autoCommit = true;
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  }

  _getTableName(baseName) {
    const envPrefix = this.environment === 'production' ? 'prod' : 'dev';
    const prefix = this.tablePrefix ? `${this.tablePrefix}_` : '';
    return `${prefix}${envPrefix}_${baseName}`.toUpperCase();
  }

  async connect() {
    try {
      const poolConfig = {
        user: this.config.user,
        password: this.config.password,
        connectionString: this.config.connectionString,
        poolMin: this.config.poolMin || 1,
        poolMax: this.config.poolMax || 4,
        poolIncrement: this.config.poolIncrement || 1,
        poolTimeout: this.config.poolTimeout || 60
      };
      
      if (this.config.walletPassword) {
        poolConfig.walletPassword = this.config.walletPassword;
      }
      
      this.pool = await oracledb.createPool(poolConfig);
      this.isConnected = true;
      
      // Create tables if they don't exist
      await this._initializeSchema();
      
      return true;
    } catch (error) {
      throw new Error(`Failed to connect to OCI database: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.pool) {
      try {
        await this.pool.close(10);
        this.isConnected = false;
      } catch (error) {
        console.error('Error closing connection pool:', error);
      }
    }
    return true;
  }

  async saveFlightData(flightRecord) {
    const connection = await this.pool.getConnection();
    
    try {
      // Check if record exists
      const checkSql = `
        SELECT id FROM ${this.flightsTable} 
        WHERE airport_code = :airport_code 
        AND flight_type = :flight_type 
        AND flight_date = TO_DATE(:flight_date, 'YYYY-MM-DD')
      `;
      
      const checkResult = await connection.execute(checkSql, {
        airport_code: flightRecord.airport_code,
        flight_type: flightRecord.flight_type,
        flight_date: flightRecord.flight_date
      });
      
      let result;
      
      if (checkResult.rows.length > 0) {
        // Update existing record
        const updateSql = `
          UPDATE ${this.flightsTable} 
          SET flight_data = :flight_data,
              updated_at = SYSTIMESTAMP
          WHERE id = :id
        `;
        
        result = await connection.execute(updateSql, {
          flight_data: JSON.stringify(flightRecord.flight_data),
          id: checkResult.rows[0].ID
        });
        
        return {
          success: true,
          id: checkResult.rows[0].ID,
          operation: 'update'
        };
      } else {
        // Insert new record
        const insertSql = `
          INSERT INTO ${this.flightsTable} (
            id, airport_code, flight_type, collection_date, 
            flight_date, flight_data, created_at, updated_at
          ) VALUES (
            :id, :airport_code, :flight_type, SYSTIMESTAMP,
            TO_DATE(:flight_date, 'YYYY-MM-DD'), :flight_data, 
            SYSTIMESTAMP, SYSTIMESTAMP
          )
        `;
        
        result = await connection.execute(insertSql, {
          id: flightRecord.id,
          airport_code: flightRecord.airport_code,
          flight_type: flightRecord.flight_type,
          flight_date: flightRecord.flight_date,
          flight_data: JSON.stringify(flightRecord.flight_data)
        });
        
        return {
          success: true,
          id: flightRecord.id,
          operation: 'insert',
          rowsAffected: result.rowsAffected
        };
      }
    } catch (error) {
      throw new Error(`Failed to save flight data: ${error.message}`);
    } finally {
      await connection.close();
    }
  }

  async getFlightData(queryParams) {
    const connection = await this.pool.getConnection();
    
    try {
      let sql = `
        SELECT id, airport_code, flight_type, 
               TO_CHAR(collection_date, 'YYYY-MM-DD"T"HH24:MI:SS') as collection_date,
               TO_CHAR(flight_date, 'YYYY-MM-DD') as flight_date,
               flight_data,
               TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
               TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
        FROM ${this.flightsTable}
        WHERE 1=1
      `;
      
      const binds = {};
      
      if (queryParams.airport_code) {
        sql += ' AND airport_code = :airport_code';
        binds.airport_code = queryParams.airport_code;
      }
      
      if (queryParams.flight_type) {
        sql += ' AND flight_type = :flight_type';
        binds.flight_type = queryParams.flight_type;
      }
      
      if (queryParams.start_date) {
        sql += ' AND flight_date >= TO_DATE(:start_date, \'YYYY-MM-DD\')';
        binds.start_date = queryParams.start_date;
      }
      
      if (queryParams.end_date) {
        sql += ' AND flight_date <= TO_DATE(:end_date, \'YYYY-MM-DD\')';
        binds.end_date = queryParams.end_date;
      }
      
      sql += ' ORDER BY flight_date DESC, collection_date DESC';
      
      const result = await connection.execute(sql, binds, {
        maxRows: queryParams.limit || 1000
      });
      
      return result.rows.map(row => ({
        id: row.ID,
        airport_code: row.AIRPORT_CODE,
        flight_type: row.FLIGHT_TYPE,
        collection_date: row.COLLECTION_DATE,
        flight_date: row.FLIGHT_DATE,
        flight_data: JSON.parse(row.FLIGHT_DATA),
        created_at: row.CREATED_AT,
        updated_at: row.UPDATED_AT
      }));
    } catch (error) {
      throw new Error(`Failed to retrieve flight data: ${error.message}`);
    } finally {
      await connection.close();
    }
  }

  async updateFlightStatus(updateData) {
    const connection = await this.pool.getConnection();
    
    try {
      // Insert status history
      const insertSql = `
        INSERT INTO ${this.statusTable} (
          flight_id, status, status_time, created_at
        ) VALUES (
          :flight_id, :status, 
          TO_TIMESTAMP(:status_time, 'YYYY-MM-DD"T"HH24:MI:SS'), 
          SYSTIMESTAMP
        )
      `;
      
      await connection.execute(insertSql, {
        flight_id: updateData.flight_id,
        status: updateData.status,
        status_time: updateData.status_time
      });
      
      // Update flight record if exists
      const updateSql = `
        UPDATE ${this.flightsTable} 
        SET updated_at = SYSTIMESTAMP
        WHERE id = :flight_id
      `;
      
      await connection.execute(updateSql, {
        flight_id: updateData.flight_id
      });
      
      return {
        success: true,
        flight_id: updateData.flight_id,
        status: updateData.status
      };
    } catch (error) {
      throw new Error(`Failed to update flight status: ${error.message}`);
    } finally {
      await connection.close();
    }
  }

  async healthCheck() {
    if (!this.pool || !this.isConnected) {
      return {
        accessible: false,
        status: 'disconnected'
      };
    }
    
    let connection;
    try {
      connection = await this.pool.getConnection();
      const result = await connection.execute('SELECT 1 FROM DUAL');
      
      const poolStats = this.pool.getStatistics();
      
      return {
        accessible: true,
        status: 'healthy',
        environment: this.environment,
        tablePrefix: this.tablePrefix,
        tables: {
          flights: this.flightsTable,
          status: this.statusTable
        },
        poolStats: {
          connectionsOpen: poolStats.connectionsOpen,
          connectionsInUse: poolStats.connectionsInUse
        }
      };
    } catch (error) {
      return {
        accessible: false,
        status: 'unhealthy',
        error: error.message
      };
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  async bulkInsert(records) {
    const connection = await this.pool.getConnection();
    
    try {
      const sql = `
        INSERT INTO ${this.flightsTable} (
          id, airport_code, flight_type, collection_date, 
          flight_date, flight_data, created_at, updated_at
        ) VALUES (
          :id, :airport_code, :flight_type, SYSTIMESTAMP,
          TO_DATE(:flight_date, 'YYYY-MM-DD'), :flight_data, 
          SYSTIMESTAMP, SYSTIMESTAMP
        )
      `;
      
      const binds = records.map(record => ({
        id: record.id,
        airport_code: record.airport_code,
        flight_type: record.flight_type,
        flight_date: record.flight_date,
        flight_data: JSON.stringify(record.flight_data)
      }));
      
      const options = {
        autoCommit: true,
        batchErrors: true,
        bindDefs: {
          id: { type: oracledb.STRING, maxSize: 50 },
          airport_code: { type: oracledb.STRING, maxSize: 10 },
          flight_type: { type: oracledb.STRING, maxSize: 10 },
          flight_date: { type: oracledb.STRING, maxSize: 10 },
          flight_data: { type: oracledb.STRING, maxSize: 32768 }
        }
      };
      
      const result = await connection.executeMany(sql, binds, options);
      
      return {
        success: true,
        rowsInserted: result.rowsAffected,
        errors: result.batchErrors
      };
    } catch (error) {
      throw new Error(`Bulk insert failed: ${error.message}`);
    } finally {
      await connection.close();
    }
  }

  async _initializeSchema() {
    const connection = await this.pool.getConnection();
    
    try {
      // Check if flights table exists
      const tableCheck = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM user_tables 
        WHERE table_name = :tableName
      `, { tableName: this.flightsTable });
      
      if (tableCheck.rows[0].COUNT === 0) {
        // Create flights table
        await connection.execute(`
          CREATE TABLE ${this.flightsTable} (
            id VARCHAR2(50) PRIMARY KEY,
            airport_code VARCHAR2(10) NOT NULL,
            flight_type VARCHAR2(10) NOT NULL,
            collection_date TIMESTAMP NOT NULL,
            flight_date DATE NOT NULL,
            flight_data CLOB NOT NULL CHECK (flight_data IS JSON),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Create indexes
        await connection.execute(`
          CREATE INDEX idx_${this.flightsTable}_airport_date ON ${this.flightsTable}(airport_code, flight_date)
        `);
        
        await connection.execute(`
          CREATE INDEX idx_${this.flightsTable}_collection_date ON ${this.flightsTable}(collection_date)
        `);
        
        await connection.execute(`
          CREATE SEARCH INDEX idx_${this.flightsTable}_json ON ${this.flightsTable}(flight_data) FOR JSON
        `);
      }
      
      // Check if status history table exists
      const statusTableCheck = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM user_tables 
        WHERE table_name = :tableName
      `, { tableName: this.statusTable });
      
      if (statusTableCheck.rows[0].COUNT === 0) {
        // Create status history table
        await connection.execute(`
          CREATE TABLE ${this.statusTable} (
            id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            flight_id VARCHAR2(50) NOT NULL,
            status VARCHAR2(50) NOT NULL,
            status_time TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (flight_id) REFERENCES ${this.flightsTable}(id)
          )
        `);
        
        await connection.execute(`
          CREATE INDEX idx_${this.statusTable}_flight ON ${this.statusTable}(flight_id)
        `);
      }
    } catch (error) {
      console.error('Schema initialization error:', error);
      // Tables might already exist, continue
    } finally {
      await connection.close();
    }
  }
}

module.exports = OCIAdapter;