// 카탈로그 조회 API
const { pool } = require('../lib/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Id, X-Session-Id, X-Request-Id');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    // 환경 변수 로깅
    console.log('POSTGRES_URL 존재:', !!process.env.POSTGRES_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // 데이터베이스 연결 확인
    if (!process.env.POSTGRES_URL) {
      throw new Error('POSTGRES_URL 환경 변수가 설정되지 않았습니다.');
    }
    
    console.log('데이터베이스 연결 시도 중...');
    const client = await pool.connect();
    console.log('데이터베이스 연결 성공');
    try {
      // 전체 카드 데이터 조회 (컬렉션 표시용)
      console.log('카드 데이터 조회 시작...');
      const result = await client.query(`
        SELECT id, name, type, rank, base_hp, base_attack, image, attacks, holo_pattern, holo_color, created_at, updated_at
        FROM cards
        ORDER BY id ASC
      `);
      console.log('카드 데이터 조회 완료, 행 수:', result.rows.length);

      const cards = result.rows.map(row => {
        const card = {
          id: row.id,
          name: row.name,
          type: row.type,
          rank: row.rank,
          baseHp: parseInt(row.base_hp),
          baseAttack: parseInt(row.base_attack),
          image: row.image,
          attacks: JSON.parse(row.attacks || '[]'),
          holoPattern: row.holo_pattern,
          holoColor: row.holo_color
        };
        console.log(`카드 처리됨: ID=${card.id}, Name=${card.name}, Image=${card.image}`);
        return card;
      });
      
      console.log('처리된 카드 목록:');
      cards.forEach((card, index) => {
        console.log(`${index + 1}. ID: ${card.id}, Name: ${card.name}, Image: ${card.image}`);
      });

      // 카탈로그 버전 및 해시 생성
      const catalogData = JSON.stringify(cards);
      const hash = crypto.createHash('sha256').update(catalogData).digest('hex');
      const version = `v${Date.now()}`;

      // 가챠 확률 정보 (현실적인 확률)
      const ranks = {
        'SSS': {
          name: 'SSS등급',
          probability: 0.5,
          hpMultiplier: 2.0,
          attackMultiplier: 2.0,
          color: '#ff6b6b',
          emoji: '👑'
        },
        'SS': {
          name: 'SS등급',
          probability: 2.0,
          hpMultiplier: 1.8,
          attackMultiplier: 1.8,
          color: '#ffa500',
          emoji: '🌟'
        },
        'S': {
          name: 'S등급',
          probability: 8.0,
          hpMultiplier: 1.5,
          attackMultiplier: 1.5,
          color: '#9c27b0',
          emoji: '⭐'
        },
        'A': {
          name: 'A등급',
          probability: 25.0,
          hpMultiplier: 1.2,
          attackMultiplier: 1.2,
          color: '#2196f3',
          emoji: '✨'
        },
        'B': {
          name: 'B등급',
          probability: 64.5,
          hpMultiplier: 1.0,
          attackMultiplier: 1.0,
          color: '#4caf50',
          emoji: '💫'
        }
      };

      // 타입별 아이콘 정보
      const typeIcons = {
        "Creator": "🎨",
        "Art": "🖼️",
        "Tech": "💻",
        "Story": "📚",
        "Design": "🎨",
        "Idea": "💡",
        "Team": "🤝",
        "Innovation": "🚀",
        "Shopping": "🛒",
        "Transport": "🚗",
        "Gaming": "🎮",
        "Work": "💼",
        "Food": "🍜",
        "Sports": "⚽",
        "Magic": "✨",
        "Adventure": "🗡️",
        "Music": "🎵",
        "Fashion": "👗",
        "Holiday": "🎄"
      };

      const catalogResponse = {
        version,
        hash,
        cards,
        ranks,
        typeIcons,
        lastUpdated: new Date().toISOString()
      };

      const response = {
        success: true,
        data: catalogResponse,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4()
      };

      res.status(200).json(response);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get catalog error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    
    // 에러 타입에 따른 적절한 응답
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.message.includes('POSTGRES_URL')) {
      statusCode = 503;
      errorMessage = 'Database not configured';
    } else if (error.message.includes('connection')) {
      statusCode = 503;
      errorMessage = 'Database connection failed';
    } else if (error.message.includes('relation "cards" does not exist')) {
      statusCode = 503;
      errorMessage = 'Database not initialized';
    } else if (error.code === 'ECONNREFUSED') {
      statusCode = 503;
      errorMessage = 'Database connection refused';
    } else if (error.code === 'ENOTFOUND') {
      statusCode = 503;
      errorMessage = 'Database host not found';
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: error.message,
      errorCode: error.code,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || uuidv4()
    });
  }
};
