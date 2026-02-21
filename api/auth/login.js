// 로그인 API
const { pool } = require('../lib/database');
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

    if (!username || !password) {
      res.status(400).json({ success: false, error: '닉네임과 비밀번호를 입력해주세요.' });
      return;
    }

    const client = await pool.connect();
    try {
      // username으로 유저 조회
      const result = await client.query(
        'SELECT id, session_id, username, password_hash FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        // 타이밍 공격 방지: 유저가 없어도 비교 시간 소모
        await bcrypt.compare(password, '$2b$10$invalidhashfortimingreasonsonlyxx');
        res.status(401).json({ success: false, error: '닉네임 또는 비밀번호가 틀렸습니다.' });
        return;
      }

      const user = result.rows[0];

      if (!user.password_hash) {
        res.status(401).json({ success: false, error: '이 계정은 비밀번호 로그인을 지원하지 않습니다.' });
        return;
      }

      // 비밀번호 검증
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        res.status(401).json({ success: false, error: '닉네임 또는 비밀번호가 틀렸습니다.' });
        return;
      }

      // 새 세션 발급
      const newSessionId = uuidv4();
      const ipAddress = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      await client.query(
        'UPDATE users SET session_id = $1, last_activity = NOW(), ip_address = $2, user_agent = $3 WHERE id = $4',
        [newSessionId, ipAddress, userAgent, user.id]
      );

      // 감사 로그
      await client.query(`
        INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent, request_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [user.id, 'LOGIN', JSON.stringify({ username, loginType: 'password' }), ipAddress, userAgent, uuidv4()]);

      res.status(200).json({
        success: true,
        data: { userId: user.id, sessionId: newSessionId, username: user.username },
        timestamp: new Date().toISOString()
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
};
