// Vercel Postgres 연결 설정
const { Pool } = require('pg');

// Vercel Postgres 연결 풀 생성
const connectionString = process.env.POSTGRES_URL?.replace('sslmode=require', 'sslmode=disable');

const pool = new Pool({
  connectionString: connectionString || process.env.POSTGRES_URL,
  ssl: false, // SSL 완전 비활성화
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis 연결 (Vercel Redis 또는 Upstash Redis 사용)
const { createClient } = require('redis');

let redisClient = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    
    await redisClient.connect();
  }
  return redisClient;
}

// 데이터베이스 초기화
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL connected successfully');
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
