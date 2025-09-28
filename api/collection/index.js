// 컬렉션 조회 API
const { pool } = require('../lib/database');
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

  if (req.method !== 'GET') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User ID required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const client = await pool.connect();
    try {
      // 사용자 인벤토리 조회 (카드 넘버순으로 정렬)
      const result = await client.query(`
        SELECT
          ui.card_id,
          ui.count,
          ui.first_obtained_at,
          ui.last_obtained_at,
          c.name,
          c.type,
          c.rank,
          c.base_hp,
          c.base_attack,
          c.image,
          c.attacks
        FROM user_inventory ui
        JOIN cards c ON ui.card_id = c.id
        WHERE ui.user_id = $1
        ORDER BY c.id ASC
      `, [userId]);

      const collection = result.rows.map(row => {
        // attacks 필드가 이미 객체인지 문자열인지 확인
        let attacks = [];
        if (row.attacks) {
          if (typeof row.attacks === 'string') {
            try {
              attacks = JSON.parse(row.attacks);
            } catch (e) {
              console.warn(`컬렉션 카드 ${row.card_id}의 attacks 파싱 실패:`, e.message);
              attacks = [];
            }
          } else if (Array.isArray(row.attacks)) {
            attacks = row.attacks;
          }
        }

        return {
          id: row.card_id,
          name: row.name,
          type: row.type,
          rank: row.rank,
          baseHp: parseInt(row.base_hp),
          baseAttack: parseInt(row.base_attack),
          image: row.image,
          attacks: attacks,
          count: parseInt(row.count),
          firstObtainedAt: row.first_obtained_at,
          lastObtainedAt: row.last_obtained_at
        };
      });

      const response = {
        success: true,
        data: {
          collection,
          totalCards: collection.length,
          totalCount: collection.reduce((sum, card) => sum + card.count, 0)
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4()
      };

      res.status(200).json(response);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || uuidv4()
    });
  }
};
