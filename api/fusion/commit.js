// 퓨전 커밋 API
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
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User ID required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { materials, materialCardIds, fusionId } = req.body;
    const materialsToUse = materials || materialCardIds;
    if (!materialsToUse || !Array.isArray(materialsToUse) || materialsToUse.length < 3) {
      res.status(400).json({
        success: false,
        error: 'Invalid materials',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const client = await pool.connect();
    try {
      // 사용자 인벤토리 확인
      const inventoryResult = await client.query(`
        SELECT card_id, count
        FROM user_inventory
        WHERE user_id = $1 AND card_id = ANY($2)
      `, [userId, materialsToUse]);

      const inventory = {};
      inventoryResult.rows.forEach(row => {
        inventory[row.card_id] = parseInt(row.count);
      });

      // 재료 충분한지 확인
      for (const materialId of materialsToUse) {
        if (!inventory[materialId] || inventory[materialId] < 1) {
          res.status(400).json({
            success: false,
            error: 'Insufficient materials',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      // 퓨전 결과 생성 (간단한 로직)
      const resultCard = {
        id: 'fusion_' + Date.now(),
        name: '퓨전 카드',
        type: 'Fusion',
        rank: 'A',
        image: 'illust/fusion.png'
      };

      // 인벤토리에서 재료 제거
      for (const materialId of materialsToUse) {
        await client.query(`
          UPDATE user_inventory
          SET count = count - 1
          WHERE user_id = $1 AND card_id = $2
        `, [userId, materialId]);
      }

      // 결과 카드 추가
      await client.query(`
        INSERT INTO user_inventory (user_id, card_id, count)
        VALUES ($1, $2, 1)
        ON CONFLICT (user_id, card_id)
        DO UPDATE SET count = user_inventory.count + 1
      `, [userId, resultCard.id]);

      // 퓨전 로그 기록
      await client.query(`
        INSERT INTO fusion_logs (user_id, fusion_id, materials_used, result_card, success)
        VALUES ($1, $2, $3, $4, true)
      `, [userId, fusionId, JSON.stringify(materialsToUse), JSON.stringify(resultCard)]);

      const response = {
        success: true,
        data: {
          resultCard,
          materialsUsed: materialsToUse
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4()
      };

      res.status(200).json(response);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Fusion commit error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || uuidv4()
    });
  }
};
