#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * Monitors system performance and generates alerts
 */

const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const https = require('https');

// Configuration
const CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  checkInterval: parseInt(process.env.CHECK_INTERVAL) || 60000, // 1 minute
  thresholds: {
    cpuUsage: parseFloat(process.env.CPU_THRESHOLD) || 80, // percentage
    memoryUsage: parseFloat(process.env.MEMORY_THRESHOLD) || 85, // percentage
    responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD) || 5000, // ms
    errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD) || 5, // percentage
    diskUsage: parseFloat(process.env.DISK_THRESHOLD) || 90 // percentage
  },
  logFile: process.env.PERF_LOG_FILE || './logs/performance.log',
  alertWebhook: process.env.ALERT_WEBHOOK
};

// Performance metrics
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cpu: [],
      memory: [],
      responseTime: [],
      errors: 0,
      requests: 0,
      alerts: []
    };
    this.startTime = Date.now();
  }

  // Get CPU usage
  async getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return usage;
  }

  // Get memory usage
  getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usage = (usedMem / totalMem) * 100;

    return {
      usage,
      total: totalMem,
      used: usedMem,
      free: freeMem
    };
  }

  // Get disk usage
  async getDiskUsage() {
    try {
      // This is a simplified version - in production, use a proper library
      const { execSync } = require('child_process');
      const output = execSync('df -k /').toString();
      const lines = output.trim().split('\n');
      const data = lines[1].split(/\s+/);
      const usage = parseInt(data[4]);
      
      return {
        usage,
        total: parseInt(data[1]) * 1024,
        used: parseInt(data[2]) * 1024,
        available: parseInt(data[3]) * 1024
      };
    } catch (error) {
      console.error('Error getting disk usage:', error);
      return null;
    }
  }

  // Check API response time
  async checkApiResponseTime() {
    const start = Date.now();
    
    return new Promise((resolve) => {
      const url = new URL(`${CONFIG.apiUrl}/api/v2/health`);
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - start;
          const success = res.statusCode === 200;
          
          if (!success) {
            this.metrics.errors++;
          }
          this.metrics.requests++;
          
          resolve({ responseTime, success, statusCode: res.statusCode });
        });
      });
      
      req.on('error', (error) => {
        this.metrics.errors++;
        this.metrics.requests++;
        resolve({ responseTime: Date.now() - start, success: false, error: error.message });
      });
      
      req.setTimeout(CONFIG.thresholds.responseTime, () => {
        req.destroy();
        this.metrics.errors++;
        this.metrics.requests++;
        resolve({ responseTime: CONFIG.thresholds.responseTime, success: false, error: 'Timeout' });
      });
    });
  }

  // Check process metrics
  getProcessMetrics() {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      rss: usage.rss,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      uptime: process.uptime()
    };
  }

  // Generate alert
  async sendAlert(type, message, data) {
    const alert = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
      hostname: os.hostname()
    };
    
    this.metrics.alerts.push(alert);
    
    // Log alert
    await this.logMetric('ALERT', alert);
    
    // Send webhook if configured
    if (CONFIG.alertWebhook) {
      try {
        const webhookUrl = new URL(CONFIG.alertWebhook);
        const client = webhookUrl.protocol === 'https:' ? https : http;
        
        const postData = JSON.stringify(alert);
        const options = {
          hostname: webhookUrl.hostname,
          port: webhookUrl.port,
          path: webhookUrl.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };
        
        const req = client.request(options);
        req.write(postData);
        req.end();
      } catch (error) {
        console.error('Failed to send alert webhook:', error);
      }
    }
  }

  // Log metrics
  async logMetric(type, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      ...data
    };
    
    try {
      const logDir = path.dirname(CONFIG.logFile);
      await fs.mkdir(logDir, { recursive: true });
      await fs.appendFile(CONFIG.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  // Analyze metrics and check thresholds
  async analyzeMetrics() {
    // CPU check
    const cpuUsage = await this.getCpuUsage();
    this.metrics.cpu.push(cpuUsage);
    if (this.metrics.cpu.length > 60) this.metrics.cpu.shift();
    
    const avgCpu = this.metrics.cpu.reduce((a, b) => a + b, 0) / this.metrics.cpu.length;
    if (avgCpu > CONFIG.thresholds.cpuUsage) {
      await this.sendAlert('HIGH_CPU', `CPU usage is ${avgCpu.toFixed(1)}%`, { 
        current: cpuUsage,
        average: avgCpu,
        threshold: CONFIG.thresholds.cpuUsage 
      });
    }
    
    // Memory check
    const memoryInfo = this.getMemoryUsage();
    this.metrics.memory.push(memoryInfo.usage);
    if (this.metrics.memory.length > 60) this.metrics.memory.shift();
    
    if (memoryInfo.usage > CONFIG.thresholds.memoryUsage) {
      await this.sendAlert('HIGH_MEMORY', `Memory usage is ${memoryInfo.usage.toFixed(1)}%`, {
        ...memoryInfo,
        threshold: CONFIG.thresholds.memoryUsage
      });
    }
    
    // Disk check
    const diskInfo = await this.getDiskUsage();
    if (diskInfo && diskInfo.usage > CONFIG.thresholds.diskUsage) {
      await this.sendAlert('HIGH_DISK', `Disk usage is ${diskInfo.usage}%`, {
        ...diskInfo,
        threshold: CONFIG.thresholds.diskUsage
      });
    }
    
    // API response time check
    const apiCheck = await this.checkApiResponseTime();
    this.metrics.responseTime.push(apiCheck.responseTime);
    if (this.metrics.responseTime.length > 60) this.metrics.responseTime.shift();
    
    if (!apiCheck.success) {
      await this.sendAlert('API_ERROR', 'API health check failed', apiCheck);
    } else if (apiCheck.responseTime > CONFIG.thresholds.responseTime) {
      await this.sendAlert('SLOW_RESPONSE', `API response time is ${apiCheck.responseTime}ms`, {
        ...apiCheck,
        threshold: CONFIG.thresholds.responseTime
      });
    }
    
    // Error rate check
    if (this.metrics.requests > 0) {
      const errorRate = (this.metrics.errors / this.metrics.requests) * 100;
      if (errorRate > CONFIG.thresholds.errorRate) {
        await this.sendAlert('HIGH_ERROR_RATE', `Error rate is ${errorRate.toFixed(1)}%`, {
          errors: this.metrics.errors,
          requests: this.metrics.requests,
          errorRate,
          threshold: CONFIG.thresholds.errorRate
        });
      }
    }
    
    // Log current metrics
    await this.logMetric('METRICS', {
      cpu: cpuUsage,
      memory: memoryInfo,
      disk: diskInfo,
      api: apiCheck,
      process: this.getProcessMetrics(),
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0
    });
  }

  // Generate summary report
  generateSummary() {
    const uptime = Date.now() - this.startTime;
    const avgCpu = this.metrics.cpu.length > 0 
      ? this.metrics.cpu.reduce((a, b) => a + b, 0) / this.metrics.cpu.length 
      : 0;
    const avgMemory = this.metrics.memory.length > 0
      ? this.metrics.memory.reduce((a, b) => a + b, 0) / this.metrics.memory.length
      : 0;
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;
    
    return {
      uptime: Math.floor(uptime / 1000),
      checks: this.metrics.requests,
      errors: this.metrics.errors,
      alerts: this.metrics.alerts.length,
      averages: {
        cpu: avgCpu.toFixed(2),
        memory: avgMemory.toFixed(2),
        responseTime: avgResponseTime.toFixed(0)
      },
      errorRate: this.metrics.requests > 0 
        ? ((this.metrics.errors / this.metrics.requests) * 100).toFixed(2)
        : 0
    };
  }

  // Start monitoring
  async start() {
    console.log('Starting performance monitor...');
    console.log('Configuration:', {
      apiUrl: CONFIG.apiUrl,
      checkInterval: CONFIG.checkInterval,
      thresholds: CONFIG.thresholds
    });
    
    // Initial check
    await this.analyzeMetrics();
    
    // Set up interval
    this.interval = setInterval(async () => {
      await this.analyzeMetrics();
    }, CONFIG.checkInterval);
    
    // Set up graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
    
    // Log summary every hour
    this.summaryInterval = setInterval(() => {
      const summary = this.generateSummary();
      console.log('Performance Summary:', summary);
      this.logMetric('SUMMARY', summary);
    }, 3600000);
  }

  // Stop monitoring
  stop() {
    console.log('\nStopping performance monitor...');
    
    if (this.interval) {
      clearInterval(this.interval);
    }
    
    if (this.summaryInterval) {
      clearInterval(this.summaryInterval);
    }
    
    const summary = this.generateSummary();
    console.log('Final Summary:', summary);
    
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  monitor.start().catch(error => {
    console.error('Failed to start monitor:', error);
    process.exit(1);
  });
}

module.exports = PerformanceMonitor;