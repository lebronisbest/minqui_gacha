// 조합 엔진 v3.0 - 클라이언트와 동일한 확률 계산
const crypto = require('crypto');

const ENGINE_VERSION = '3.0.0';

/**
 * 조합 확률 계산 엔진
 */
class FusionEngine {
  constructor(database) {
    this.db = database;
  }

  /**
   * 재료 카드들의 등급 분석
   */
  async analyzeMaterials(client, materialIds) {
    const result = await client.query(`
      SELECT id, rank FROM cards WHERE id = ANY($1)
    `, [materialIds]);

    return result.rows;
  }

  /**
   * 등급별 확률 계산 (클라이언트와 동일한 로직)
   */
  calculateProbabilities(materialCards) {
    // 1단계: 입력 카드 분석
    const rankDistribution = {};
    materialCards.forEach(card => {
      rankDistribution[card.rank] = (rankDistribution[card.rank] || 0) + 1;
    });
    const totalCards = materialCards.length;

    // 2단계: 기본 확률
    const baseProb = {
      'B': 0.50,
      'A': 0.30,
      'S': 0.15,
      'SS': 0.04,
      'SSS': 0.01
    };

    // 3단계: 등급 계층
    const rankHierarchy = { 'B': 1, 'A': 2, 'S': 3, 'SS': 4, 'SSS': 5 };
    const ranks = ['B', 'A', 'S', 'SS', 'SSS'];

    // 4단계: 각 등급별 최종 확률 계산
    const finalProb = {};

    for (const targetRank of ranks) {
      const targetLevel = rankHierarchy[targetRank];

      // targetRank 이상인 카드들의 개수
      let highRankCount = 0;
      for (const [rank, count] of Object.entries(rankDistribution)) {
        if (rankHierarchy[rank] >= targetLevel) {
          highRankCount += count;
        }
      }

      // 시너지 배율
      const synergy = Math.pow(highRankCount / totalCards, 0.5);

      // 최종 확률
      finalProb[targetRank] = baseProb[targetRank] * (1 + synergy * 2.0);
    }

    // 5단계: 정규화 (합이 1이 되도록)
    const total = Object.values(finalProb).reduce((sum, prob) => sum + prob, 0);
    const probabilities = {};
    for (const rank of ranks) {
      probabilities[rank] = finalProb[rank] / total;
    }

    return {
      probabilities,
      rankDistribution
    };
  }

  /**
   * 확률에 따라 결과 등급 선택
   */
  selectRank(probabilities) {
    const random = crypto.randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF;
    const ranks = ['B', 'A', 'S', 'SS', 'SSS'];

    let cumulative = 0;
    for (const rank of ranks) {
      cumulative += probabilities[rank];
      if (random <= cumulative) {
        return rank;
      }
    }

    // 폴백
    return 'B';
  }

  /**
   * 조합 실행
   */
  async executeFusion(params) {
    const {
      userId,
      materials,
      fusionId,
      sessionId = null
    } = params;

    console.log('🎯 FusionEngine v3.0 실행');
    console.log('재료:', materials);

    try {
      // DB 클라이언트는 commit.js에서 전달받아야 함
      // 여기서는 계산만 수행

      // 재료 카드 정보는 외부에서 조회해서 전달받음
      // 일단 placeholder
      const materialCards = [];

      // 확률 계산
      const { probabilities, rankDistribution } = this.calculateProbabilities(materialCards);

      // 결과 등급 선택
      const selectedRank = this.selectRank(probabilities);

      console.log('📊 계산된 확률:', probabilities);
      console.log('🎯 선택된 등급:', selectedRank);

      return {
        success: true,
        data: {
          fusionSuccess: true,
          selectedRank,
          probabilities,
          rankDistribution,
          materialsUsed: materials,
          engineVersion: ENGINE_VERSION,
          fusionId,
          timestamp: new Date().toISOString()
        },
        metadata: {
          engineVersion: ENGINE_VERSION,
          sessionId,
          requestId: fusionId
        }
      };

    } catch (error) {
      console.error('❌ FusionEngine 실패:', error);
      throw error;
    }
  }

  /**
   * HMAC 서명 생성
   */
  generateSignature(data, secret) {
    const payload = JSON.stringify(data);
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
}

module.exports = {
  FusionEngine,
  ENGINE_VERSION
};