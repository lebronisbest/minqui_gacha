// 헬스체크 API
module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Id, X-Session-Id, X-Request-Id');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    // 데이터베이스 연결 확인
    const { pool } = require('./lib/database');
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    // Redis 연결 확인
    const { getRedisClient } = require('./lib/database');
    const redis = await getRedisClient();
    await redis.ping();

    res.status(200).json({
      success: true,
      data: { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          redis: 'connected'
        }
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'health-check'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      data: { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        error: error.message
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'health-check'
    });
  }
};
