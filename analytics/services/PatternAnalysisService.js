/**
 * Pattern Analysis Service
 * Manages pattern detection and analysis operations
 */

const PatternDetector = require('../models/PatternDetector');
const { apiLogger } = require('../../lib/logging');
const { getDatabase } = require('../../lib/database');
const schedule = require('node-schedule');

class PatternAnalysisService {
  constructor() {
    this.logger = apiLogger.child('PatternAnalysisService');
    this.detector = new PatternDetector();
    this.analysisJob = null;
    this.cachedPatterns = null;
    this.lastAnalysisDate = null;
  }

  /**
   * Initialize the pattern analysis service
   */
  async initialize() {
    this.logger.info('Initializing pattern analysis service');
    
    try {
      // Run initial analysis
      await this.runAnalysis();
      
      // Schedule weekly analysis (Sunday at 3 AM)
      this.analysisJob = schedule.scheduleJob('0 3 * * 0', async () => {
        await this.runAnalysis();
      });
      
      this.logger.info('Pattern analysis service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize pattern analysis service', error);
      throw error;
    }
  }

  /**
   * Run pattern analysis
   */
  async runAnalysis(days = 30) {
    this.logger.info(`Running pattern analysis for last ${days} days`);
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const results = await this.detector.analyzePatterns(startDate, endDate);
      
      // Cache results
      this.cachedPatterns = results;
      this.lastAnalysisDate = new Date();
      
      // Store results
      await this.storeAnalysisResults(results);
      
      // Trigger alerts for critical patterns
      await this.checkCriticalPatterns(results);
      
      this.logger.info('Pattern analysis completed', {
        patternsFound: this.countPatterns(results.patterns),
        insightsGenerated: results.insights.length
      });
      
      return results;
    } catch (error) {
      this.logger.error('Pattern analysis failed', error);
      throw error;
    }
  }

  /**
   * Get current patterns
   */
  async getCurrentPatterns(forceRefresh = false) {
    // Return cached patterns if recent
    if (!forceRefresh && this.cachedPatterns && this.lastAnalysisDate) {
      const hoursSinceAnalysis = (new Date() - this.lastAnalysisDate) / (1000 * 60 * 60);
      if (hoursSinceAnalysis < 24) {
        return this.cachedPatterns;
      }
    }
    
    // Run new analysis
    return await this.runAnalysis();
  }

  /**
   * Get patterns by type
   */
  async getPatternsByType(type) {
    const patterns = await this.getCurrentPatterns();
    
    switch (type.toLowerCase()) {
      case 'temporal':
        return patterns.patterns.temporal;
      case 'spatial':
        return patterns.patterns.spatial;
      case 'operational':
        return patterns.patterns.operational;
      case 'anomalies':
        return patterns.patterns.anomalies;
      case 'cascading':
        return patterns.patterns.cascading;
      case 'seasonal':
        return patterns.patterns.seasonal;
      default:
        throw new Error(`Unknown pattern type: ${type}`);
    }
  }

  /**
   * Get insights
   */
  async getInsights() {
    const patterns = await this.getCurrentPatterns();
    return patterns.insights;
  }

  /**
   * Get pattern summary
   */
  async getPatternSummary() {
    const patterns = await this.getCurrentPatterns();
    
    return {
      analysisDate: this.lastAnalysisDate,
      period: patterns.period,
      flightsAnalyzed: patterns.flightsAnalyzed,
      summary: {
        temporal: this.summarizePatterns(patterns.patterns.temporal),
        spatial: this.summarizePatterns(patterns.patterns.spatial),
        operational: this.summarizePatterns(patterns.patterns.operational),
        anomalies: this.summarizeAnomalies(patterns.patterns.anomalies),
        cascading: patterns.patterns.cascading.length,
        seasonal: patterns.patterns.seasonal.length
      },
      topInsights: patterns.insights.slice(0, 5),
      criticalPatterns: this.identifyCriticalPatterns(patterns)
    };
  }

  /**
   * Get real-time pattern alerts
   */
  async getRealTimeAlerts() {
    try {
      const db = await getDatabase();
      
      // Get last hour's data
      const endTime = new Date();
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - 1);
      
      const recentFlights = await db.getFlightData({
        filters: {
          startDate: startTime,
          endDate: endTime
        }
      });
      
      const alerts = [];
      
      // Check for sudden delay spike
      const delayRate = recentFlights.filter(f => f.delayMinutes > 15).length / recentFlights.length;
      if (delayRate > 0.4 && recentFlights.length > 10) {
        alerts.push({
          type: 'DELAY_SPIKE',
          severity: 'HIGH',
          message: `Delay rate spike detected: ${(delayRate * 100).toFixed(1)}% in last hour`,
          timestamp: new Date(),
          metrics: {
            delayRate,
            flightCount: recentFlights.length,
            affectedFlights: recentFlights.filter(f => f.delayMinutes > 15).length
          }
        });
      }
      
      // Check for airport-specific issues
      const airportStats = new Map();
      recentFlights.forEach(flight => {
        ['origin', 'destination'].forEach(field => {
          const airport = flight[field];
          if (!airportStats.has(airport)) {
            airportStats.set(airport, { total: 0, delayed: 0 });
          }
          airportStats.get(airport).total++;
          if (flight.delayMinutes > 15) {
            airportStats.get(airport).delayed++;
          }
        });
      });
      
      for (const [airport, stats] of airportStats) {
        if (stats.total > 5 && stats.delayed / stats.total > 0.5) {
          alerts.push({
            type: 'AIRPORT_DISRUPTION',
            severity: 'MEDIUM',
            message: `High delays at ${airport}: ${stats.delayed}/${stats.total} flights delayed`,
            timestamp: new Date(),
            airport,
            metrics: stats
          });
        }
      }
      
      return alerts;
    } catch (error) {
      this.logger.error('Failed to get real-time alerts', error);
      return [];
    }
  }

  /**
   * Analyze specific date range
   */
  async analyzeCustomRange(startDate, endDate) {
    this.logger.info('Running custom range analysis', { startDate, endDate });
    
    try {
      const results = await this.detector.analyzePatterns(startDate, endDate);
      
      // Don't cache custom range results
      return results;
    } catch (error) {
      this.logger.error('Custom range analysis failed', error);
      throw error;
    }
  }

  /**
   * Get pattern trends over time
   */
  async getPatternTrends(patternType, weeks = 8) {
    const trends = [];
    const endDate = new Date();
    
    for (let i = 0; i < weeks; i++) {
      const weekEnd = new Date(endDate);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      
      try {
        const analysis = await this.detector.analyzePatterns(weekStart, weekEnd);
        const patterns = analysis.patterns[patternType] || [];
        
        trends.push({
          week: i + 1,
          period: { start: weekStart, end: weekEnd },
          patternCount: patterns.length,
          patterns: patterns.map(p => ({
            type: p.type,
            confidence: p.confidence
          }))
        });
      } catch (error) {
        this.logger.error('Failed to analyze week', { week: i + 1, error });
      }
    }
    
    return trends.reverse(); // Oldest to newest
  }

  /**
   * Export patterns report
   */
  async exportPatternsReport(format = 'json') {
    const patterns = await this.getCurrentPatterns();
    
    const report = {
      generatedAt: new Date(),
      analysisDate: this.lastAnalysisDate,
      period: patterns.period,
      summary: await this.getPatternSummary(),
      patterns: patterns.patterns,
      insights: patterns.insights,
      recommendations: this.generateRecommendations(patterns)
    };
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(report, null, 2);
      
      case 'markdown':
        return this.generateMarkdownReport(report);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Helper methods

  countPatterns(patterns) {
    let count = 0;
    for (const category of Object.values(patterns)) {
      if (Array.isArray(category)) {
        count += category.length;
      }
    }
    return count;
  }

  summarizePatterns(patterns) {
    const summary = {
      total: patterns.length,
      byType: {},
      highConfidence: patterns.filter(p => p.confidence > 0.8).length
    };
    
    patterns.forEach(pattern => {
      summary.byType[pattern.type] = (summary.byType[pattern.type] || 0) + 1;
    });
    
    return summary;
  }

  summarizeAnomalies(anomalies) {
    const summary = {
      total: anomalies.length,
      bySeverity: {
        HIGH: anomalies.filter(a => a.severity === 'HIGH').length,
        MEDIUM: anomalies.filter(a => a.severity === 'MEDIUM').length,
        LOW: anomalies.filter(a => a.severity === 'LOW').length
      },
      byType: {}
    };
    
    anomalies.forEach(anomaly => {
      summary.byType[anomaly.type] = (summary.byType[anomaly.type] || 0) + 1;
    });
    
    return summary;
  }

  identifyCriticalPatterns(patterns) {
    const critical = [];
    
    // High-confidence patterns with significant impact
    for (const category of Object.values(patterns.patterns)) {
      if (Array.isArray(category)) {
        critical.push(...category.filter(p => 
          p.confidence > 0.8 && 
          (p.impact === 'HIGH' || p.severity === 'HIGH' || p.delayRate > 0.4)
        ));
      }
    }
    
    return critical.slice(0, 10); // Top 10 critical patterns
  }

  async storeAnalysisResults(results) {
    // In production, store in database
    this.logger.debug('Storing analysis results', {
      patterns: this.countPatterns(results.patterns),
      insights: results.insights.length
    });
  }

  async checkCriticalPatterns(results) {
    const critical = this.identifyCriticalPatterns(results);
    
    if (critical.length > 0) {
      this.logger.warn('Critical patterns detected', {
        count: critical.length,
        types: [...new Set(critical.map(p => p.type))]
      });
      
      // In production, trigger alerts/notifications
      // await this.notificationService.sendCriticalPatternAlert(critical);
    }
  }

  generateRecommendations(patterns) {
    const recommendations = [];
    
    // Based on pattern types, generate specific recommendations
    const allPatterns = [];
    for (const category of Object.values(patterns.patterns)) {
      if (Array.isArray(category)) {
        allPatterns.push(...category);
      }
    }
    
    // Group patterns by impact area
    const impactAreas = {
      scheduling: [],
      operations: [],
      infrastructure: [],
      staffing: []
    };
    
    allPatterns.forEach(pattern => {
      if (pattern.type.includes('TEMPORAL') || pattern.type.includes('PEAK')) {
        impactAreas.scheduling.push(pattern);
      } else if (pattern.type.includes('AIRCRAFT') || pattern.type.includes('TURNAROUND')) {
        impactAreas.operations.push(pattern);
      } else if (pattern.type.includes('GATE') || pattern.type.includes('CONGESTION')) {
        impactAreas.infrastructure.push(pattern);
      } else if (pattern.type.includes('CREW')) {
        impactAreas.staffing.push(pattern);
      }
    });
    
    // Generate recommendations by area
    if (impactAreas.scheduling.length > 0) {
      recommendations.push({
        area: 'SCHEDULING',
        priority: 'HIGH',
        title: 'Optimize Flight Scheduling',
        actions: [
          'Review and adjust peak hour flight distribution',
          'Implement dynamic slot allocation',
          'Consider seasonal schedule adjustments'
        ]
      });
    }
    
    if (impactAreas.operations.length > 0) {
      recommendations.push({
        area: 'OPERATIONS',
        priority: 'MEDIUM',
        title: 'Improve Operational Efficiency',
        actions: [
          'Increase minimum turnaround times',
          'Implement predictive maintenance',
          'Optimize aircraft rotation patterns'
        ]
      });
    }
    
    if (impactAreas.infrastructure.length > 0) {
      recommendations.push({
        area: 'INFRASTRUCTURE',
        priority: 'HIGH',
        title: 'Address Infrastructure Constraints',
        actions: [
          'Expand gate capacity at congested terminals',
          'Implement advanced gate management systems',
          'Review and optimize gate assignments'
        ]
      });
    }
    
    return recommendations;
  }

  generateMarkdownReport(report) {
    let markdown = `# Flight Pattern Analysis Report\n\n`;
    markdown += `Generated: ${report.generatedAt.toISOString()}\n\n`;
    
    markdown += `## Executive Summary\n\n`;
    markdown += `- Analysis Period: ${report.period.start.toDateString()} to ${report.period.end.toDateString()}\n`;
    markdown += `- Total Patterns Detected: ${this.countPatterns(report.patterns)}\n`;
    markdown += `- Critical Insights: ${report.insights.length}\n\n`;
    
    markdown += `## Key Insights\n\n`;
    report.insights.forEach((insight, index) => {
      markdown += `### ${index + 1}. ${insight.title}\n`;
      markdown += `${insight.description}\n\n`;
      markdown += `**Severity:** ${insight.severity}\n\n`;
      markdown += `**Recommendations:**\n`;
      insight.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`;
      });
      markdown += `\n`;
    });
    
    markdown += `## Pattern Details\n\n`;
    
    // Add pattern categories
    const categories = ['temporal', 'spatial', 'operational', 'anomalies'];
    categories.forEach(category => {
      const patterns = report.patterns[category] || [];
      if (patterns.length > 0) {
        markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Patterns\n\n`;
        patterns.slice(0, 5).forEach(pattern => {
          markdown += `- **${pattern.type}**: ${pattern.description || 'N/A'} (Confidence: ${(pattern.confidence * 100).toFixed(0)}%)\n`;
        });
        markdown += `\n`;
      }
    });
    
    markdown += `## Recommendations\n\n`;
    report.recommendations.forEach(rec => {
      markdown += `### ${rec.title} (${rec.priority} Priority)\n`;
      rec.actions.forEach(action => {
        markdown += `- ${action}\n`;
      });
      markdown += `\n`;
    });
    
    return markdown;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.analysisJob) {
      this.analysisJob.cancel();
    }
  }
}

module.exports = PatternAnalysisService;