// 조합 엔진 테스트
const { FusionFlow, RateStrategy, OutcomePolicy } = require('../lib/fusion-engine');

describe('조합 엔진 테스트', () => {
  let fusionEngine;
  let rateStrategy;
  let outcomePolicy;

  beforeEach(() => {
    fusionEngine = new FusionFlow(null); // DB 없이 테스트
    rateStrategy = new RateStrategy();
    outcomePolicy = new OutcomePolicy();
  });

  describe('RateStrategy 테스트', () => {
    test('기본 성공률 계산', () => {
      const result = rateStrategy.calculateSuccessRate({
        materials: ['card1', 'card2', 'card3'],
        userTier: 'bronze',
        pity: 0
      });

      expect(result.rate).toBeGreaterThanOrEqual(0.05);
      expect(result.rate).toBeLessThanOrEqual(0.95);
      expect(result.breakdown.base).toBe(0.6);
      expect(result.breakdown.card_bonus).toBe(0.15); // 3장 * 0.05
    });

    test('카드 수에 따른 보너스', () => {
      const result3 = rateStrategy.calculateSuccessRate({
        materials: ['card1', 'card2', 'card3'],
        userTier: 'bronze',
        pity: 0
      });

      const result7 = rateStrategy.calculateSuccessRate({
        materials: ['card1', 'card2', 'card3', 'card4', 'card5', 'card6', 'card7'],
        userTier: 'bronze',
        pity: 0
      });

      expect(result7.rate).toBeGreaterThan(result3.rate);
    });

    test('피티 보너스', () => {
      const result0 = rateStrategy.calculateSuccessRate({
        materials: ['card1', 'card2', 'card3'],
        userTier: 'bronze',
        pity: 0
      });

      const result10 = rateStrategy.calculateSuccessRate({
        materials: ['card1', 'card2', 'card3'],
        userTier: 'bronze',
        pity: 10
      });

      expect(result10.rate).toBeGreaterThan(result0.rate);
      expect(result10.breakdown.pity_bonus).toBe(0.1);
    });

    test('사용자 등급 보너스', () => {
      const bronze = rateStrategy.calculateSuccessRate({
        materials: ['card1', 'card2', 'card3'],
        userTier: 'bronze',
        pity: 0
      });

      const diamond = rateStrategy.calculateSuccessRate({
        materials: ['card1', 'card2', 'card3'],
        userTier: 'diamond',
        pity: 0
      });

      expect(diamond.rate).toBeGreaterThan(bronze.rate);
      expect(diamond.breakdown.tier_bonus).toBe(0.12);
    });
  });

  describe('OutcomePolicy 테스트', () => {
    test('성공 시 후보 생성', () => {
      const result = outcomePolicy.generateCandidates({
        materials: ['card1', 'card2', 'card3'],
        isSuccess: true
      });

      expect(result.candidates).toHaveLength(4); // A, S, SS, SSS
      expect(result.weights).toHaveLength(4);
      expect(result.selected).toBeDefined();
      expect(result.selected.rank).toMatch(/^(A|S|SS|SSS)$/);
    });

    test('실패 시 빈 결과', () => {
      const result = outcomePolicy.generateCandidates({
        materials: ['card1', 'card2', 'card3'],
        isSuccess: false
      });

      expect(result.candidates).toHaveLength(0);
      expect(result.weights).toHaveLength(0);
      expect(result.selected).toBeNull();
    });

    test('가중치 정규화', () => {
      const result = outcomePolicy.generateCandidates({
        materials: ['card1', 'card2', 'card3'],
        isSuccess: true
      });

      const totalWeight = result.weights.reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBeCloseTo(1.0, 5);
    });
  });

  describe('FusionFlow 테스트', () => {
    test('조합 실행 결과 구조', async () => {
      const result = await fusionEngine.executeFusion({
        userId: 'test-user',
        materials: ['card1', 'card2', 'card3'],
        fusionId: 'test-fusion-1',
        userTier: 'bronze',
        pity: 0
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.fusionSuccess).toBeDefined();
      expect(result.data.successRate).toBeDefined();
      expect(result.data.successRateBreakdown).toBeDefined();
      expect(result.data.candidates).toBeDefined();
      expect(result.data.selected).toBeDefined();
      expect(result.data.engineVersion).toBe('2.0.0');
      expect(result.data.policyVersion).toBe('1.0.0');
    });

    test('HMAC 서명 생성', () => {
      const data = {
        fusionId: 'test-1',
        userId: 'user-1',
        success: true,
        successRate: 0.8,
        selectedRank: 'SS',
        timestamp: new Date().toISOString()
      };

      const signature = fusionEngine.generateSignature(data, 'test-secret');
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[a-f0-9]{64}$/); // 64자리 hex
    });
  });
});

