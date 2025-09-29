// 조합 엔진 - 단일 진실 소스(SSOT)
const crypto = require('crypto');

// 엔진 버전 관리
const ENGINE_VERSION = '2.0.0';
const POLICY_VERSION = '1.0.0';

/**
 * 성공률 계산 전략
 */
class RateStrategy {
  constructor() {
    this.baseSuccessRate = 0.6; // 60% 기본 성공률
    this.maxBonusRate = 0.3; // 최대 30% 보너스
    this.cardBonusRate = 0.05; // 카드 1장당 5% 보너스
    this.minSuccessRate = 0.05; // 최소 5% 성공률
    this.maxSuccessRate = 0.95; // 최대 95% 성공률
  }

  /**
   * 성공률과 분해값 계산
   * @param {Object} params - 계산 파라미터
   * @param {Array} params.materials - 재료 카드 ID 배열
   * @param {Object} params.recipe - 레시피 정보 (선택사항)
   * @param {string} params.userTier - 사용자 등급
   * @param {number} params.pity - 피티 카운터
   * @returns {Object} 성공률과 분해값
   */
  calculateSuccessRate({ materials, recipe, userTier, pity = 0 }) {
    const materialCount = materials.length;
    
    // 기본 성공률
    const baseRate = this.baseSuccessRate;
    
    // 카드 수 보너스
    const cardBonus = Math.min(
      this.maxBonusRate, 
      materialCount * this.cardBonusRate
    );
    
    // 피티 보너스 (피티 10당 1% 추가, 최대 10%)
    const pityBonus = Math.min(0.1, pity * 0.01);
    
    // 사용자 등급 보너스
    const tierBonus = this.getTierBonus(userTier);
    
    // 레시피 보너스 (있다면)
    const recipeBonus = recipe ? this.getRecipeBonus(recipe) : 0;
    
    // 최종 성공률 계산
    const finalRate = Math.max(
      this.minSuccessRate,
      Math.min(
        this.maxSuccessRate,
        baseRate + cardBonus + pityBonus + tierBonus + recipeBonus
      )
    );
    
    return {
      rate: finalRate,
      breakdown: {
        base: baseRate,
        card_bonus: cardBonus,
        pity_bonus: pityBonus,
        tier_bonus: tierBonus,
        recipe_bonus: recipeBonus,
        material_count: materialCount,
        pity_count: pity
      }
    };
  }

  getTierBonus(userTier) {
    const tierBonuses = {
      'bronze': 0.0,
      'silver': 0.02,
      'gold': 0.05,
      'platinum': 0.08,
      'diamond': 0.12
    };
    return tierBonuses[userTier] || 0.0;
  }

  getRecipeBonus(recipe) {
    // 레시피별 보너스 (향후 확장 가능)
    return recipe.bonusRate || 0.0;
  }
}

/**
 * 결과 후보 결정 정책
 */
class OutcomePolicy {
  constructor() {
    this.rankWeights = {
      'A': 0.60,   // 60%
      'S': 0.30,   // 30%
      'SS': 0.08,  // 8%
      'SSS': 0.02  // 2%
    };
    
    this.rankMultipliers = {
      'A': { hp: 1.0, attack: 1.0 },
      'S': { hp: 1.2, attack: 1.2 },
      'SS': { hp: 1.5, attack: 1.5 },
      'SSS': { hp: 2.0, attack: 2.0 }
    };
  }

  /**
   * 결과 후보군과 가중치 생성
   * @param {Object} params - 정책 파라미터
   * @param {Array} params.materials - 재료 카드들
   * @param {boolean} params.isSuccess - 조합 성공 여부
   * @param {Object} params.recipe - 레시피 정보
   * @returns {Object} 후보군과 가중치
   */
  generateCandidates({ materials, isSuccess, recipe }) {
    if (!isSuccess) {
      return {
        candidates: [],
        weights: [],
        selected: null
      };
    }

    // 성공 시 등급별 후보 생성
    const candidates = [];
    const weights = [];
    
    for (const [rank, weight] of Object.entries(this.rankWeights)) {
      candidates.push({
        rank,
        weight,
        multiplier: this.rankMultipliers[rank]
      });
      weights.push(weight);
    }

    // 가중치 정규화
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    // 가중치 기반 선택
    const selected = this.selectByWeight(candidates, normalizedWeights);

    return {
      candidates,
      weights: normalizedWeights,
      selected
    };
  }

