// 데이터베이스 연결 테스트 스크립트
const { pool, initializeDatabase, runMigrations } = require('./api/lib/database');

async function testDatabase() {
  console.log('데이터베이스 연결 테스트 시작...');
  
  try {
    // 환경 변수 확인
    console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? '설정됨' : '설정되지 않음');
    console.log('REDIS_URL:', process.env.REDIS_URL ? '설정됨' : '설정되지 않음');
    
    // 데이터베이스 초기화
    await initializeDatabase();
    console.log('✅ 데이터베이스 연결 성공');
    
    // 마이그레이션 실행
    await runMigrations();
    console.log('✅ 마이그레이션 완료');
    
    // 간단한 쿼리 테스트
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT COUNT(*) FROM cards');
      console.log('✅ 카드 테이블 쿼리 성공, 카드 수:', result.rows[0].count);
    } finally {
      client.release();
    }
    
    console.log('✅ 모든 테스트 통과');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error('상세 에러:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testDatabase();
