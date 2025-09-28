// Vercel Postgres 연결 설정
const { Pool } = require('pg');

// Vercel Postgres 연결 풀 생성
let connectionString = process.env.POSTGRES_URL;

// SSL 설정 처리
if (connectionString) {
  // sslmode=require를 sslmode=prefer로 변경
  connectionString = connectionString.replace('sslmode=require', 'sslmode=prefer');
} else {
  console.warn('POSTGRES_URL 환경 변수가 설정되지 않았습니다.');
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: connectionString ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// 연결 에러 핸들링
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

pool.on('connect', () => {
  console.log('PostgreSQL client connected');
});

pool.on('remove', () => {
  console.log('PostgreSQL client removed');
});

// Redis 연결 (Vercel Redis 또는 Upstash Redis 사용)
const { createClient } = require('redis');

let redisClient = null;

async function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
    
    if (!redisUrl) {
      console.warn('Redis URL이 설정되지 않았습니다. Redis 기능이 비활성화됩니다.');
      return null;
    }
    
    try {
      redisClient = createClient({
        url: redisUrl
      });
      
      redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });
      
      redisClient.on('connect', () => {
        console.log('Redis client connected');
      });
      
      await redisClient.connect();
    } catch (error) {
      console.error('Redis connection failed:', error);
      return null;
    }
  }
  return redisClient;
}

// 데이터베이스 초기화
async function initializeDatabase() {
  try {
    if (!connectionString) {
      throw new Error('POSTGRES_URL 환경 변수가 설정되지 않았습니다.');
    }
    
    const client = await pool.connect();
    console.log('PostgreSQL connected successfully');
    
    // 간단한 쿼리로 연결 테스트
    await client.query('SELECT 1');
    console.log('PostgreSQL query test successful');
    
    client.release();
  } catch (error) {
    console.error('PostgreSQL connection failed:', error);
    throw error;
  }
}

// 데이터베이스 마이그레이션
async function runMigrations() {
  const client = await pool.connect();
  
  try {
    // 사용자 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT
      )
    `);

    // 카드 카탈로그 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        rank VARCHAR(10) NOT NULL,
        base_hp INTEGER NOT NULL,
        base_attack INTEGER NOT NULL,
        image VARCHAR(500) NOT NULL,
        attacks JSONB NOT NULL,
        holo_pattern VARCHAR(50),
        holo_color VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 사용자 인벤토리 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        card_id VARCHAR(50) REFERENCES cards(id),
        count INTEGER DEFAULT 1,
        first_obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, card_id)
      )
    `);

    // 가챠 기록 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS gacha_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        draw_id VARCHAR(255) UNIQUE NOT NULL,
        cards_drawn JSONB NOT NULL,
        tickets_used INTEGER DEFAULT 1,
        tickets_remaining INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT
      )
    `);

    // 조합 기록 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS fusion_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        fusion_id VARCHAR(255) UNIQUE NOT NULL,
        materials_used JSONB NOT NULL,
        result_card JSONB,
        success BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT
      )
    `);

    // 감사 로그 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT,
        request_id VARCHAR(255)
      )
    `);

    // 인덱스 생성
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
      CREATE INDEX IF NOT EXISTS idx_gacha_logs_user_id ON gacha_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_fusion_logs_user_id ON fusion_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `);

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Database migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  getRedisClient,
  initializeDatabase,
  runMigrations
};