  selectByWeight(candidates, weights) {
    const random = crypto.randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF;
    let cumulative = 0;
    
    for (let i = 0; i < candidates.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return candidates[i];
      }
    }
    
    // 폴백: 마지막 후보
    return candidates[candidates.length - 1];
  }
}

/**
 * 조합 플로우 관리
 */
class FusionFlow {
  constructor(database) {
    this.db = database;
    this.rateStrategy = new RateStrategy();
    this.outcomePolicy = new OutcomePolicy();
  }

  /**
   * 조합 실행 (메인 플로우)
   * @param {Object} params - 조합 파라미터
   * @returns {Object} 조합 결과
   */
  async executeFusion(params) {
    const {
      userId,
      materials,
      fusionId,
      recipe = null,
      userTier = 'bronze',
      pity = 0,
      sessionId = null
    } = params;

    console.log('🎯 FusionEngine.executeFusion 시작');
    console.log('파라미터:', { userId, materials, fusionId, recipe, userTier, pity });

    try {
      // 1. 성공률 계산
      const rateResult = this.rateStrategy.calculateSuccessRate({
        materials,
        recipe,
        userTier,
        pity
      });

      console.log('📊 성공률 계산 완료:', rateResult);

      // 2. 성공/실패 판정
      const isSuccess = this.determineSuccess(rateResult.rate);
      console.log(`🎲 조합 결과: ${isSuccess ? '성공' : '실패'}`);

      // 3. 결과 후보 생성
      const outcomeResult = this.outcomePolicy.generateCandidates({
        materials,
        isSuccess,
        recipe
      });

      console.log('🎯 결과 후보 생성 완료:', outcomeResult);

      // 4. 결과 반환
      const result = {
        success: true,
        data: {
          fusionSuccess: isSuccess,
          successRate: rateResult.rate,
          successRateBreakdown: rateResult.breakdown,
          candidates: outcomeResult.candidates,
          selected: outcomeResult.selected,
          materialsUsed: materials,
          engineVersion: ENGINE_VERSION,
          policyVersion: POLICY_VERSION,
          fusionId,
          timestamp: new Date().toISOString()
        },
        metadata: {
          engineVersion: ENGINE_VERSION,
          policyVersion: POLICY_VERSION,
          sessionId,
          requestId: fusionId
        }
      };

      console.log('✅ FusionEngine.executeFusion 완료');
      return result;

    } catch (error) {
      console.error('❌ FusionEngine.executeFusion 실패:', error);
      throw error;
    }
  }

  /**
   * 성공/실패 판정
   * @param {number} successRate - 성공률 (0-1)
   * @returns {boolean} 성공 여부
   */
  determineSuccess(successRate) {
    const random = crypto.randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF;
    return random < successRate;
  }

  /**
   * HMAC 서명 생성 (공정성 검증용)
   * @param {Object} data - 서명할 데이터
   * @param {string} secret - 비밀키
   * @returns {string} HMAC 서명
   */
  generateSignature(data, secret) {
    const payload = JSON.stringify(data);
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * 엔진 버전 정보 반환
   */
  getVersionInfo() {
    return {
      engineVersion: ENGINE_VERSION,
      policyVersion: POLICY_VERSION,
      features: [
        'rate_calculation',
        'outcome_policy',
        'pity_system',
        'tier_bonus',
        'recipe_support'
      ]
    };
  }
}

module.exports = {
  FusionFlow,
  RateStrategy,
  OutcomePolicy,
  ENGINE_VERSION,
  POLICY_VERSION
};
