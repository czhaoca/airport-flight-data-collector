const express = require('express');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const parquet = require('parquetjs');
const path = require('path');
const fs = require('fs').promises;
const { apiLogger } = require('../../../../lib/logging');
const { getDatabase } = require('../../../../lib/database');

const router = express.Router();
const logger = apiLogger.child('Export');

// Temporary directory for exports
const EXPORT_DIR = path.join(__dirname, '../../../../temp/exports');

// Ensure export directory exists
async function ensureExportDir() {
  try {
    await fs.mkdir(EXPORT_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create export directory', error);
  }
}

/**
 * Export flights data
 * GET /api/v2/export/flights
 * Query params:
 * - format: json|csv|parquet
 * - airport: Airport code
 * - startDate: Start date
 * - endDate: End date
 * - type: arrival|departure
 * - limit: Max records
 */
router.get('/flights', async (req, res) => {
  try {
    const {
      format = 'json',
      airport,
      startDate,
      endDate,
      type,
      limit = 10000
    } = req.query;

    logger.info('Export request', { format, airport, startDate, endDate, type, limit });

    // Validate format
    if (!['json', 'csv', 'parquet'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Supported formats: json, csv, parquet'
      });
    }

    // Get data from database
    const db = await getDatabase();
    const flights = await db.getFlightData({
      airport,
      type,
      startDate,
      endDate,
      filters: { limit: parseInt(limit) }
    });

    // Transform data for export
    const exportData = flights.map(flight => ({
      id: flight.id,
      airport: flight.airport_code,
      flightType: flight.flight_type,
      flightDate: flight.flight_date,
      collectionDate: flight.collection_date,
      flightNumber: flight.flight_data?.[0]?.flight_number || '',
      airline: flight.flight_data?.[0]?.airline || '',
      origin: flight.flight_data?.[0]?.origin || '',
      destination: flight.flight_data?.[0]?.destination || '',
      scheduledTime: flight.flight_data?.[0]?.scheduled_time || '',
      actualTime: flight.flight_data?.[0]?.actual_time || '',
      status: flight.flight_data?.[0]?.status || '',
      gate: flight.flight_data?.[0]?.gate || '',
      terminal: flight.flight_data?.[0]?.terminal || '',
      baggage: flight.flight_data?.[0]?.baggage || ''
    }));

    // Export based on format
    switch (format) {
      case 'json':
        res.json({
          success: true,
          metadata: {
            format: 'json',
            count: exportData.length,
            exportDate: new Date().toISOString(),
            filters: { airport, startDate, endDate, type }
          },
          data: exportData
        });
        break;

      case 'csv':
        await exportCSV(res, exportData, 'flights');
        break;

      case 'parquet':
        await exportParquet(res, exportData, 'flights');
        break;
    }

  } catch (error) {
    logger.error('Export failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Export statistics data
 * GET /api/v2/export/statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const {
      format = 'json',
      airport,
      startDate,
      endDate,
      groupBy = 'day'
    } = req.query;

    // Get statistics from database
    const db = await getDatabase();
    const flights = await db.getFlightData({
      airport,
      startDate,
      endDate,
      filters: { limit: 100000 }
    });

    // Calculate statistics
    const stats = calculateStatistics(flights, groupBy);

    switch (format) {
      case 'json':
        res.json({
          success: true,
          metadata: {
            format: 'json',
            exportDate: new Date().toISOString(),
            filters: { airport, startDate, endDate, groupBy }
          },
          data: stats
        });
        break;

      case 'csv':
        await exportCSV(res, stats, 'statistics');
        break;

      case 'parquet':
        await exportParquet(res, stats, 'statistics');
        break;

      default:
        res.status(400).json({
          success: false,
          error: 'Invalid format'
        });
    }

  } catch (error) {
    logger.error('Statistics export failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Export aggregated data
 * GET /api/v2/export/aggregated
 */
router.get('/aggregated', async (req, res) => {
  try {
    const {
      format = 'json',
      aggregation = 'airline', // airline, route, hourly
      airport,
      startDate,
      endDate
    } = req.query;

    const db = await getDatabase();
    const flights = await db.getFlightData({
      airport,
      startDate,
      endDate,
      filters: { limit: 100000 }
    });

    let aggregatedData;
    switch (aggregation) {
      case 'airline':
        aggregatedData = aggregateByAirline(flights);
        break;
      case 'route':
        aggregatedData = aggregateByRoute(flights);
        break;
      case 'hourly':
        aggregatedData = aggregateByHour(flights);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid aggregation type'
        });
    }

    switch (format) {
      case 'json':
        res.json({
          success: true,
          metadata: {
            format: 'json',
            aggregation,
            count: aggregatedData.length,
            exportDate: new Date().toISOString()
          },
          data: aggregatedData
        });
        break;

      case 'csv':
        await exportCSV(res, aggregatedData, `aggregated_${aggregation}`);
        break;

      case 'parquet':
        await exportParquet(res, aggregatedData, `aggregated_${aggregation}`);
        break;
    }

  } catch (error) {
    logger.error('Aggregated export failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get export job status
 * GET /api/v2/export/status/:jobId
 */
router.get('/status/:jobId', async (req, res) => {
  // This would check the status of async export jobs
  res.json({
    success: true,
    jobId: req.params.jobId,
    status: 'completed',
    downloadUrl: `/api/v2/export/download/${req.params.jobId}`
  });
});

/**
 * Download exported file
 * GET /api/v2/export/download/:jobId
 */
router.get('/download/:jobId', async (req, res) => {
  try {
    const filePath = path.join(EXPORT_DIR, `${req.params.jobId}.parquet`);
    
    // Check if file exists
    await fs.access(filePath);
    
    res.download(filePath, (err) => {
      if (err) {
        logger.error('Download failed', err);
        res.status(500).json({
          success: false,
          error: 'Download failed'
        });
      }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }
});

// Helper functions

async function exportCSV(res, data, filename) {
  if (!data || data.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No data to export'
    });
  }

  // Create CSV in memory
  const headers = Object.keys(data[0]).map(key => ({
    id: key,
    title: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
  }));

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);

  // Write headers
  res.write(headers.map(h => h.title).join(',') + '\n');

  // Write data
  data.forEach(row => {
    const values = headers.map(h => {
      const value = row[h.id];
      // Escape values containing commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    res.write(values.join(',') + '\n');
  });

  res.end();
}

async function exportParquet(res, data, filename) {
  await ensureExportDir();
  
  if (!data || data.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No data to export'
    });
  }

  const jobId = Date.now().toString();
  const filePath = path.join(EXPORT_DIR, `${jobId}.parquet`);

  try {
    // Define schema based on first row
    const schema = new parquet.ParquetSchema({
      id: { type: 'UTF8' },
      airport: { type: 'UTF8' },
      flightType: { type: 'UTF8' },
      flightDate: { type: 'UTF8' },
      flightNumber: { type: 'UTF8' },
      airline: { type: 'UTF8' },
      origin: { type: 'UTF8' },
      destination: { type: 'UTF8' },
      status: { type: 'UTF8' }
    });

    // Create writer
    const writer = await parquet.ParquetWriter.openFile(schema, filePath);

    // Write data
    for (const row of data) {
      await writer.appendRow(row);
    }

    await writer.close();

    // Send file
    res.download(filePath, `${filename}.parquet`, (err) => {
      if (err) {
        logger.error('Parquet download failed', err);
      }
      // Clean up file after download
      fs.unlink(filePath).catch(err => 
        logger.error('Failed to clean up parquet file', err)
      );
    });

  } catch (error) {
    logger.error('Parquet export failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Parquet file'
    });
  }
}

function calculateStatistics(flights, groupBy) {
  const groups = {};

  flights.forEach(flight => {
    let key;
    switch (groupBy) {
      case 'day':
        key = flight.flight_date;
        break;
      case 'week':
        const date = new Date(flight.flight_date);
        const week = Math.floor(date.getDate() / 7);
        key = `${date.getFullYear()}-W${week}`;
        break;
      case 'month':
        key = flight.flight_date.substring(0, 7);
        break;
      default:
        key = flight.flight_date;
    }

    if (!groups[key]) {
      groups[key] = {
        period: key,
        totalFlights: 0,
        arrivals: 0,
        departures: 0,
        airports: new Set(),
        airlines: new Set()
      };
    }

    groups[key].totalFlights++;
    groups[key][flight.flight_type + 's']++;
    groups[key].airports.add(flight.airport_code);
    
    if (flight.flight_data && Array.isArray(flight.flight_data)) {
      flight.flight_data.forEach(f => {
        if (f.airline) groups[key].airlines.add(f.airline);
      });
    }
  });

  return Object.values(groups).map(g => ({
    period: g.period,
    totalFlights: g.totalFlights,
    arrivals: g.arrivals,
    departures: g.departures,
    uniqueAirports: g.airports.size,
    uniqueAirlines: g.airlines.size
  }));
}

function aggregateByAirline(flights) {
  const airlines = {};

  flights.forEach(flight => {
    if (flight.flight_data && Array.isArray(flight.flight_data)) {
      flight.flight_data.forEach(f => {
        if (!f.airline) return;

        if (!airlines[f.airline]) {
          airlines[f.airline] = {
            airline: f.airline,
            totalFlights: 0,
            arrivals: 0,
            departures: 0,
            delayed: 0,
            cancelled: 0,
            onTime: 0
          };
        }

        airlines[f.airline].totalFlights++;
        airlines[f.airline][flight.flight_type + 's']++;
        
        if (f.status) {
          if (f.status.toLowerCase().includes('delay')) airlines[f.airline].delayed++;
          else if (f.status.toLowerCase().includes('cancel')) airlines[f.airline].cancelled++;
          else airlines[f.airline].onTime++;
        }
      });
    }
  });

  return Object.values(airlines);
}

function aggregateByRoute(flights) {
  const routes = {};

  flights.forEach(flight => {
    if (flight.flight_data && Array.isArray(flight.flight_data)) {
      flight.flight_data.forEach(f => {
        if (!f.origin || !f.destination) return;

        const routeKey = `${f.origin}-${f.destination}`;
        if (!routes[routeKey]) {
          routes[routeKey] = {
            route: routeKey,
            origin: f.origin,
            destination: f.destination,
            flightCount: 0,
            airlines: new Set()
          };
        }

        routes[routeKey].flightCount++;
        if (f.airline) routes[routeKey].airlines.add(f.airline);
      });
    }
  });

  return Object.values(routes).map(r => ({
    ...r,
    uniqueAirlines: r.airlines.size,
    airlines: Array.from(r.airlines).join(', ')
  }));
}

function aggregateByHour(flights) {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    arrivals: 0,
    departures: 0,
    total: 0
  }));

  flights.forEach(flight => {
    if (flight.flight_data && Array.isArray(flight.flight_data)) {
      flight.flight_data.forEach(f => {
        const time = f.scheduled_time || f.actual_time;
        if (time) {
          const hour = new Date(time).getHours();
          hours[hour][flight.flight_type + 's']++;
          hours[hour].total++;
        }
      });
    }
  });

  return hours;
}

module.exports = router;