// 회원가입 API
const { pool, getRedisClient } = require('../lib/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Id, X-Session-Id, X-Request-Id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { username, password } = req.body;

    // 입력값 검증
    if (!username || !password) {
      res.status(400).json({ success: false, error: '닉네임과 비밀번호를 입력해주세요.' });
      return;
    }

    // username 형식 검증 (3~20자, 한글/영문/숫자/언더스코어)
    if (!/^[\uAC00-\uD7A3a-zA-Z0-9_]{3,20}$/.test(username)) {
      res.status(400).json({ success: false, error: '닉네임은 3~20자의 한글, 영문, 숫자, 언더스코어만 사용 가능합니다.' });
      return;
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      res.status(400).json({ success: false, error: '비밀번호는 6자 이상이어야 합니다.' });
      return;
    }

    const client = await pool.connect();
    try {
      // 닉네임 중복 확인
      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUser.rows.length > 0) {
        res.status(409).json({ success: false, error: '이미 사용 중인 닉네임입니다.' });
        return;
      }

      // 비밀번호 해싱 (bcrypt, cost factor 10)
      const passwordHash = await bcrypt.hash(password, 10);

      const userId = uuidv4();
      const sessionId = uuidv4();
      const ipAddress = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // 사용자 생성
      await client.query(`
        INSERT INTO users (id, session_id, username, password_hash, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, sessionId, username, passwordHash, ipAddress, userAgent]);

      // 초기 티켓 설정
      const redis = await getRedisClient();
      if (redis) {
        const maxTickets = parseInt(process.env.MAX_TICKETS || '10');
        await redis.set(`tickets:${userId}`, maxTickets.toString());
        const refillHours = parseInt(process.env.TICKET_REFILL_HOURS || '12');
        await redis.expire(`tickets:${userId}`, refillHours * 3600);
      }

      // 감사 로그
      await client.query(`
        INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent, request_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, 'REGISTER', JSON.stringify({ username, loginType: 'password' }), ipAddress, userAgent, uuidv4()]);

      res.status(200).json({
        success: true,
        data: { userId, sessionId, username },
        timestamp: new Date().toISOString()
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
};
