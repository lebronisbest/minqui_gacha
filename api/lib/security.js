// 보안 및 정합성 검증 모듈
const crypto = require('crypto');

/**
 * 레이트리밋 관리
 */
class RateLimiter {
  constructor() {
    this.requests = new Map(); // userId -> { count, resetTime }
    this.limits = {
      fusion: { max: 10, window: 60000 }, // 1분에 10회
      gacha: { max: 5, window: 60000 },   // 1분에 5회
      general: { max: 100, window: 60000 } // 1분에 100회
    };
  }

  /**
   * 레이트리밋 체크
   * @param {string} userId - 사용자 ID
   * @param {string} type - 요청 타입 (fusion, gacha, general)
   * @returns {Object} 레이트리밋 결과
   */
  checkRateLimit(userId, type = 'general') {
    const now = Date.now();
    const limit = this.limits[type] || this.limits.general;
    const key = `${userId}:${type}`;
    
    const userRequests = this.requests.get(key) || { count: 0, resetTime: now + limit.window };
    
    // 윈도우 리셋
    if (now > userRequests.resetTime) {
      userRequests.count = 0;
      userRequests.resetTime = now + limit.window;
    }
    
    // 카운트 증가
    userRequests.count++;
    this.requests.set(key, userRequests);
    
    const remaining = Math.max(0, limit.max - userRequests.count);
    const resetTime = userRequests.resetTime;
    
    return {
      allowed: userRequests.count <= limit.max,
      remaining,
      resetTime,
      limit: limit.max
    };
  }

  /**
   * 레이트리밋 정보 조회
   * @param {string} userId - 사용자 ID
   * @param {string} type - 요청 타입
   * @returns {Object} 레이트리밋 정보
   */
  getRateLimitInfo(userId, type = 'general') {
    const key = `${userId}:${type}`;
    const userRequests = this.requests.get(key);
    
    if (!userRequests) {
      return { remaining: this.limits[type]?.max || this.limits.general.max, resetTime: null };
    }
    
    const now = Date.now();
    if (now > userRequests.resetTime) {
      return { remaining: this.limits[type]?.max || this.limits.general.max, resetTime: null };
    }
    
    const limit = this.limits[type] || this.limits.general;
    return {
      remaining: Math.max(0, limit.max - userRequests.count),
      resetTime: userRequests.resetTime
    };
  }
}

/**
 * HMAC 서명 검증
 */
class SignatureValidator {
  constructor(secret) {
    this.secret = secret || process.env.HMAC_SECRET || 'default-secret';
  }

  /**
   * HMAC 서명 생성
   * @param {Object} data - 서명할 데이터
   * @returns {string} HMAC 서명
   */
  generateSignature(data) {
    const payload = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  /**
   * HMAC 서명 검증
   * @param {Object} data - 검증할 데이터
   * @param {string} signature - 서명
   * @returns {boolean} 검증 결과
   */
  verifySignature(data, signature) {
    const expectedSignature = this.generateSignature(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * 조합 결과 서명 생성
   * @param {Object} fusionResult - 조합 결과
   * @returns {string} 서명
   */
  generateFusionSignature(fusionResult) {
    const signatureData = {
      fusionId: fusionResult.fusionId,
      userId: fusionResult.userId,
      success: fusionResult.success,
      successRate: fusionResult.successRate,
      selectedRank: fusionResult.selectedRank,
      timestamp: fusionResult.timestamp
    };
    return this.generateSignature(signatureData);
  }
}

/**
 * CORS 설정 관리
 */
class CORSManager {
  constructor() {
    this.allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['*'];
    
    this.allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    this.allowedHeaders = [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-User-Id',
      'X-Session-Id',
      'X-Request-Id'
    ];
  }

  /**
   * CORS 헤더 설정
   * @param {Object} res - Express 응답 객체
   * @param {string} origin - 요청 Origin
   */
  setCORSHeaders(res, origin) {
    // Origin 검증
    const allowedOrigin = this.isOriginAllowed(origin) ? origin : this.allowedOrigins[0];
    
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', this.allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', this.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24시간
  }

  /**
   * Origin 허용 여부 확인
   * @param {string} origin - 요청 Origin
   * @returns {boolean} 허용 여부
   */
  isOriginAllowed(origin) {
    if (this.allowedOrigins.includes('*')) return true;
    return this.allowedOrigins.includes(origin);
  }
}

/**
 * 보안 미들웨어
 */
class SecurityMiddleware {
  constructor() {
    this.rateLimiter = new RateLimiter();
    this.signatureValidator = new SignatureValidator();
    this.corsManager = new CORSManager();
  }

  /**
   * 레이트리밋 미들웨어
   * @param {string} type - 요청 타입
   * @returns {Function} 미들웨어 함수
   */
  rateLimit(type = 'general') {
    return (req, res, next) => {
      const userId = req.headers['x-user-id'] || 'anonymous';
      const rateLimitResult = this.rateLimiter.checkRateLimit(userId, type);
      
      if (!rateLimitResult.allowed) {
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          details: {
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            resetTime: new Date(rateLimitResult.resetTime).toISOString()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // 레이트리밋 정보를 응답 헤더에 추가
      res.setHeader('X-RateLimit-Limit', rateLimitResult.limit);
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime);
      
      next();
    };
  }

  /**
   * CORS 미들웨어
   * @returns {Function} 미들웨어 함수
   */
  cors() {
    return (req, res, next) => {
      const origin = req.headers.origin;
      this.corsManager.setCORSHeaders(res, origin);
      
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
      
      next();
    };
  }

  /**
   * HMAC 서명 검증 미들웨어
   * @returns {Function} 미들웨어 함수
   */
  verifySignature() {
    return (req, res, next) => {
      const signature = req.headers['x-signature'];
      const timestamp = req.headers['x-timestamp'];
      
      if (!signature || !timestamp) {
        res.status(400).json({
          success: false,
          error: 'Missing signature or timestamp',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // 타임스탬프 검증 (5분 이내)
      const now = Date.now();
      const requestTime = parseInt(timestamp);
      if (Math.abs(now - requestTime) > 300000) { // 5분
        res.status(400).json({
          success: false,
          error: 'Request timestamp too old',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // 서명 검증
      const signatureData = {
        ...req.body,
        timestamp: requestTime
      };
      
      if (!this.signatureValidator.verifySignature(signatureData, signature)) {
        res.status(401).json({
          success: false,
          error: 'Invalid signature',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      next();
    };
  }
}

module.exports = {
  RateLimiter,
  SignatureValidator,
  CORSManager,
  SecurityMiddleware
};
