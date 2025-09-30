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
    await client.query('BEGIN');

    // 멱등성 체크
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

    // 조합 엔진으로 확률 계산 및 결과 선택
    const fusionEngine = new FusionEngine(pool);
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

    // 로그 기록
    await client.query(
      `INSERT INTO fusion_logs (user_id, fusion_id, materials_used, result_card, probabilities, rank_distribution, engine_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        finalFusionId,
        JSON.stringify(materialsToUse),
        JSON.stringify(resultCard),
        JSON.stringify(probabilities),
        JSON.stringify(rankDistribution),
        '3.0.0'
      ]
    );

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
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  } finally {
    client.release();
  }
};