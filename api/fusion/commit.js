// 조합 커밋 API - v3.0
const { pool } = require('../lib/database');
const { v4: uuidv4 } = require('uuid');
const { FusionEngine } = require('../lib/fusion-engine');
const { SecurityMiddleware } = require('../lib/security');

const security = new SecurityMiddleware();

module.exports = async (req, res) => {
  security.cors()(req, res, () => {});

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const userId = req.headers['x-user-id'];
  if (!userId) {
    res.status(401).json({ success: false, error: 'User ID required' });
    return;
  }

  // 레이트리밋 체크
  const rateLimitResult = security.rateLimiter.checkRateLimit(userId, 'fusion');
  if (!rateLimitResult.allowed) {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      details: {
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetTime: new Date(rateLimitResult.resetTime).toISOString()
      }
    });
    return;
  }

  const { materials, materialCardIds, fusionId } = req.body;
  const materialsToUse = materials || materialCardIds;
  const finalFusionId = fusionId || `fusion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  if (!materialsToUse || !Array.isArray(materialsToUse) || materialsToUse.length < 3) {
    res.status(400).json({ success: false, error: 'Invalid materials' });
    return;
  }

  console.log('=== FUSION COMMIT v3.0 ===');
  console.log('User ID:', userId);
  console.log('Materials:', materialsToUse);

  const client = await pool.connect();

  try {
    // 먼저 필요한 컬럼이 있는지 확인하고 없으면 추가
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'fusion_logs' 
      AND column_name IN ('probabilities', 'rank_distribution', 'engine_version')
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    
    // 필요한 컬럼이 없으면 추가
    if (!existingColumns.includes('probabilities') || 
        !existingColumns.includes('rank_distribution') || 
        !existingColumns.includes('engine_version')) {
      console.log('🔄 fusion_logs 테이블에 필요한 컬럼 추가 중...');
      await client.query(`
        ALTER TABLE fusion_logs 
        ADD COLUMN IF NOT EXISTS probabilities JSONB,
        ADD COLUMN IF NOT EXISTS rank_distribution JSONB,
        ADD COLUMN IF NOT EXISTS engine_version VARCHAR(10) DEFAULT '3.0.0'
      `);
      console.log('✅ 컬럼 추가 완료');
    }

    await client.query('BEGIN');

    // 멱등성 체크 (동적 쿼리)
    const existingFusion = await client.query(
      'SELECT result_card, probabilities FROM fusion_logs WHERE fusion_id = $1',
      [finalFusionId]
    );

    if (existingFusion.rows.length > 0) {
      await client.query('COMMIT');
      const existing = existingFusion.rows[0];
      res.status(200).json({
        success: true,
        data: {
          fusionSuccess: true,
          resultCard: existing.result_card ? JSON.parse(existing.result_card) : null,
          probabilities: existing.probabilities ? JSON.parse(existing.probabilities) : null,
          isIdempotent: true
        }
      });
      return;
    }

    // 인벤토리 확인
    const inventoryResult = await client.query(
      'SELECT card_id, count FROM user_inventory WHERE user_id = $1 AND card_id = ANY($2) FOR UPDATE',
      [userId, materialsToUse]
    );

    const inventory = {};
    inventoryResult.rows.forEach(row => {
      inventory[row.card_id] = parseInt(row.count);
    });

    for (const materialId of materialsToUse) {
      if (!inventory[materialId] || inventory[materialId] < 1) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: 'Insufficient materials' });
        return;
      }
    }

    // 재료 카드 정보 조회
    const materialCardsResult = await client.query(
      'SELECT id, rank FROM cards WHERE id = ANY($1)',
      [materialsToUse]
    );

    const materialCards = materialCardsResult.rows;

    console.log('재료 카드 정보:', materialCards);

    // 조합 엔진으로 확률 계산 및 결과 선택
    const fusionEngine = new FusionEngine();
    const { probabilities, rankDistribution } = fusionEngine.calculateProbabilities(materialCards);
    const selectedRank = fusionEngine.selectRank(probabilities);

    console.log('📊 확률:', probabilities);
    console.log('🎯 선택된 등급:', selectedRank);

    // 재료 제거
    for (const materialId of materialsToUse) {
      await client.query(
        'UPDATE user_inventory SET count = count - 1 WHERE user_id = $1 AND card_id = $2',
        [userId, materialId]
      );
    }

    // 결과 카드 선택
    const resultCardQuery = await client.query(
      'SELECT id, name, type, rank, image, base_hp, base_attack FROM cards WHERE rank = $1 ORDER BY RANDOM() LIMIT 1',
      [selectedRank]
    );

    if (resultCardQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(500).json({ success: false, error: 'No result card available' });
      return;
    }

    const baseCard = resultCardQuery.rows[0];
    const resultCard = {
      ...baseCard,
      hp: baseCard.base_hp,
      attack: baseCard.base_attack
    };

    // 결과 카드 추가
    await client.query(
      `INSERT INTO user_inventory (user_id, card_id, count)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, card_id)
       DO UPDATE SET count = user_inventory.count + 1`,
      [userId, resultCard.id]
    );

    // 로그 기록 (동적 쿼리 - 컬럼 존재 여부에 따라)
    const hasNewColumns = existingColumns.includes('probabilities') && 
                         existingColumns.includes('rank_distribution') && 
                         existingColumns.includes('engine_version');
    
    if (hasNewColumns) {
      // v3.0 스키마 - 모든 컬럼 포함
      await client.query(
        `INSERT INTO fusion_logs (user_id, fusion_id, materials_used, result_card, probabilities, rank_distribution, engine_version, success)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          finalFusionId,
          JSON.stringify(materialsToUse),
          JSON.stringify(resultCard),
          JSON.stringify(probabilities),
          JSON.stringify(rankDistribution),
          '3.0.0',
          true
        ]
      );
    } else {
      // v1.0 스키마 - 기본 컬럼만
      await client.query(
        `INSERT INTO fusion_logs (user_id, fusion_id, materials_used, result_card, success)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          finalFusionId,
          JSON.stringify(materialsToUse),
          JSON.stringify(resultCard),
          true
        ]
      );
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: {
        fusionSuccess: true,
        resultCard: resultCard,
        probabilities: probabilities,
        rankDistribution: rankDistribution,
        materialsUsed: materialsToUse,
        engineVersion: '3.0.0',
        fusionId: finalFusionId
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('=== FUSION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  } finally {
    client.release();
  }
};