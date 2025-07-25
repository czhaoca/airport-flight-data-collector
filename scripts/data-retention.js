#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { getDatabase } = require('../lib/database');

// Configuration
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || '365'); // Keep 1 year by default
const ARCHIVE_DAYS = parseInt(process.env.ARCHIVE_DAYS || '90'); // Archive after 90 days
const ARCHIVE_PATH = process.env.ARCHIVE_PATH || path.join(__dirname, '..', 'archives');

class DataRetentionManager {
  constructor(options = {}) {
    this.retentionDays = options.retentionDays || RETENTION_DAYS;
    this.archiveDays = options.archiveDays || ARCHIVE_DAYS;
    this.archivePath = options.archivePath || ARCHIVE_PATH;
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ️ ',
      warn: '⚠️ ',
      error: '❌',
      success: '✅'
    }[level] || '';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async execute() {
    this.log('Starting data retention process...');
    
    try {
      const db = await getDatabase();
      
      // Get database statistics
      const stats = await this.getDatabaseStats(db);
      this.log(`Current database stats: ${JSON.stringify(stats)}`);
      
      // Execute retention strategy based on provider
      const provider = process.env.DB_PROVIDER || 'local';
      
      switch (provider) {
        case 'local':
          await this.handleLocalRetention();
          break;
        case 'cloudflare':
          await this.handleCloudflareRetention(db);
          break;
        case 'oci':
          await this.handleOCIRetention(db);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
      
      // Cleanup old archives
      await this.cleanupArchives();
      
      await db.disconnect();
      this.log('Data retention process completed successfully', 'success');
      
    } catch (error) {
      this.log(`Data retention failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async getDatabaseStats(db) {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const data = await db.getFlightData({
      startDate,
      endDate,
      filters: { limit: 10000 }
    });
    
    const stats = {
      totalRecords: data.length,
      oldestRecord: null,
      newestRecord: null,
      byMonth: {},
      estimatedSize: 0
    };
    
    if (data.length > 0) {
      // Sort by date
      data.sort((a, b) => new Date(a.flight_date) - new Date(b.flight_date));
      stats.oldestRecord = data[0].flight_date;
      stats.newestRecord = data[data.length - 1].flight_date;
      
      // Group by month
      data.forEach(record => {
        const month = record.flight_date.substring(0, 7);
        if (!stats.byMonth[month]) {
          stats.byMonth[month] = 0;
        }
        stats.byMonth[month]++;
        
        // Estimate size
        stats.estimatedSize += JSON.stringify(record).length;
      });
    }
    
    stats.estimatedSizeMB = (stats.estimatedSize / 1024 / 1024).toFixed(2);
    
    return stats;
  }

  async handleLocalRetention() {
    this.log('Handling local file retention...');
    
    const dataDir = path.join(__dirname, '..', 'data');
    const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    const archiveDate = new Date(Date.now() - this.archiveDays * 24 * 60 * 60 * 1000);
    
    let archived = 0;
    let deleted = 0;
    
    // Process each airport directory
    const airports = await fs.readdir(dataDir, { withFileTypes: true });
    
    for (const airport of airports) {
      if (!airport.isDirectory() || airport.name.startsWith('_')) continue;
      
      const airportDir = path.join(dataDir, airport.name);
      const files = await fs.readdir(airportDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        // Extract date from filename
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
        if (!dateMatch) continue;
        
        const fileDate = new Date(dateMatch[1]);
        const filePath = path.join(airportDir, file);
        
        if (fileDate < cutoffDate) {
          // Delete old files
          if (!this.dryRun) {
            await fs.unlink(filePath);
          }
          deleted++;
          if (this.verbose) {
            this.log(`Deleted: ${file}`);
          }
        } else if (fileDate < archiveDate) {
          // Archive files
          await this.archiveFile(filePath, airport.name, file);
          archived++;
        }
      }
    }
    
    this.log(`Archived ${archived} files, deleted ${deleted} files`);
  }

  async handleCloudflareRetention(db) {
    this.log('Handling Cloudflare D1 retention...');
    
    const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const archiveDate = new Date(Date.now() - this.archiveDays * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    
    // Check storage usage first
    const health = await db.healthCheck();
    if (health.adapterStatus && health.adapterStatus.storage) {
      const usagePercent = parseFloat(health.adapterStatus.storage.usage_percentage);
      if (usagePercent > 80) {
        this.log(`Storage usage critical: ${usagePercent}%`, 'warn');
        // Be more aggressive with retention
        const newRetentionDays = Math.floor(this.retentionDays * 0.7);
        this.log(`Reducing retention to ${newRetentionDays} days`);
      }
    }
    
    // Archive old data
    const archiveData = await db.getFlightData({
      startDate: '2000-01-01',
      endDate: archiveDate,
      filters: { limit: 10000 }
    });
    
    if (archiveData.length > 0) {
      await this.archiveRecords(archiveData);
      this.log(`Archived ${archiveData.length} records`);
    }
    
    // Delete very old data
    if (!this.dryRun && db.adapter.executeSql) {
      const tableName = db.adapter.flightsTable || 'flights';
      const sql = `DELETE FROM ${tableName} WHERE flight_date < ?`;
      
      try {
        const result = await db.adapter.executeSql(sql, [cutoffDate]);
        this.log(`Deleted records older than ${cutoffDate}`);
      } catch (error) {
        this.log(`Failed to delete old records: ${error.message}`, 'error');
      }
    }
  }

  async handleOCIRetention(db) {
    this.log('Handling Oracle Cloud retention...');
    
    const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const archiveDate = new Date(Date.now() - this.archiveDays * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    
    // Oracle has plenty of space, so we can be less aggressive
    // Archive data older than archiveDays
    const archiveData = await db.getFlightData({
      startDate: '2000-01-01',
      endDate: archiveDate,
      filters: { limit: 50000 } // Can handle more data
    });
    
    if (archiveData.length > 0) {
      await this.archiveRecords(archiveData);
      this.log(`Archived ${archiveData.length} records`);
    }
    
    // Optionally partition the table by date for better performance
    if (!this.dryRun && db.adapter.executeSql) {
      // Create partitioned archive table if not exists
      try {
        await db.adapter.executeSql(`
          CREATE TABLE IF NOT EXISTS ${db.adapter.flightsTable}_archive
          PARTITION BY RANGE (flight_date) (
            PARTITION p_old VALUES LESS THAN (TO_DATE('${archiveDate}', 'YYYY-MM-DD'))
          ) AS SELECT * FROM ${db.adapter.flightsTable} WHERE 1=0
        `);
        
        // Move old data to archive table
        await db.adapter.executeSql(`
          INSERT INTO ${db.adapter.flightsTable}_archive
          SELECT * FROM ${db.adapter.flightsTable}
          WHERE flight_date < TO_DATE('${archiveDate}', 'YYYY-MM-DD')
        `);
        
        // Delete from main table
        await db.adapter.executeSql(`
          DELETE FROM ${db.adapter.flightsTable}
          WHERE flight_date < TO_DATE('${cutoffDate}', 'YYYY-MM-DD')
        `);
        
      } catch (error) {
        this.log(`Partitioning failed: ${error.message}`, 'warn');
      }
    }
  }

  async archiveFile(filePath, airport, filename) {
    const yearMonth = filename.match(/(\d{4}-\d{2})/)[1];
    const archiveDir = path.join(this.archivePath, airport, yearMonth);
    
    if (!this.dryRun) {
      await fs.mkdir(archiveDir, { recursive: true });
      
      // Compress and move
      const content = await fs.readFile(filePath, 'utf8');
      const compressed = await this.compressJSON(content);
      
      const archivePath = path.join(archiveDir, filename + '.gz');
      await fs.writeFile(archivePath, compressed);
      await fs.unlink(filePath);
    }
    
    if (this.verbose) {
      this.log(`Archived: ${filename} to ${yearMonth}/`);
    }
  }

  async archiveRecords(records) {
    // Group by airport and month
    const grouped = {};
    
    records.forEach(record => {
      const key = `${record.airport_code}/${record.flight_date.substring(0, 7)}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(record);
    });
    
    // Save each group as compressed file
    for (const [key, data] of Object.entries(grouped)) {
      const [airport, yearMonth] = key.split('/');
      const archiveDir = path.join(this.archivePath, 'database', airport);
      
      if (!this.dryRun) {
        await fs.mkdir(archiveDir, { recursive: true });
        
        const filename = `${airport}_${yearMonth}_archive.json.gz`;
        const archivePath = path.join(archiveDir, filename);
        
        const compressed = await this.compressJSON(JSON.stringify(data, null, 2));
        await fs.writeFile(archivePath, compressed);
      }
      
      this.log(`Archived ${data.length} records for ${airport} ${yearMonth}`);
    }
  }

  async compressJSON(content) {
    const zlib = require('zlib');
    return new Promise((resolve, reject) => {
      zlib.gzip(content, (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }

  async cleanupArchives() {
    // Remove archives older than 2 years
    const maxArchiveAge = 730; // days
    const cutoffDate = new Date(Date.now() - maxArchiveAge * 24 * 60 * 60 * 1000);
    
    if (!await fs.access(this.archivePath).then(() => true).catch(() => false)) {
      return;
    }
    
    let cleaned = 0;
    
    const processDir = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await processDir(fullPath);
        } else if (entry.name.endsWith('.gz')) {
          const stat = await fs.stat(fullPath);
          if (stat.mtime < cutoffDate) {
            if (!this.dryRun) {
              await fs.unlink(fullPath);
            }
            cleaned++;
          }
        }
      }
    };
    
    await processDir(this.archivePath);
    
    if (cleaned > 0) {
      this.log(`Cleaned up ${cleaned} old archive files`);
    }
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node data-retention.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --retention-days DAYS  Days to keep data (default: 365)');
    console.log('  --archive-days DAYS    Days before archiving (default: 90)');
    console.log('  --archive-path PATH    Archive directory path');
    console.log('  --dry-run             Show what would be done without doing it');
    console.log('  --verbose             Show detailed output');
    console.log('  --help, -h            Show this help message');
    console.log('');
    console.log('Environment variables:');
    console.log('  RETENTION_DAYS        Override default retention period');
    console.log('  ARCHIVE_DAYS          Override default archive period');
    console.log('  ARCHIVE_PATH          Override default archive path');
    process.exit(0);
  }
  
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose')
  };
  
  // Parse retention days
  const retentionIndex = args.indexOf('--retention-days');
  if (retentionIndex !== -1 && args[retentionIndex + 1]) {
    options.retentionDays = parseInt(args[retentionIndex + 1]);
  }
  
  // Parse archive days
  const archiveIndex = args.indexOf('--archive-days');
  if (archiveIndex !== -1 && args[archiveIndex + 1]) {
    options.archiveDays = parseInt(args[archiveIndex + 1]);
  }
  
  // Parse archive path
  const pathIndex = args.indexOf('--archive-path');
  if (pathIndex !== -1 && args[pathIndex + 1]) {
    options.archivePath = args[pathIndex + 1];
  }
  
  const manager = new DataRetentionManager(options);
  manager.execute().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = DataRetentionManager;