#!/usr/bin/env node

const { getDatabase } = require('../lib/database');
const fs = require('fs').promises;
const path = require('path');

class DatabaseMonitor {
  constructor(options = {}) {
    this.checkInterval = options.checkInterval || 300000; // 5 minutes
    this.thresholds = {
      responseTime: options.responseTimeThreshold || 5000, // 5 seconds
      errorRate: options.errorRateThreshold || 0.1, // 10%
      storageUsage: options.storageUsageThreshold || 0.8, // 80%
      dataAge: options.dataAgeThreshold || 2, // 2 days
      ...options.thresholds
    };
    
    this.metrics = {
      checks: 0,
      errors: 0,
      alerts: [],
      history: []
    };
    
    this.alertHandlers = options.alertHandlers || [];
    this.running = false;
  }

  async start() {
    this.log('Starting database monitor...');
    this.running = true;
    
    // Initial check
    await this.runChecks();
    
    // Schedule periodic checks
    this.interval = setInterval(async () => {
      if (this.running) {
        await this.runChecks();
      }
    }, this.checkInterval);
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  async stop() {
    this.log('Stopping database monitor...');
    this.running = false;
    
    if (this.interval) {
      clearInterval(this.interval);
    }
    
    // Save metrics
    await this.saveMetrics();
    
    process.exit(0);
  }

  async runChecks() {
    const checkStart = Date.now();
    const results = {
      timestamp: new Date().toISOString(),
      checks: {},
      alerts: []
    };
    
    try {
      // 1. Database connectivity
      results.checks.connectivity = await this.checkConnectivity();
      
      // 2. Response time
      results.checks.responseTime = await this.checkResponseTime();
      
      // 3. Storage usage (provider-specific)
      results.checks.storage = await this.checkStorage();
      
      // 4. Data freshness
      results.checks.dataFreshness = await this.checkDataFreshness();
      
      // 5. Error rates
      results.checks.errorRate = await this.checkErrorRate();
      
      // 6. Provider-specific checks
      const provider = process.env.DB_PROVIDER || 'local';
      if (provider === 'cloudflare') {
        results.checks.cloudflare = await this.checkCloudflare();
      } else if (provider === 'oci') {
        results.checks.oci = await this.checkOCI();
      }
      
      // Process results and generate alerts
      this.processResults(results);
      
      // Update metrics
      this.metrics.checks++;
      this.metrics.history.push(results);
      
      // Keep only last 24 hours of history
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      this.metrics.history = this.metrics.history.filter(h => 
        new Date(h.timestamp).getTime() > dayAgo
      );
      
    } catch (error) {
      this.log(`Check failed: ${error.message}`, 'error');
      this.metrics.errors++;
      results.error = error.message;
    }
    
    results.duration = Date.now() - checkStart;
    
    // Log summary
    const alertCount = results.alerts.length;
    const status = alertCount > 0 ? '⚠️  WARNING' : '✅ OK';
    this.log(`Check complete: ${status} (${results.duration}ms, ${alertCount} alerts)`);
    
    return results;
  }

  async checkConnectivity() {
    try {
      const db = await getDatabase();
      const health = await db.healthCheck();
      await db.disconnect();
      
      return {
        status: health.status === 'healthy' ? 'ok' : 'error',
        details: health
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async checkResponseTime() {
    const times = [];
    const iterations = 3;
    
    try {
      const db = await getDatabase();
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await db.getFlightData({
          airport: 'YYZ',
          limit: 10
        });
        times.push(Date.now() - start);
      }
      
      await db.disconnect();
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      
      return {
        status: avgTime < this.thresholds.responseTime ? 'ok' : 'warning',
        averageMs: avgTime,
        samples: times
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async checkStorage() {
    const provider = process.env.DB_PROVIDER || 'local';
    
    if (provider === 'local') {
      // Check disk space for local storage
      const dataDir = path.join(__dirname, '..', 'data');
      try {
        const { execSync } = require('child_process');
        const output = execSync(`df -k "${dataDir}" | tail -1`).toString();
        const parts = output.split(/\s+/);
        const used = parseInt(parts[2]);
        const available = parseInt(parts[3]);
        const total = used + available;
        const usage = used / total;
        
        return {
          status: usage < this.thresholds.storageUsage ? 'ok' : 'warning',
          usage: usage,
          usedMB: (used / 1024).toFixed(2),
          totalMB: (total / 1024).toFixed(2)
        };
      } catch (error) {
        return { status: 'unknown', error: error.message };
      }
    } else {
      // Database storage check
      try {
        const db = await getDatabase();
        const health = await db.healthCheck();
        await db.disconnect();
        
        if (health.adapterStatus && health.adapterStatus.storage) {
          const storage = health.adapterStatus.storage;
          const usage = parseFloat(storage.usage_percentage) / 100;
          
          return {
            status: usage < this.thresholds.storageUsage ? 'ok' : 'warning',
            usage: usage,
            details: storage
          };
        }
      } catch (error) {
        return { status: 'unknown', error: error.message };
      }
    }
    
    return { status: 'unknown' };
  }

  async checkDataFreshness() {
    try {
      const db = await getDatabase();
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      const recentData = await db.getFlightData({
        startDate,
        endDate,
        filters: { limit: 100 }
      });
      
      await db.disconnect();
      
      if (recentData.length === 0) {
        return {
          status: 'warning',
          message: 'No recent data found'
        };
      }
      
      // Check latest data age
      const latest = recentData
        .sort((a, b) => new Date(b.collection_date) - new Date(a.collection_date))[0];
      
      const ageHours = (Date.now() - new Date(latest.collection_date)) / (1000 * 60 * 60);
      const ageDays = ageHours / 24;
      
      return {
        status: ageDays < this.thresholds.dataAge ? 'ok' : 'warning',
        latestData: latest.collection_date,
        ageHours: ageHours.toFixed(1),
        ageDays: ageDays.toFixed(1)
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async checkErrorRate() {
    // Calculate error rate from recent history
    const recentChecks = this.metrics.history.slice(-20);
    const errors = recentChecks.filter(c => c.error || 
      Object.values(c.checks).some(check => check.status === 'error')
    ).length;
    
    const errorRate = recentChecks.length > 0 ? errors / recentChecks.length : 0;
    
    return {
      status: errorRate < this.thresholds.errorRate ? 'ok' : 'warning',
      errorRate: errorRate,
      errors: errors,
      total: recentChecks.length
    };
  }

  async checkCloudflare() {
    // Cloudflare-specific checks
    const checks = {};
    
    // Check D1 API availability
    if (process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID && process.env.CF_DATABASE_ID) {
      try {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/d1/database/${process.env.CF_DATABASE_ID}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.CF_API_TOKEN}`
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          checks.api = {
            status: 'ok',
            database: data.result
          };
        } else {
          checks.api = {
            status: 'error',
            statusCode: response.status
          };
        }
      } catch (error) {
        checks.api = {
          status: 'error',
          error: error.message
        };
      }
    }
    
    return checks;
  }

  async checkOCI() {
    // OCI-specific checks
    const checks = {};
    
    try {
      const db = await getDatabase();
      
      // Check connection pool stats
      if (db.adapter && db.adapter.pool) {
        const poolStats = db.adapter.pool.getStatistics();
        checks.connectionPool = {
          status: 'ok',
          stats: poolStats
        };
      }
      
      await db.disconnect();
    } catch (error) {
      checks.connectionPool = {
        status: 'error',
        error: error.message
      };
    }
    
    return checks;
  }

  processResults(results) {
    // Generate alerts based on check results
    for (const [checkName, checkResult] of Object.entries(results.checks)) {
      if (checkResult.status === 'error' || checkResult.status === 'warning') {
        const alert = {
          timestamp: results.timestamp,
          check: checkName,
          status: checkResult.status,
          details: checkResult
        };
        
        results.alerts.push(alert);
        this.metrics.alerts.push(alert);
        
        // Trigger alert handlers
        this.handleAlert(alert);
      }
    }
  }

  async handleAlert(alert) {
    this.log(`ALERT: ${alert.check} - ${alert.status}`, 'warn');
    
    // Execute configured alert handlers
    for (const handler of this.alertHandlers) {
      try {
        await handler(alert);
      } catch (error) {
        this.log(`Alert handler failed: ${error.message}`, 'error');
      }
    }
  }

  async saveMetrics() {
    const metricsPath = path.join(__dirname, '..', 'monitoring-metrics.json');
    try {
      await fs.writeFile(metricsPath, JSON.stringify(this.metrics, null, 2));
      this.log('Metrics saved');
    } catch (error) {
      this.log(`Failed to save metrics: ${error.message}`, 'error');
    }
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

  // Express endpoint for metrics
  getExpressRouter() {
    const express = require('express');
    const router = express.Router();
    
    router.get('/metrics', (req, res) => {
      res.json({
        uptime: process.uptime(),
        metrics: this.metrics,
        lastCheck: this.metrics.history[this.metrics.history.length - 1] || null
      });
    });
    
    router.get('/alerts', (req, res) => {
      const hours = parseInt(req.query.hours || '24');
      const since = Date.now() - hours * 60 * 60 * 1000;
      
      const recentAlerts = this.metrics.alerts.filter(a => 
        new Date(a.timestamp).getTime() > since
      );
      
      res.json({
        alerts: recentAlerts,
        count: recentAlerts.length,
        since: new Date(since).toISOString()
      });
    });
    
    return router;
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node monitor.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --check-once      Run checks once and exit');
    console.log('  --interval MS     Check interval in milliseconds (default: 300000)');
    console.log('  --webhook URL     Send alerts to webhook URL');
    console.log('  --help, -h        Show this help message');
    console.log('');
    console.log('Environment variables:');
    console.log('  MONITOR_WEBHOOK   Webhook URL for alerts');
    console.log('  MONITOR_INTERVAL  Check interval in milliseconds');
    process.exit(0);
  }
  
  const options = {};
  
  // Parse interval
  const intervalIndex = args.indexOf('--interval');
  if (intervalIndex !== -1 && args[intervalIndex + 1]) {
    options.checkInterval = parseInt(args[intervalIndex + 1]);
  } else if (process.env.MONITOR_INTERVAL) {
    options.checkInterval = parseInt(process.env.MONITOR_INTERVAL);
  }
  
  // Setup alert handlers
  options.alertHandlers = [];
  
  // Webhook handler
  const webhookUrl = process.env.MONITOR_WEBHOOK || 
    (args.includes('--webhook') ? args[args.indexOf('--webhook') + 1] : null);
  
  if (webhookUrl) {
    options.alertHandlers.push(async (alert) => {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        });
      } catch (error) {
        console.error('Webhook failed:', error);
      }
    });
  }
  
  const monitor = new DatabaseMonitor(options);
  
  if (args.includes('--check-once')) {
    monitor.runChecks().then(results => {
      console.log(JSON.stringify(results, null, 2));
      process.exit(results.alerts.length > 0 ? 1 : 0);
    });
  } else {
    monitor.start();
  }
}

module.exports = DatabaseMonitor;