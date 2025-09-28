// 데이터베이스 초기화 API
const { pool, runMigrations, initializeDatabase } = require('../lib/database');

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Id, X-Session-Id, X-Request-Id');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    console.log('데이터베이스 초기화 시작...');
    
    // 환경 변수 확인
    console.log('POSTGRES_URL 존재:', !!process.env.POSTGRES_URL);
    console.log('REDIS_URL 존재:', !!process.env.REDIS_URL);
    console.log('UPSTASH_REDIS_REST_URL 존재:', !!process.env.UPSTASH_REDIS_REST_URL);
    
    // 데이터베이스 연결 테스트
    await initializeDatabase();
    console.log('데이터베이스 연결 성공');
    
    // 마이그레이션 실행
    await runMigrations();
    console.log('마이그레이션 완료');
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Database initialized successfully',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database initialization failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
