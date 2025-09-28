// 세션 검증 API
const { pool, getRedisClient } = require('../lib/database');

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Id, X-Session-Id, X-Request-Id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    const userId = req.headers['x-user-id'];
    const sessionId = req.headers['x-session-id'];

    if (!userId || !sessionId) {
      res.status(400).json({
        success: false,
        error: 'Missing user ID or session ID',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 데이터베이스에서 세션 검증
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT id, session_id, created_at, last_activity
        FROM users
        WHERE id = $1 AND session_id = $2
      `, [userId, sessionId]);

      if (result.rows.length === 0) {
        res.status(401).json({
          success: false,
          error: 'Invalid session',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // 마지막 활동 시간 업데이트
      await client.query(`
        UPDATE users
        SET last_activity = NOW()
        WHERE id = $1
      `, [userId]);

      // 감사 로그
      const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      await client.query(`
        INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent, request_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        'SESSION_VALIDATE',
        JSON.stringify({ sessionId }),
        ipAddress,
        userAgent,
        req.headers['x-request-id'] || 'validate-session'
      ]);

      res.status(200).json({
        success: true,
        data: {
          userId,
          sessionId,
          valid: true,
          lastActivity: result.rows[0].last_activity
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'validate-session'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'validate-session'
    });
  }
};