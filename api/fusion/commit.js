// 퓨전 커밋 API - 조합 엔진 v2.0
const { pool } = require('../lib/database');
const { v4: uuidv4 } = require('uuid');
const { FusionFlow } = require('../lib/fusion-engine');
const { SecurityMiddleware } = require('../lib/security');
const { FeatureFlagManager, CanaryMetrics } = require('../lib/feature-flags');
const crypto = require('crypto');

// 보안 미들웨어 및 Feature Flag 초기화
const security = new SecurityMiddleware();
const featureFlags = new FeatureFlagManager();
const metrics = new CanaryMetrics();

module.exports = async (req, res) => {
  // 🔒 보안 미들웨어 적용
  security.cors()(req, res, () => {
    // CORS는 이미 처리됨
  });
  
  // 레이트리밋 체크
  const userId = req.headers['x-user-id'];
  if (userId) {
    const rateLimitResult = security.rateLimiter.checkRateLimit(userId, 'fusion');
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
  }
  
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
      // 🔒 트랜잭션 시작 및 멱등성 체크
      await client.query('BEGIN');
      console.log('✅ 트랜잭션 시작');
      
      // 멱등성 체크: 이미 처리된 fusionId인지 확인
      const existingFusion = await client.query(`
        SELECT fusion_id, success, result_card, success_rate, engine_version
        FROM fusion_logs 
        WHERE fusion_id = $1
        FOR UPDATE
      `, [finalFusionId]);
      
      if (existingFusion.rows.length > 0) {
        console.log('🔄 멱등성: 이미 처리된 조합, 기존 결과 반환');
        await client.query('COMMIT');
        
        const existing = existingFusion.rows[0];
        res.status(200).json({
          success: true,
          data: {
            fusionSuccess: existing.success,
            resultCard: existing.result_card ? JSON.parse(existing.result_card) : null,
            materialsUsed: materialsToUse,
            successRate: parseFloat(existing.success_rate),
            engineVersion: existing.engine_version,
            isIdempotent: true
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || uuidv4()
        });
        return;
      }
      
      // 사용자 인벤토리 확인 (락과 함께)
      console.log('📦 사용자 인벤토리 확인 중...');
      console.log('쿼리 파라미터:', { userId, materialsToUse });
      
      const inventoryResult = await client.query(`
        SELECT card_id, count
        FROM user_inventory
        WHERE user_id = $1 AND card_id = ANY($2)
        FOR UPDATE
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
          await client.query('ROLLBACK');
          res.status(400).json({
            success: false,
            error: 'Insufficient materials',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }
      console.log('✅ 재료 충분함');

      // 🔧 Feature Flag 체크
      const useV2Engine = featureFlags.isEnabled('FUSION_ENGINE_V2', userId);
      const usePitySystem = featureFlags.isEnabled('PITY_SYSTEM', userId);

      console.log(`🚩 Feature Flags: V2=${useV2Engine}, Pity=${usePitySystem}`);

      // 조합 엔진 초기화 (v1, v2 모두에서 사용)
      const fusionEngine = new FusionFlow(pool);

      let isSuccess, finalSuccessRate, successRateBreakdown, engineResult;

      if (useV2Engine) {
        // 🔧 조합 엔진 v2.0 사용
        
        // 사용자 등급 및 피티 정보 조회
        const userTierResult = await client.query(`
          SELECT tier FROM user_tiers WHERE user_id = $1
        `, [userId]);
        const userTier = userTierResult.rows[0]?.tier || 'bronze';
        
        let pity = 0;
        if (usePitySystem) {
          const pityResult = await client.query(`
            SELECT fusion_pity_count FROM user_pity WHERE user_id = $1
          `, [userId]);
          pity = pityResult.rows[0]?.fusion_pity_count || 0;
        }
        
        console.log(`👤 사용자 정보: 등급=${userTier}, 피티=${pity}`);
        
        // 조합 엔진으로 성공률 및 결과 계산
        engineResult = await fusionEngine.executeFusion({
          userId,
          materials: materialsToUse,
          fusionId: finalFusionId,
          userTier,
          pity,
          sessionId: req.headers['x-session-id']
        });
        
        ({ fusionSuccess: isSuccess, successRate: finalSuccessRate, successRateBreakdown } = engineResult.data);
      } else {
        // 🔄 기존 v1.0 로직 (롤백용)
        const baseSuccessRate = 0.6;
        const bonusRate = Math.min(0.3, materialsToUse.length * 0.05);
        finalSuccessRate = baseSuccessRate + bonusRate;
        isSuccess = Math.random() < finalSuccessRate;
        successRateBreakdown = {
          base: baseSuccessRate,
          card_bonus: bonusRate,
          pity_bonus: 0,
          tier_bonus: 0,
          recipe_bonus: 0,
          material_count: materialsToUse.length,
          pity_count: 0
        };
        engineResult = {
          data: {
            fusionSuccess: isSuccess,
            successRate: finalSuccessRate,
            successRateBreakdown,
            candidates: [],
            selected: null,
            engineVersion: '1.0.0',
            policyVersion: '1.0.0'
          },
          metadata: {
            engineVersion: '1.0.0',
            policyVersion: '1.0.0'
          }
        };
      }
      
      console.log(`🎯 조합 성공률: ${(finalSuccessRate * 100).toFixed(1)}%`);
      console.log(`📊 성공률 분해:`, successRateBreakdown);
      console.log(`🎲 조합 결과: ${isSuccess ? '성공' : '실패'}`);
      
      // 📊 캔어리 지표 기록
      metrics.recordMetric('fusion_success_rate', isSuccess ? 1 : 0, { userId, engineVersion: engineResult.metadata.engineVersion });
      metrics.recordMetric('response_time', Date.now() - new Date().getTime(), { userId });

      // 인벤토리에서 재료 제거 (성공/실패 관계없이 항상 제거)
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

      let resultCard = null;

      if (isSuccess) {
        // 성공 시: 조합 엔진에서 선택된 등급으로 카드 선택
        const selectedOutcome = engineResult.data.selected;
        console.log('🎯 조합 엔진 선택 결과:', selectedOutcome);
        
        if (!selectedOutcome) {
          console.log('❌ 조합 엔진에서 결과 없음');
          res.status(500).json({
            success: false,
            error: 'No fusion result available',
            timestamp: new Date().toISOString()
          });
          return;
        }
        
        console.log('🎲 결과 카드 선택 중...');
        const cardsResult = await client.query(`
          SELECT id, name, type, rank, image, base_hp, base_attack
          FROM cards
          WHERE rank = $1
          ORDER BY RANDOM()
          LIMIT 1
        `, [selectedOutcome.rank]);

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

        const baseCard = cardsResult.rows[0];
        // 조합 엔진의 배율 적용
        resultCard = {
          ...baseCard,
          hp: Math.floor(baseCard.base_hp * selectedOutcome.multiplier.hp),
          attack: Math.floor(baseCard.base_attack * selectedOutcome.multiplier.attack)
        };
        console.log('✅ 선택된 결과 카드:', resultCard);

        // 결과 카드 추가
        console.log('➕ 결과 카드 추가 중...');
        await client.query(`
          INSERT INTO user_inventory (user_id, card_id, count)
          VALUES ($1, $2, 1)
          ON CONFLICT (user_id, card_id)
          DO UPDATE SET count = user_inventory.count + 1
        `, [userId, resultCard.id]);
        console.log('✅ 결과 카드 추가 완료');
      } else {
        console.log('💔 조합 실패 - 재료만 소모됨');
      }

      // 인벤토리 해시 계산 (변경 전후)
      const inventoryHashBefore = await client.query('SELECT calculate_inventory_hash($1) as hash', [userId]);
      const inventoryHashAfter = await client.query('SELECT calculate_inventory_hash($1) as hash', [userId]);
      
      // HMAC 서명 생성 (공정성 검증용)
      const signatureData = {
        fusionId: finalFusionId,
        userId,
        success: isSuccess,
        successRate: finalSuccessRate,
        selectedRank: resultCard?.rank || null,
        timestamp: new Date().toISOString()
      };
      const hmacSignature = fusionEngine.generateSignature(signatureData, process.env.HMAC_SECRET || 'default-secret');
      
      // 퓨전 로그 기록 (확장된 스키마)
      console.log('📝 퓨전 로그 기록 중...');
      await client.query(`
        INSERT INTO fusion_logs (
          user_id, fusion_id, materials_used, result_card, success,
          engine_version, policy_version, success_rate, success_rate_breakdown,
          candidates, selected_outcome, inventory_hash_before, inventory_hash_after,
          hmac_signature, processing_time_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        userId, 
        finalFusionId, 
        JSON.stringify(materialsToUse), 
        resultCard ? JSON.stringify(resultCard) : null, 
        isSuccess,
        engineResult.metadata.engineVersion,
        engineResult.metadata.policyVersion,
        finalSuccessRate,
        JSON.stringify(successRateBreakdown),
        JSON.stringify(engineResult.data.candidates),
        JSON.stringify(engineResult.data.selected),
        inventoryHashBefore.rows[0].hash,
        inventoryHashAfter.rows[0].hash,
        hmacSignature,
        Date.now() - new Date().getTime() // 처리 시간 (대략적)
      ]);
      console.log('✅ 퓨전 로그 기록 완료');

      // 피티 카운터 업데이트
      if (isSuccess) {
        await client.query(`
          INSERT INTO user_pity (user_id, fusion_pity_count, last_fusion_at)
          VALUES ($1, 0, NOW())
          ON CONFLICT (user_id) 
          DO UPDATE SET 
            fusion_pity_count = 0,
            last_fusion_at = NOW(),
            updated_at = NOW()
        `, [userId]);
      } else {
        await client.query(`
          INSERT INTO user_pity (user_id, fusion_pity_count, last_fusion_at)
          VALUES ($1, 1, NOW())
          ON CONFLICT (user_id) 
          DO UPDATE SET 
            fusion_pity_count = user_pity.fusion_pity_count + 1,
            last_fusion_at = NOW(),
            updated_at = NOW()
        `, [userId]);
      }

      const response = {
        success: true,
        data: {
          fusionSuccess: isSuccess,
          resultCard: resultCard,
          materialsUsed: materialsToUse,
          successRate: finalSuccessRate,
          successRateBreakdown: successRateBreakdown,
          candidates: engineResult.data.candidates,
          selected: engineResult.data.selected,
          engineVersion: engineResult.metadata.engineVersion,
          policyVersion: engineResult.metadata.policyVersion,
          hmacSignature: hmacSignature
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4()
      };

      // 🔒 트랜잭션 커밋
      await client.query('COMMIT');
      console.log('✅ 트랜잭션 커밋 완료');
      
      res.status(200).json(response);
    } catch (transactionError) {
      // 🔒 트랜잭션 롤백
      await client.query('ROLLBACK');
      console.error('❌ 트랜잭션 롤백:', transactionError);
      throw transactionError;
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
