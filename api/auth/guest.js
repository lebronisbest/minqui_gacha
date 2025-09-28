// 게스트 로그인 API
const { pool, getRedisClient } = require('../lib/database');
const { v4: uuidv4 } = require('uuid');

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
    const sessionId = uuidv4();
    const userId = uuidv4();
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // 사용자 세션 생성
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO users (id, session_id, ip_address, user_agent)
        VALUES ($1, $2, $3, $4)
      `, [userId, sessionId, ipAddress, userAgent]);

      // 초기 티켓 설정
      const redis = await getRedisClient();
      const maxTickets = parseInt(process.env.MAX_TICKETS || '10');
      await redis.set(`tickets:${userId}`, maxTickets.toString());
      
      // 티켓 만료 시간 설정 (12시간)
      const refillHours = parseInt(process.env.TICKET_REFILL_HOURS || '12');
      await redis.expire(`tickets:${userId}`, refillHours * 3600);

      // 감사 로그
      await client.query(`
        INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent, request_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        'LOGIN',
        JSON.stringify({ sessionId, loginType: 'guest' }),
        ipAddress,
        userAgent,
        uuidv4()
      ]);

      const userSession = {
        userId,
        sessionId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      const response = {
        success: true,
        data: userSession,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4()
      };

      res.status(200).json(response);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || uuidv4()
    });
  }
};
