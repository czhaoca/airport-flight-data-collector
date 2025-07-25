/**
 * Cloudflare Worker for Airport Flight Data API
 * Provides optimized access to D1 database
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Simple auth check (replace with your auth logic)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }
    
    const token = authHeader.substring(7);
    if (token !== env.API_TOKEN) {
      return new Response('Invalid token', { status: 401, headers: corsHeaders });
    }
    
    try {
      // Route handling
      if (pathname === '/health') {
        return handleHealthCheck(env, corsHeaders);
      } else if (pathname === '/query') {
        return handleQuery(request, env, corsHeaders);
      } else if (pathname.startsWith('/flights')) {
        return handleFlights(request, env, corsHeaders, pathname);
      } else if (pathname === '/stats') {
        return handleStats(env, corsHeaders);
      } else if (pathname === '/migrate') {
        return handleMigration(request, env, corsHeaders);
      }
      
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

async function handleHealthCheck(env, corsHeaders) {
  try {
    const result = await env.DB.prepare('SELECT 1 as health_check').first();
    
    // Get database stats
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT airport_code) as airports,
        MIN(flight_date) as earliest_date,
        MAX(flight_date) as latest_date
      FROM ${env.FLIGHTS_TABLE || 'flights'}
    `).first();
    
    return new Response(JSON.stringify({
      status: 'healthy',
      database: 'connected',
      stats: stats,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error.message
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleQuery(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }
  
  const { sql, params = [] } = await request.json();
  
  if (!sql) {
    return new Response('SQL query required', { status: 400, headers: corsHeaders });
  }
  
  try {
    const stmt = env.DB.prepare(sql);
    const result = params.length > 0 ? stmt.bind(...params) : stmt;
    const data = await result.all();
    
    return new Response(JSON.stringify({
      success: true,
      result: data.results,
      meta: data.meta
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleFlights(request, env, corsHeaders, pathname) {
  const url = new URL(request.url);
  const tableName = env.FLIGHTS_TABLE || 'flights';
  
  if (request.method === 'GET') {
    // Parse query parameters
    const airport = url.searchParams.get('airport');
    const type = url.searchParams.get('type');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // Build query
    let sql = `SELECT * FROM ${tableName} WHERE 1=1`;
    const params = [];
    
    if (airport) {
      sql += ' AND airport_code = ?';
      params.push(airport.toUpperCase());
    }
    
    if (type) {
      sql += ' AND flight_type = ?';
      params.push(type.toLowerCase());
    }
    
    if (startDate) {
      sql += ' AND flight_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND flight_date <= ?';
      params.push(endDate);
    }
    
    sql += ' ORDER BY flight_date DESC, collection_date DESC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    try {
      const result = await env.DB.prepare(sql).bind(...params).all();
      
      // Parse JSON data
      const flights = result.results.map(row => ({
        ...row,
        flight_data: JSON.parse(row.flight_data)
      }));
      
      return new Response(JSON.stringify({
        success: true,
        data: flights,
        pagination: {
          limit,
          offset,
          total: result.meta.rows_read
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } else if (request.method === 'POST') {
    // Handle flight data insertion
    const flightData = await request.json();
    
    try {
      const result = await env.DB.prepare(`
        INSERT INTO ${tableName} (
          id, airport_code, flight_type, collection_date, 
          flight_date, flight_data, created_at, updated_at
        ) VALUES (?, ?, ?, datetime('now'), ?, ?, datetime('now'), datetime('now'))
      `).bind(
        flightData.id,
        flightData.airport_code,
        flightData.flight_type,
        flightData.flight_date,
        JSON.stringify(flightData.flight_data)
      ).run();
      
      return new Response(JSON.stringify({
        success: true,
        id: flightData.id,
        changes: result.meta.changes
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
}

async function handleStats(env, corsHeaders) {
  const tableName = env.FLIGHTS_TABLE || 'flights';
  
  try {
    // Get various statistics
    const [summary, airports, recent] = await Promise.all([
      // Overall summary
      env.DB.prepare(`
        SELECT 
          COUNT(*) as total_flights,
          COUNT(DISTINCT airport_code) as total_airports,
          COUNT(DISTINCT flight_date) as total_days,
          MIN(flight_date) as earliest_date,
          MAX(flight_date) as latest_date
        FROM ${tableName}
      `).first(),
      
      // Per airport stats
      env.DB.prepare(`
        SELECT 
          airport_code,
          flight_type,
          COUNT(*) as count,
          MIN(flight_date) as first_date,
          MAX(flight_date) as last_date
        FROM ${tableName}
        GROUP BY airport_code, flight_type
        ORDER BY airport_code, flight_type
      `).all(),
      
      // Recent activity (last 7 days)
      env.DB.prepare(`
        SELECT 
          flight_date,
          airport_code,
          flight_type,
          COUNT(*) as flights_count
        FROM ${tableName}
        WHERE flight_date >= date('now', '-7 days')
        GROUP BY flight_date, airport_code, flight_type
        ORDER BY flight_date DESC
      `).all()
    ]);
    
    // Calculate storage estimate
    const storageEstimate = await env.DB.prepare(`
      SELECT 
        SUM(LENGTH(flight_data)) as total_bytes,
        AVG(LENGTH(flight_data)) as avg_bytes_per_record
      FROM ${tableName}
    `).first();
    
    return new Response(JSON.stringify({
      success: true,
      summary: summary,
      airports: airports.results,
      recent_activity: recent.results,
      storage: {
        total_mb: (storageEstimate.total_bytes / 1024 / 1024).toFixed(2),
        avg_kb_per_record: (storageEstimate.avg_bytes_per_record / 1024).toFixed(2),
        d1_limit_mb: 5120,
        usage_percentage: ((storageEstimate.total_bytes / (5 * 1024 * 1024 * 1024)) * 100).toFixed(2)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleMigration(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }
  
  // This is a simplified migration endpoint
  // In production, you'd want more sophisticated batch processing
  const { records } = await request.json();
  const tableName = env.FLIGHTS_TABLE || 'flights';
  
  if (!Array.isArray(records)) {
    return new Response('Records array required', { status: 400, headers: corsHeaders });
  }
  
  let inserted = 0;
  let errors = [];
  
  // Process in smaller batches
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      // Use a transaction for each batch
      await env.DB.batch(
        batch.map(record => 
          env.DB.prepare(`
            INSERT OR REPLACE INTO ${tableName} (
              id, airport_code, flight_type, collection_date, 
              flight_date, flight_data, created_at, updated_at
            ) VALUES (?, ?, ?, datetime('now'), ?, ?, datetime('now'), datetime('now'))
          `).bind(
            record.id,
            record.airport_code,
            record.flight_type,
            record.flight_date,
            JSON.stringify(record.flight_data)
          )
        )
      );
      
      inserted += batch.length;
    } catch (error) {
      errors.push({
        batch: `${i}-${i + batch.length}`,
        error: error.message
      });
    }
  }
  
  return new Response(JSON.stringify({
    success: errors.length === 0,
    inserted: inserted,
    errors: errors
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}