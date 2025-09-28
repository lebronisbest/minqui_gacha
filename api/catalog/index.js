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
    const client = await pool.connect();
    try {
      // 카드 메타데이터만 조회 (상세 스탯은 서버에서만 관리)
      const result = await client.query(`
        SELECT id, name, type, rank, image, created_at, updated_at
        FROM cards 
        ORDER BY id ASC
      `);

      const cards = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        rank: row.rank,
        image: row.image
      }));

      // 카탈로그 버전 및 해시 생성
      const catalogData = JSON.stringify(cards);
      const hash = crypto.createHash('sha256').update(catalogData).digest('hex');
      const version = `v${Date.now()}`;

      // 가챠 확률 정보 (현실적인 확률)
      const ranks = {
        'SSS': { probability: 0.5, color: '#ff6b6b', name: 'SSS', emoji: '👑' },
        'SS': { probability: 2.0, color: '#ff8e8e', name: 'SS', emoji: '💎' },
        'S': { probability: 8.0, color: '#9c27b0', name: 'S', emoji: '⭐' },
        'A': { probability: 25.0, color: '#2196f3', name: 'A', emoji: '🔵' },
        'B': { probability: 64.5, color: '#4caf50', name: 'B', emoji: '🟢' }
      };

      // 타입별 설정 정보
      const types = {
        'Story': { 
          color: '#ff6b6b', 
          name: 'Story',
          description: '이야기 카드',
          icon: '📖'
        },
        'Innovation': { 
          color: '#9c27b0', 
          name: 'Innovation',
          description: '혁신 카드',
          icon: '💡'
        },
        'Art': { 
          color: '#ff9800', 
          name: 'Art',
          description: '예술 카드',
          icon: '🎨'
        },
        'Tech': { 
          color: '#2196f3', 
          name: 'Tech',
          description: '기술 카드',
          icon: '⚙️'
        }
      };

      const catalogResponse = {
        version,
        hash,
        cards,
        ranks,
        types,
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
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || uuidv4()
    });
  }
};
