// 가챠 실행 API
const GachaService = require('../lib/gacha');
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
    console.log('=== GACHA DRAW API 시작 ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    
    const userId = req.headers['x-user-id'];
    const sessionId = req.headers['x-session-id'];
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const requestId = req.headers['x-request-id'] || uuidv4();

    console.log('User ID:', userId);
    console.log('Session ID:', sessionId);

    if (!userId || !sessionId) {
      console.log('❌ 인증 실패 - User ID 또는 Session ID 없음');
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
        requestId
      });
      return;
    }

    const context = {
      userId,
      sessionId,
      ipAddress,
      userAgent,
      requestId
    };

    console.log('Context:', context);

    const gachaService = new GachaService();
    console.log('가챠 서비스 생성 완료, 가챠 실행 중...');
    const result = await gachaService.performGacha(context);
    console.log('가챠 결과:', result);
    
    const response = {
      success: result.success,
      data: result,
      timestamp: new Date().toISOString(),
      requestId
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Gacha draw error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || uuidv4()
    });
  }
};