// 프로퍼티 테스트
describe('프로퍼티 테스트', () => {
  let fusionEngine;

  beforeEach(() => {
    fusionEngine = new FusionFlow(null);
  });

  test('같은 입력 → 같은 결과 (결정적)', async () => {
    const params = {
      userId: 'test-user',
      materials: ['card1', 'card2', 'card3'],
      fusionId: 'test-fusion-deterministic',
      userTier: 'bronze',
      pity: 0
    };

    // 여러 번 실행해도 성공률은 같아야 함
    const results = [];
    for (let i = 0; i < 10; i++) {
      const result = await fusionEngine.executeFusion(params);
      results.push(result.data.successRate);
    }

    // 모든 결과의 성공률이 같아야 함 (결정적)
    const firstRate = results[0];
    results.forEach(rate => {
      expect(rate).toBe(firstRate);
    });
  });

  test('성공률 범위 검증', async () => {
    const testCases = [
      { materials: ['card1'], userTier: 'bronze', pity: 0 },
      { materials: ['card1', 'card2', 'card3', 'card4', 'card5'], userTier: 'silver', pity: 5 },
      { materials: ['card1', 'card2', 'card3', 'card4', 'card5', 'card6', 'card7'], userTier: 'diamond', pity: 10 }
    ];

    for (const testCase of testCases) {
      const result = await fusionEngine.executeFusion({
        userId: 'test-user',
        materials: testCase.materials,
        fusionId: `test-${Date.now()}`,
        userTier: testCase.userTier,
        pity: testCase.pity
      });

      expect(result.data.successRate).toBeGreaterThanOrEqual(0.05);
      expect(result.data.successRate).toBeLessThanOrEqual(0.95);
    }
  });
});

// 시뮬레이션 테스트
describe('시뮬레이션 테스트', () => {
  let fusionEngine;

  beforeEach(() => {
    fusionEngine = new FusionFlow(null);
  });

  test('1000회 시뮬레이션 분포 검증', async () => {
    const simulationCount = 1000;
    const results = {
      success: 0,
      failure: 0,
      ranks: { A: 0, S: 0, SS: 0, SSS: 0 }
    };

    for (let i = 0; i < simulationCount; i++) {
      const result = await fusionEngine.executeFusion({
        userId: 'simulation-user',
        materials: ['card1', 'card2', 'card3'],
        fusionId: `sim-${i}`,
        userTier: 'bronze',
        pity: 0
      });

      if (result.data.fusionSuccess) {
        results.success++;
        if (result.data.selected) {
          results.ranks[result.data.selected.rank]++;
        }
      } else {
        results.failure++;
      }
    }

    const successRate = results.success / simulationCount;
    const expectedSuccessRate = 0.75; // 60% + 15% (3장 보너스)

    // 실제 성공률이 예상 성공률의 ±5% 범위 내에 있는지 확인
    expect(successRate).toBeGreaterThanOrEqual(expectedSuccessRate - 0.05);
    expect(successRate).toBeLessThanOrEqual(expectedSuccessRate + 0.05);

    console.log('시뮬레이션 결과:', {
      successRate: (successRate * 100).toFixed(1) + '%',
      expectedRate: (expectedSuccessRate * 100).toFixed(1) + '%',
      rankDistribution: results.ranks
    });
  });
});
