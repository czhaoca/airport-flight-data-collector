/**
 * Pattern Detection Algorithm
 * Identifies recurring patterns and anomalies in flight data
 */

const { apiLogger } = require('../../lib/logging');
const { getDatabase } = require('../../lib/database');

class PatternDetector {
  constructor() {
    this.logger = apiLogger.child('PatternDetector');
    this.patterns = {
      temporal: [],
      spatial: [],
      operational: [],
      anomalies: []
    };
  }

  /**
   * Analyze patterns in flight data
   */
  async analyzePatterns(startDate, endDate, options = {}) {
    this.logger.info('Starting pattern analysis', { startDate, endDate, options });
    
    try {
      const db = await getDatabase();
      
      // Fetch flight data
      const flights = await db.getFlightData({
        filters: {
          startDate,
          endDate
        }
      });
      
      this.logger.info(`Analyzing patterns in ${flights.length} flights`);
      
      // Run different pattern detection algorithms
      const results = {
        temporal: await this.detectTemporalPatterns(flights),
        spatial: await this.detectSpatialPatterns(flights),
        operational: await this.detectOperationalPatterns(flights),
        anomalies: await this.detectAnomalies(flights),
        cascading: await this.detectCascadingDelays(flights),
        seasonal: await this.detectSeasonalPatterns(flights)
      };
      
      // Generate insights
      const insights = this.generateInsights(results);
      
      return {
        period: { startDate, endDate },
        flightsAnalyzed: flights.length,
        patterns: results,
        insights,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Pattern analysis failed', error);
      throw error;
    }
  }

  /**
   * Detect temporal patterns (time-based)
   */
  async detectTemporalPatterns(flights) {
    const patterns = [];
    
    // 1. Hourly delay patterns
    const hourlyDelays = this.analyzeHourlyDelays(flights);
    if (hourlyDelays.pattern) {
      patterns.push({
        type: 'HOURLY_DELAY_PATTERN',
        description: hourlyDelays.description,
        confidence: hourlyDelays.confidence,
        details: hourlyDelays
      });
    }
    
    // 2. Day of week patterns
    const weekdayPatterns = this.analyzeWeekdayPatterns(flights);
    if (weekdayPatterns.pattern) {
      patterns.push({
        type: 'WEEKDAY_PATTERN',
        description: weekdayPatterns.description,
        confidence: weekdayPatterns.confidence,
        details: weekdayPatterns
      });
    }
    
    // 3. Time series patterns (trends)
    const trends = this.detectTimeTrends(flights);
    patterns.push(...trends);
    
    // 4. Recurring delay windows
    const delayWindows = this.findRecurringDelayWindows(flights);
    patterns.push(...delayWindows);
    
    return patterns;
  }

  /**
   * Detect spatial patterns (location-based)
   */
  async detectSpatialPatterns(flights) {
    const patterns = [];
    
    // 1. Route-specific patterns
    const routePatterns = this.analyzeRoutePatterns(flights);
    patterns.push(...routePatterns);
    
    // 2. Airport congestion patterns
    const congestionPatterns = this.detectAirportCongestion(flights);
    patterns.push(...congestionPatterns);
    
    // 3. Geographic delay clusters
    const geoClusters = this.findGeographicClusters(flights);
    patterns.push(...geoClusters);
    
    return patterns;
  }

  /**
   * Detect operational patterns
   */
  async detectOperationalPatterns(flights) {
    const patterns = [];
    
    // 1. Aircraft utilization patterns
    const aircraftPatterns = this.analyzeAircraftUtilization(flights);
    patterns.push(...aircraftPatterns);
    
    // 2. Crew scheduling patterns
    const crewPatterns = this.detectCrewPatterns(flights);
    patterns.push(...crewPatterns);
    
    // 3. Gate usage patterns
    const gatePatterns = this.analyzeGateUsage(flights);
    patterns.push(...gatePatterns);
    
    // 4. Turnaround time patterns
    const turnaroundPatterns = this.analyzeTurnaroundTimes(flights);
    patterns.push(...turnaroundPatterns);
    
    return patterns;
  }

  /**
   * Detect anomalies
   */
  async detectAnomalies(flights) {
    const anomalies = [];
    
    // 1. Statistical anomalies (outliers)
    const outliers = this.findStatisticalOutliers(flights);
    anomalies.push(...outliers);
    
    // 2. Unusual delay patterns
    const unusualDelays = this.findUnusualDelays(flights);
    anomalies.push(...unusualDelays);
    
    // 3. Route anomalies
    const routeAnomalies = this.findRouteAnomalies(flights);
    anomalies.push(...routeAnomalies);
    
    // 4. Sudden performance changes
    const performanceChanges = this.detectPerformanceChanges(flights);
    anomalies.push(...performanceChanges);
    
    return anomalies;
  }

  /**
   * Detect cascading delays
   */
  async detectCascadingDelays(flights) {
    const cascades = [];
    
    // Group flights by aircraft
    const aircraftFlights = this.groupByAircraft(flights);
    
    for (const [aircraft, aircraftFlightList] of aircraftFlights) {
      // Sort by scheduled time
      aircraftFlightList.sort((a, b) => 
        new Date(a.scheduledTime) - new Date(b.scheduledTime)
      );
      
      // Look for delay propagation
      for (let i = 1; i < aircraftFlightList.length; i++) {
        const prevFlight = aircraftFlightList[i - 1];
        const currentFlight = aircraftFlightList[i];
        
        if (prevFlight.delayMinutes > 15 && currentFlight.delayMinutes > 15) {
          // Check if delays are related
          const timeDiff = new Date(currentFlight.scheduledTime) - new Date(prevFlight.actualTime);
          const turnaroundMinutes = timeDiff / (1000 * 60);
          
          if (turnaroundMinutes < 90) { // Less than 90 minutes turnaround
            cascades.push({
              type: 'CASCADE_DELAY',
              aircraft,
              initialFlight: {
                flightNumber: prevFlight.flightNumber,
                delay: prevFlight.delayMinutes
              },
              affectedFlights: [{
                flightNumber: currentFlight.flightNumber,
                delay: currentFlight.delayMinutes,
                turnaroundTime: turnaroundMinutes
              }],
              confidence: 0.85,
              impact: 'HIGH'
            });
          }
        }
      }
    }
    
    return cascades;
  }

  /**
   * Detect seasonal patterns
   */
  async detectSeasonalPatterns(flights) {
    const patterns = [];
    
    // Group by month
    const monthlyData = this.groupByMonth(flights);
    
    // Analyze monthly trends
    const monthlyDelayRates = new Map();
    const monthlyVolumes = new Map();
    
    for (const [month, monthFlights] of monthlyData) {
      const delayedCount = monthFlights.filter(f => f.delayMinutes > 15).length;
      const delayRate = delayedCount / monthFlights.length;
      
      monthlyDelayRates.set(month, delayRate);
      monthlyVolumes.set(month, monthFlights.length);
    }
    
    // Identify seasonal peaks
    const avgDelayRate = Array.from(monthlyDelayRates.values())
      .reduce((a, b) => a + b, 0) / monthlyDelayRates.size;
    
    for (const [month, rate] of monthlyDelayRates) {
      if (rate > avgDelayRate * 1.2) {
        patterns.push({
          type: 'SEASONAL_HIGH_DELAY',
          month,
          delayRate: rate,
          volumeImpact: monthlyVolumes.get(month),
          description: `High delay rate in month ${month}`,
          confidence: 0.8
        });
      }
    }
    
    return patterns;
  }

  // Helper methods for temporal patterns
  
  analyzeHourlyDelays(flights) {
    const hourlyStats = Array(24).fill(null).map(() => ({
      totalFlights: 0,
      delayedFlights: 0,
      totalDelayMinutes: 0
    }));
    
    flights.forEach(flight => {
      const hour = new Date(flight.scheduledTime).getHours();
      hourlyStats[hour].totalFlights++;
      
      if (flight.delayMinutes > 15) {
        hourlyStats[hour].delayedFlights++;
        hourlyStats[hour].totalDelayMinutes += flight.delayMinutes;
      }
    });
    
    // Find peak delay hours
    const delayRates = hourlyStats.map((stat, hour) => ({
      hour,
      rate: stat.totalFlights > 0 ? stat.delayedFlights / stat.totalFlights : 0,
      avgDelay: stat.delayedFlights > 0 ? stat.totalDelayMinutes / stat.delayedFlights : 0
    }));
    
    const peakHours = delayRates
      .filter(h => h.rate > 0.3)
      .sort((a, b) => b.rate - a.rate);
    
    if (peakHours.length >= 2) {
      return {
        pattern: true,
        type: 'PEAK_DELAY_HOURS',
        description: `Peak delays occur at ${peakHours.map(h => `${h.hour}:00`).join(', ')}`,
        confidence: 0.85,
        peakHours,
        hourlyStats: delayRates
      };
    }
    
    return { pattern: false };
  }

  analyzeWeekdayPatterns(flights) {
    const weekdayStats = Array(7).fill(null).map(() => ({
      totalFlights: 0,
      delayedFlights: 0
    }));
    
    flights.forEach(flight => {
      const day = new Date(flight.scheduledTime).getDay();
      weekdayStats[day].totalFlights++;
      
      if (flight.delayMinutes > 15) {
        weekdayStats[day].delayedFlights++;
      }
    });
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const delayRates = weekdayStats.map((stat, day) => ({
      day: dayNames[day],
      rate: stat.totalFlights > 0 ? stat.delayedFlights / stat.totalFlights : 0,
      volume: stat.totalFlights
    }));
    
    // Find patterns
    const weekdayAvg = delayRates.slice(1, 6).reduce((sum, d) => sum + d.rate, 0) / 5;
    const weekendAvg = (delayRates[0].rate + delayRates[6].rate) / 2;
    
    if (Math.abs(weekdayAvg - weekendAvg) > 0.1) {
      return {
        pattern: true,
        type: 'WEEKDAY_WEEKEND_PATTERN',
        description: weekdayAvg > weekendAvg 
          ? 'Higher delays on weekdays' 
          : 'Higher delays on weekends',
        confidence: 0.75,
        weekdayRate: weekdayAvg,
        weekendRate: weekendAvg,
        dailyRates: delayRates
      };
    }
    
    return { pattern: false };
  }

  detectTimeTrends(flights) {
    const trends = [];
    
    // Sort by date
    const sortedFlights = [...flights].sort((a, b) => 
      new Date(a.scheduledTime) - new Date(b.scheduledTime)
    );
    
    // Calculate daily metrics
    const dailyMetrics = new Map();
    
    sortedFlights.forEach(flight => {
      const date = new Date(flight.scheduledTime).toISOString().split('T')[0];
      
      if (!dailyMetrics.has(date)) {
        dailyMetrics.set(date, {
          totalFlights: 0,
          delayedFlights: 0,
          totalDelayMinutes: 0
        });
      }
      
      const metrics = dailyMetrics.get(date);
      metrics.totalFlights++;
      
      if (flight.delayMinutes > 15) {
        metrics.delayedFlights++;
        metrics.totalDelayMinutes += flight.delayMinutes;
      }
    });
    
    // Convert to array for trend analysis
    const dailyData = Array.from(dailyMetrics.entries())
      .map(([date, metrics]) => ({
        date,
        delayRate: metrics.delayedFlights / metrics.totalFlights,
        avgDelay: metrics.delayedFlights > 0 
          ? metrics.totalDelayMinutes / metrics.delayedFlights 
          : 0
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Simple linear regression for trend
    if (dailyData.length >= 7) {
      const trend = this.calculateTrend(dailyData.map(d => d.delayRate));
      
      if (Math.abs(trend.slope) > 0.001) {
        trends.push({
          type: 'DELAY_TREND',
          direction: trend.slope > 0 ? 'INCREASING' : 'DECREASING',
          description: `Delay rates are ${trend.slope > 0 ? 'increasing' : 'decreasing'} over time`,
          confidence: trend.rSquared,
          slope: trend.slope,
          details: trend
        });
      }
    }
    
    return trends;
  }

  findRecurringDelayWindows(flights) {
    const windows = [];
    
    // Look for recurring time windows with high delays
    const timeWindows = new Map(); // key: "hour-dayOfWeek"
    
    flights.forEach(flight => {
      const date = new Date(flight.scheduledTime);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const key = `${hour}-${dayOfWeek}`;
      
      if (!timeWindows.has(key)) {
        timeWindows.set(key, {
          totalFlights: 0,
          delayedFlights: 0,
          delays: []
        });
      }
      
      const window = timeWindows.get(key);
      window.totalFlights++;
      
      if (flight.delayMinutes > 15) {
        window.delayedFlights++;
        window.delays.push(flight.delayMinutes);
      }
    });
    
    // Find windows with consistent high delays
    for (const [key, window] of timeWindows) {
      if (window.totalFlights >= 10 && window.delayedFlights / window.totalFlights > 0.4) {
        const [hour, dayOfWeek] = key.split('-').map(Number);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        windows.push({
          type: 'RECURRING_DELAY_WINDOW',
          description: `High delays on ${dayNames[dayOfWeek]}s at ${hour}:00`,
          confidence: Math.min(0.5 + (window.totalFlights / 100) * 0.5, 0.9),
          dayOfWeek,
          hour,
          delayRate: window.delayedFlights / window.totalFlights,
          avgDelay: window.delays.reduce((a, b) => a + b, 0) / window.delays.length,
          sampleSize: window.totalFlights
        });
      }
    }
    
    return windows;
  }

  // Helper methods for spatial patterns
  
  analyzeRoutePatterns(flights) {
    const patterns = [];
    const routeStats = new Map();
    
    flights.forEach(flight => {
      const route = `${flight.origin}-${flight.destination}`;
      
      if (!routeStats.has(route)) {
        routeStats.set(route, {
          totalFlights: 0,
          delayedFlights: 0,
          delays: []
        });
      }
      
      const stats = routeStats.get(route);
      stats.totalFlights++;
      
      if (flight.delayMinutes > 15) {
        stats.delayedFlights++;
        stats.delays.push(flight.delayMinutes);
      }
    });
    
    // Find problematic routes
    for (const [route, stats] of routeStats) {
      if (stats.totalFlights >= 20) {
        const delayRate = stats.delayedFlights / stats.totalFlights;
        
        if (delayRate > 0.35) {
          patterns.push({
            type: 'HIGH_DELAY_ROUTE',
            route,
            description: `Route ${route} has high delay rate`,
            confidence: Math.min(0.6 + (stats.totalFlights / 200) * 0.4, 0.95),
            delayRate,
            avgDelay: stats.delays.length > 0 
              ? stats.delays.reduce((a, b) => a + b, 0) / stats.delays.length 
              : 0,
            flightCount: stats.totalFlights
          });
        }
      }
    }
    
    return patterns;
  }

  detectAirportCongestion(flights) {
    const patterns = [];
    const airportStats = new Map();
    
    // Analyze hourly traffic at each airport
    flights.forEach(flight => {
      const depAirport = flight.origin;
      const arrAirport = flight.destination;
      const hour = new Date(flight.scheduledTime).getHours();
      
      // Departure airport
      const depKey = `${depAirport}-${hour}`;
      if (!airportStats.has(depKey)) {
        airportStats.set(depKey, {
          airport: depAirport,
          hour,
          type: 'departure',
          flights: 0,
          delays: 0
        });
      }
      airportStats.get(depKey).flights++;
      if (flight.delayMinutes > 15) {
        airportStats.get(depKey).delays++;
      }
      
      // Arrival airport
      const arrHour = new Date(new Date(flight.scheduledTime).getTime() + 
        (flight.estimatedDuration || 120) * 60000).getHours();
      const arrKey = `${arrAirport}-${arrHour}`;
      if (!airportStats.has(arrKey)) {
        airportStats.set(arrKey, {
          airport: arrAirport,
          hour: arrHour,
          type: 'arrival',
          flights: 0,
          delays: 0
        });
      }
      airportStats.get(arrKey).flights++;
    });
    
    // Find congestion patterns
    const airportHourlyMax = new Map();
    
    for (const [key, stats] of airportStats) {
      const airport = stats.airport;
      if (!airportHourlyMax.has(airport)) {
        airportHourlyMax.set(airport, 0);
      }
      airportHourlyMax.set(airport, Math.max(airportHourlyMax.get(airport), stats.flights));
    }
    
    for (const [key, stats] of airportStats) {
      const maxCapacity = airportHourlyMax.get(stats.airport);
      const utilization = stats.flights / maxCapacity;
      
      if (utilization > 0.8 && stats.delays / stats.flights > 0.3) {
        patterns.push({
          type: 'AIRPORT_CONGESTION',
          airport: stats.airport,
          hour: stats.hour,
          operationType: stats.type,
          description: `${stats.airport} experiences congestion at ${stats.hour}:00`,
          confidence: 0.8,
          utilization,
          delayRate: stats.delays / stats.flights,
          flightCount: stats.flights
        });
      }
    }
    
    return patterns;
  }

  findGeographicClusters(flights) {
    // Simplified geographic clustering
    // In production, would use actual coordinates and clustering algorithms
    const clusters = [];
    
    // Group by regions (simplified)
    const regions = {
      'West Coast': ['SFO', 'LAX', 'SEA', 'PDX'],
      'East Coast': ['JFK', 'EWR', 'BOS', 'DCA'],
      'Midwest': ['ORD', 'DFW', 'DEN', 'MSP'],
      'Canada': ['YYZ', 'YVR', 'YUL', 'YYC']
    };
    
    const regionStats = new Map();
    
    flights.forEach(flight => {
      for (const [region, airports] of Object.entries(regions)) {
        if (airports.includes(flight.origin) || airports.includes(flight.destination)) {
          if (!regionStats.has(region)) {
            regionStats.set(region, {
              totalFlights: 0,
              delayedFlights: 0
            });
          }
          
          const stats = regionStats.get(region);
          stats.totalFlights++;
          if (flight.delayMinutes > 15) {
            stats.delayedFlights++;
          }
        }
      }
    });
    
    // Find regional patterns
    for (const [region, stats] of regionStats) {
      const delayRate = stats.delayedFlights / stats.totalFlights;
      if (delayRate > 0.25 && stats.totalFlights > 50) {
        clusters.push({
          type: 'REGIONAL_DELAY_CLUSTER',
          region,
          description: `${region} region shows elevated delay rates`,
          confidence: 0.7,
          delayRate,
          flightCount: stats.totalFlights
        });
      }
    }
    
    return clusters;
  }

  // Helper methods for operational patterns
  
  analyzeAircraftUtilization(flights) {
    const patterns = [];
    const aircraftStats = new Map();
    
    flights.forEach(flight => {
      if (!flight.aircraft) return;
      
      if (!aircraftStats.has(flight.aircraft)) {
        aircraftStats.set(flight.aircraft, {
          flights: [],
          totalFlights: 0,
          delayedFlights: 0
        });
      }
      
      const stats = aircraftStats.get(flight.aircraft);
      stats.flights.push(flight);
      stats.totalFlights++;
      if (flight.delayMinutes > 15) {
        stats.delayedFlights++;
      }
    });
    
    // Analyze utilization patterns
    for (const [aircraft, stats] of aircraftStats) {
      if (stats.totalFlights >= 10) {
        // Sort flights by time
        stats.flights.sort((a, b) => 
          new Date(a.scheduledTime) - new Date(b.scheduledTime)
        );
        
        // Calculate daily utilization
        const dailyFlights = new Map();
        stats.flights.forEach(flight => {
          const date = new Date(flight.scheduledTime).toISOString().split('T')[0];
          dailyFlights.set(date, (dailyFlights.get(date) || 0) + 1);
        });
        
        const avgDailyFlights = Array.from(dailyFlights.values())
          .reduce((a, b) => a + b, 0) / dailyFlights.size;
        
        if (avgDailyFlights > 6) {
          patterns.push({
            type: 'HIGH_AIRCRAFT_UTILIZATION',
            aircraft,
            description: `Aircraft ${aircraft} has high utilization`,
            confidence: 0.8,
            avgDailyFlights,
            delayRate: stats.delayedFlights / stats.totalFlights,
            impact: avgDailyFlights > 8 ? 'HIGH' : 'MEDIUM'
          });
        }
      }
    }
    
    return patterns;
  }

  detectCrewPatterns(flights) {
    // Simplified crew pattern detection
    // In production, would need actual crew data
    const patterns = [];
    
    // Look for patterns in early morning and late night flights
    const earlyFlights = flights.filter(f => {
      const hour = new Date(f.scheduledTime).getHours();
      return hour < 6 || hour > 22;
    });
    
    const earlyDelayRate = earlyFlights.filter(f => f.delayMinutes > 15).length / earlyFlights.length;
    
    if (earlyDelayRate > 0.35 && earlyFlights.length > 20) {
      patterns.push({
        type: 'CREW_SCHEDULE_PATTERN',
        description: 'Higher delays in early morning/late night flights',
        confidence: 0.65,
        delayRate: earlyDelayRate,
        timeWindows: ['00:00-06:00', '22:00-24:00'],
        possibleCause: 'Crew availability or fatigue'
      });
    }
    
    return patterns;
  }

  analyzeGateUsage(flights) {
    const patterns = [];
    const gateStats = new Map();
    
    flights.forEach(flight => {
      if (!flight.gate) return;
      
      if (!gateStats.has(flight.gate)) {
        gateStats.set(flight.gate, {
          totalFlights: 0,
          delayedFlights: 0,
          terminals: new Set()
        });
      }
      
      const stats = gateStats.get(flight.gate);
      stats.totalFlights++;
      if (flight.delayMinutes > 15) {
        stats.delayedFlights++;
      }
      if (flight.terminal) {
        stats.terminals.add(flight.terminal);
      }
    });
    
    // Find problematic gates
    for (const [gate, stats] of gateStats) {
      if (stats.totalFlights >= 15) {
        const delayRate = stats.delayedFlights / stats.totalFlights;
        
        if (delayRate > 0.4) {
          patterns.push({
            type: 'PROBLEMATIC_GATE',
            gate,
            terminals: Array.from(stats.terminals),
            description: `Gate ${gate} shows high delay rate`,
            confidence: 0.7,
            delayRate,
            flightCount: stats.totalFlights
          });
        }
      }
    }
    
    return patterns;
  }

  analyzeTurnaroundTimes(flights) {
    const patterns = [];
    const turnarounds = [];
    
    // Group by aircraft
    const aircraftFlights = this.groupByAircraft(flights);
    
    for (const [aircraft, flightList] of aircraftFlights) {
      // Sort by scheduled time
      flightList.sort((a, b) => 
        new Date(a.scheduledTime) - new Date(b.scheduledTime)
      );
      
      // Calculate turnaround times
      for (let i = 1; i < flightList.length; i++) {
        const prevFlight = flightList[i - 1];
        const currentFlight = flightList[i];
        
        const turnaroundTime = 
          (new Date(currentFlight.scheduledTime) - new Date(prevFlight.scheduledTime)) / (1000 * 60);
        
        if (turnaroundTime < 180) { // Less than 3 hours
          turnarounds.push({
            aircraft,
            turnaroundMinutes: turnaroundTime,
            delayed: currentFlight.delayMinutes > 15,
            prevFlightDelay: prevFlight.delayMinutes || 0
          });
        }
      }
    }
    
    // Analyze turnaround patterns
    const shortTurnarounds = turnarounds.filter(t => t.turnaroundMinutes < 45);
    const shortTurnaroundDelayRate = shortTurnarounds.filter(t => t.delayed).length / shortTurnarounds.length;
    
    if (shortTurnaroundDelayRate > 0.5 && shortTurnarounds.length > 10) {
      patterns.push({
        type: 'SHORT_TURNAROUND_DELAYS',
        description: 'Short turnarounds lead to higher delay rates',
        confidence: 0.85,
        threshold: 45,
        delayRate: shortTurnaroundDelayRate,
        sampleSize: shortTurnarounds.length,
        recommendation: 'Increase minimum turnaround time'
      });
    }
    
    return patterns;
  }

  // Helper methods for anomaly detection
  
  findStatisticalOutliers(flights) {
    const anomalies = [];
    
    // Calculate delay statistics
    const delays = flights.map(f => f.delayMinutes || 0).filter(d => d > 0);
    if (delays.length === 0) return anomalies;
    
    const mean = delays.reduce((a, b) => a + b, 0) / delays.length;
    const variance = delays.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / delays.length;
    const stdDev = Math.sqrt(variance);
    
    // Find extreme outliers (> 3 standard deviations)
    flights.forEach(flight => {
      if (flight.delayMinutes > mean + 3 * stdDev) {
        anomalies.push({
          type: 'EXTREME_DELAY_OUTLIER',
          flightNumber: flight.flightNumber,
          description: `Extreme delay of ${flight.delayMinutes} minutes`,
          confidence: 0.95,
          delayMinutes: flight.delayMinutes,
          expectedRange: [0, Math.round(mean + 2 * stdDev)],
          severity: 'HIGH'
        });
      }
    });
    
    return anomalies;
  }

  findUnusualDelays(flights) {
    const anomalies = [];
    
    // Look for unusual delay reasons
    const delayReasons = new Map();
    
    flights.forEach(flight => {
      if (flight.delayMinutes > 15 && flight.delayReason) {
        const reason = flight.delayReason.toLowerCase();
        delayReasons.set(reason, (delayReasons.get(reason) || 0) + 1);
      }
    });
    
    // Find rare delay reasons
    const totalDelayedFlights = Array.from(delayReasons.values())
      .reduce((a, b) => a + b, 0);
    
    for (const [reason, count] of delayReasons) {
      const frequency = count / totalDelayedFlights;
      
      if (frequency < 0.02 && count >= 2) { // Less than 2% but at least 2 occurrences
        anomalies.push({
          type: 'UNUSUAL_DELAY_REASON',
          reason,
          description: `Rare delay reason: ${reason}`,
          confidence: 0.7,
          occurrences: count,
          frequency,
          severity: 'MEDIUM'
        });
      }
    }
    
    return anomalies;
  }

  findRouteAnomalies(flights) {
    const anomalies = [];
    
    // Analyze route distances and times
    const routeStats = new Map();
    
    flights.forEach(flight => {
      const route = `${flight.origin}-${flight.destination}`;
      
      if (!routeStats.has(route)) {
        routeStats.set(route, {
          durations: [],
          flights: []
        });
      }
      
      if (flight.actualDuration) {
        routeStats.get(route).durations.push(flight.actualDuration);
        routeStats.get(route).flights.push(flight);
      }
    });
    
    // Find anomalous flight times
    for (const [route, stats] of routeStats) {
      if (stats.durations.length >= 5) {
        const avgDuration = stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length;
        const stdDev = Math.sqrt(
          stats.durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / stats.durations.length
        );
        
        stats.flights.forEach(flight => {
          if (flight.actualDuration > avgDuration + 2 * stdDev) {
            anomalies.push({
              type: 'ROUTE_DURATION_ANOMALY',
              flightNumber: flight.flightNumber,
              route,
              description: `Unusually long flight time on route ${route}`,
              confidence: 0.8,
              actualDuration: flight.actualDuration,
              expectedDuration: avgDuration,
              deviation: (flight.actualDuration - avgDuration) / stdDev,
              severity: 'MEDIUM'
            });
          }
        });
      }
    }
    
    return anomalies;
  }

  detectPerformanceChanges(flights) {
    const changes = [];
    
    // Sort flights by date
    const sortedFlights = [...flights].sort((a, b) => 
      new Date(a.scheduledTime) - new Date(b.scheduledTime)
    );
    
    // Split into time windows
    const windowSize = 7; // 7 days
    const windows = [];
    
    for (let i = 0; i < sortedFlights.length; i += windowSize * 20) { // Rough estimate
      const windowEnd = new Date(sortedFlights[i].scheduledTime);
      windowEnd.setDate(windowEnd.getDate() + windowSize);
      
      const windowFlights = sortedFlights.filter(f => {
        const flightDate = new Date(f.scheduledTime);
        return flightDate >= new Date(sortedFlights[i].scheduledTime) && flightDate < windowEnd;
      });
      
      if (windowFlights.length > 0) {
        windows.push({
          start: new Date(sortedFlights[i].scheduledTime),
          end: windowEnd,
          flights: windowFlights,
          delayRate: windowFlights.filter(f => f.delayMinutes > 15).length / windowFlights.length
        });
      }
    }
    
    // Detect sudden changes
    for (let i = 1; i < windows.length; i++) {
      const prevWindow = windows[i - 1];
      const currentWindow = windows[i];
      
      const rateChange = currentWindow.delayRate - prevWindow.delayRate;
      
      if (Math.abs(rateChange) > 0.15) {
        changes.push({
          type: 'PERFORMANCE_CHANGE',
          direction: rateChange > 0 ? 'DEGRADATION' : 'IMPROVEMENT',
          description: `Sudden ${rateChange > 0 ? 'increase' : 'decrease'} in delay rate`,
          confidence: 0.75,
          previousRate: prevWindow.delayRate,
          currentRate: currentWindow.delayRate,
          changePercent: rateChange * 100,
          period: {
            from: prevWindow.start,
            to: currentWindow.end
          },
          severity: Math.abs(rateChange) > 0.25 ? 'HIGH' : 'MEDIUM'
        });
      }
    }
    
    return changes;
  }

  // Utility methods
  
  groupByAircraft(flights) {
    const groups = new Map();
    
    flights.forEach(flight => {
      if (flight.aircraft) {
        if (!groups.has(flight.aircraft)) {
          groups.set(flight.aircraft, []);
        }
        groups.get(flight.aircraft).push(flight);
      }
    });
    
    return groups;
  }

  groupByMonth(flights) {
    const groups = new Map();
    
    flights.forEach(flight => {
      const month = new Date(flight.scheduledTime).getMonth() + 1;
      
      if (!groups.has(month)) {
        groups.set(month, []);
      }
      groups.get(month).push(flight);
    });
    
    return groups;
  }

  calculateTrend(values) {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);
    
    return { slope, intercept, rSquared };
  }

  /**
   * Generate insights from detected patterns
   */
  generateInsights(patterns) {
    const insights = [];
    
    // High-level insights based on pattern combinations
    const temporalPatterns = patterns.temporal || [];
    const spatialPatterns = patterns.spatial || [];
    const operationalPatterns = patterns.operational || [];
    const anomalies = patterns.anomalies || [];
    const cascades = patterns.cascading || [];
    
    // 1. Peak congestion insights
    const peakHours = temporalPatterns.filter(p => p.type === 'PEAK_DELAY_HOURS');
    const congestion = spatialPatterns.filter(p => p.type === 'AIRPORT_CONGESTION');
    
    if (peakHours.length > 0 && congestion.length > 0) {
      insights.push({
        type: 'PEAK_CONGESTION',
        title: 'Peak Hour Congestion Pattern',
        description: 'Multiple airports experience congestion during similar peak hours',
        severity: 'HIGH',
        recommendations: [
          'Consider staggering flight schedules',
          'Increase ground crew during peak hours',
          'Implement slot management system'
        ],
        affectedAirports: [...new Set(congestion.map(c => c.airport))],
        peakTimes: peakHours[0].peakHours.map(h => `${h.hour}:00`)
      });
    }
    
    // 2. Cascade effect insights
    if (cascades.length > 5) {
      const totalAffectedFlights = cascades.reduce((sum, c) => sum + c.affectedFlights.length, 0);
      
      insights.push({
        type: 'CASCADE_DELAYS',
        title: 'Significant Delay Propagation',
        description: `${cascades.length} cascade delay chains affecting ${totalAffectedFlights} flights`,
        severity: 'HIGH',
        recommendations: [
          'Increase buffer time between flights',
          'Implement aircraft swap protocols',
          'Review minimum turnaround times'
        ],
        metrics: {
          cascadeCount: cascades.length,
          affectedFlights: totalAffectedFlights,
          avgCascadeLength: totalAffectedFlights / cascades.length
        }
      });
    }
    
    // 3. Operational efficiency insights
    const highUtilization = operationalPatterns.filter(p => p.type === 'HIGH_AIRCRAFT_UTILIZATION');
    const shortTurnarounds = operationalPatterns.filter(p => p.type === 'SHORT_TURNAROUND_DELAYS');
    
    if (highUtilization.length > 0 && shortTurnarounds.length > 0) {
      insights.push({
        type: 'OPERATIONAL_STRESS',
        title: 'Fleet Under Operational Stress',
        description: 'High aircraft utilization combined with short turnarounds causing delays',
        severity: 'MEDIUM',
        recommendations: [
          'Review fleet size and allocation',
          'Increase spare aircraft availability',
          'Optimize flight scheduling algorithms'
        ],
        metrics: {
          stressedAircraft: highUtilization.length,
          avgDailyFlights: Math.max(...highUtilization.map(h => h.avgDailyFlights))
        }
      });
    }
    
    // 4. Anomaly insights
    const extremeDelays = anomalies.filter(a => a.type === 'EXTREME_DELAY_OUTLIER');
    const performanceChanges = anomalies.filter(a => a.type === 'PERFORMANCE_CHANGE');
    
    if (performanceChanges.some(p => p.direction === 'DEGRADATION')) {
      insights.push({
        type: 'PERFORMANCE_DEGRADATION',
        title: 'System Performance Degradation Detected',
        description: 'Recent decline in on-time performance detected',
        severity: 'HIGH',
        recommendations: [
          'Investigate root causes of performance decline',
          'Review recent operational changes',
          'Increase monitoring and alerts'
        ],
        changes: performanceChanges.filter(p => p.direction === 'DEGRADATION')
      });
    }
    
    // 5. Seasonal insights
    const seasonalPatterns = patterns.seasonal || [];
    if (seasonalPatterns.length > 0) {
      const highDelayMonths = seasonalPatterns
        .filter(p => p.type === 'SEASONAL_HIGH_DELAY')
        .map(p => p.month);
      
      insights.push({
        type: 'SEASONAL_PREPARATION',
        title: 'Seasonal Delay Patterns Identified',
        description: `Higher delays expected in months: ${highDelayMonths.join(', ')}`,
        severity: 'MEDIUM',
        recommendations: [
          'Prepare additional resources for high-delay months',
          'Adjust schedules for seasonal variations',
          'Implement seasonal contingency plans'
        ],
        affectedMonths: highDelayMonths
      });
    }
    
    return insights;
  }
}

module.exports = PatternDetector;