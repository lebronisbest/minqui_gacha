// 디버깅용 API
const { pool } = require('../lib/database');

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Id, X-Session-Id, X-Request-Id');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        POSTGRES_URL_EXISTS: !!process.env.POSTGRES_URL,
        REDIS_URL_EXISTS: !!process.env.REDIS_URL,
        UPSTASH_REDIS_EXISTS: !!process.env.UPSTASH_REDIS_REST_URL
      },
      database: {
        poolExists: !!pool,
        poolTotalCount: pool ? pool.totalCount : 'N/A',
        poolIdleCount: pool ? pool.idleCount : 'N/A',
        poolWaitingCount: pool ? pool.waitingCount : 'N/A'
      }
    };

    // 데이터베이스 연결 테스트
    try {
      const client = await pool.connect();
      debugInfo.database.connectionTest = 'SUCCESS';
      
      // 테이블 존재 확인
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      debugInfo.database.tables = tablesResult.rows.map(row => row.table_name);
      
      // cards 테이블 데이터 확인
      if (debugInfo.database.tables.includes('cards')) {
        const cardsResult = await client.query('SELECT COUNT(*) as count FROM cards');
        debugInfo.database.cardsCount = parseInt(cardsResult.rows[0].count);
      } else {
        debugInfo.database.cardsCount = 'TABLE_NOT_EXISTS';
      }
      
      client.release();
    } catch (dbError) {
      debugInfo.database.connectionTest = 'FAILED';
      debugInfo.database.error = {
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack
      };
    }

    res.status(200).json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
