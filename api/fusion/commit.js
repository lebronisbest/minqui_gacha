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
    console.log('=== FUSION COMMIT API 시작 ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('POSTGRES_URL 존재:', !!process.env.POSTGRES_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    const userId = req.headers['x-user-id'];
    console.log('User ID:', userId);
    
    if (!userId) {
      console.log('❌ User ID 없음');
      res.status(401).json({
        success: false,
        error: 'User ID required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { materials, materialCardIds, fusionId } = req.body;
    console.log('Materials:', materials);
    console.log('Material Card IDs:', materialCardIds);
    console.log('Fusion ID:', fusionId);
    
    // fusionId가 없으면 생성
    const finalFusionId = fusionId || `fusion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Final Fusion ID:', finalFusionId);
    
    const materialsToUse = materials || materialCardIds;
    console.log('Materials to use:', materialsToUse);
    
    if (!materialsToUse || !Array.isArray(materialsToUse) || materialsToUse.length < 3) {
      console.log('❌ 잘못된 재료:', materialsToUse);
      res.status(400).json({
        success: false,
        error: 'Invalid materials',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('🔗 데이터베이스 연결 시도...');
    console.log('Pool 상태:', {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    });
    
    if (!process.env.POSTGRES_URL) {
      console.log('❌ POSTGRES_URL 환경변수가 설정되지 않음');
      res.status(500).json({
        success: false,
        error: 'Database configuration missing',
        details: 'POSTGRES_URL environment variable is not set',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    const client = await pool.connect();
    console.log('✅ 데이터베이스 연결 성공');
    
    // 연결 테스트
    const testResult = await client.query('SELECT NOW() as current_time');
    console.log('데이터베이스 시간:', testResult.rows[0].current_time);
    
    try {
      // 사용자 인벤토리 확인
      console.log('📦 사용자 인벤토리 확인 중...');
      console.log('쿼리 파라미터:', { userId, materialsToUse });
      
      const inventoryResult = await client.query(`
        SELECT card_id, count
        FROM user_inventory
        WHERE user_id = $1 AND card_id = ANY($2)
      `, [userId, materialsToUse]);
      
      console.log('인벤토리 쿼리 결과:', inventoryResult.rows);
      console.log('쿼리 실행 시간:', inventoryResult.duration);

      const inventory = {};
      inventoryResult.rows.forEach(row => {
        inventory[row.card_id] = parseInt(row.count);
      });
      
      console.log('인벤토리 맵:', inventory);

      // 재료 충분한지 확인
      console.log('🔍 재료 충분성 확인 중...');
      for (const materialId of materialsToUse) {
        console.log(`재료 ${materialId}: 보유량 ${inventory[materialId] || 0}`);
        if (!inventory[materialId] || inventory[materialId] < 1) {
          console.log(`❌ 재료 부족: ${materialId}`);
          res.status(400).json({
            success: false,
            error: 'Insufficient materials',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }
      console.log('✅ 재료 충분함');

      // 기존 카드 중에서 랜덤 결과 선택 (임시)
      console.log('🎲 결과 카드 선택 중...');
      const cardsResult = await client.query(`
        SELECT id, name, type, rank, image
        FROM cards
        WHERE rank IN ('A', 'S', 'SS')
        ORDER BY RANDOM()
        LIMIT 1
      `);
      
      console.log('결과 카드 쿼리 결과:', cardsResult.rows);

      if (cardsResult.rows.length === 0) {
        console.log('❌ 결과 카드 없음');
        res.status(500).json({
          success: false,
          error: 'No fusion result available',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const resultCard = cardsResult.rows[0];
      console.log('✅ 선택된 결과 카드:', resultCard);

      // 인벤토리에서 재료 제거
      console.log('🗑️ 재료 제거 중...');
      for (const materialId of materialsToUse) {
        console.log(`재료 ${materialId} 제거 중...`);
        await client.query(`
          UPDATE user_inventory
          SET count = count - 1
          WHERE user_id = $1 AND card_id = $2
        `, [userId, materialId]);
        console.log(`✅ 재료 ${materialId} 제거 완료`);
      }

      // 결과 카드 추가
      console.log('➕ 결과 카드 추가 중...');
      await client.query(`
        INSERT INTO user_inventory (user_id, card_id, count)
        VALUES ($1, $2, 1)
        ON CONFLICT (user_id, card_id)
        DO UPDATE SET count = user_inventory.count + 1
      `, [userId, resultCard.id]);
      console.log('✅ 결과 카드 추가 완료');

      // 퓨전 로그 기록
      console.log('📝 퓨전 로그 기록 중...');
      await client.query(`
        INSERT INTO fusion_logs (user_id, fusion_id, materials_used, result_card, success)
        VALUES ($1, $2, $3, $4, true)
      `, [userId, finalFusionId, JSON.stringify(materialsToUse), JSON.stringify(resultCard)]);
      console.log('✅ 퓨전 로그 기록 완료');

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
    console.error('=== FUSION COMMIT ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error cause:', error.cause);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    console.error('Request headers:', JSON.stringify(req.headers, null, 2));
    console.error('User ID:', req.headers['x-user-id']);
    console.error('Session ID:', req.headers['x-session-id']);
    console.error('Environment check:', {
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      NODE_ENV: process.env.NODE_ENV,
      poolTotalCount: pool.totalCount,
      poolIdleCount: pool.idleCount
    });
    console.error('================================');
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      errorCode: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || uuidv4()
    });
  }
};
