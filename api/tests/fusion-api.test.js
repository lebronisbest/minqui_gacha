// 조합 API 계약 테스트
const request = require('supertest');
const { pool } = require('../lib/database');

// API 서버 모킹 (실제 서버 없이 테스트)
const mockFusionAPI = (req, res) => {
  const { FusionFlow } = require('../lib/fusion-engine');
  const fusionEngine = new FusionFlow(pool);
  
  // 실제 API 로직 시뮬레이션
  return fusionEngine.executeFusion({
    userId: req.headers['x-user-id'],
    materials: req.body.materialCardIds || req.body.materials,
    fusionId: req.body.fusionId || `test-${Date.now()}`,
    userTier: 'bronze',
    pity: 0
  }).then(result => {
    res.status(200).json(result);
  }).catch(error => {
    res.status(500).json({
      success: false,
      error: error.message
    });
  });
};

describe('조합 API 계약 테스트', () => {
  test('API가 조합 엔진을 호출하는지 확인', async () => {
    const mockReq = {
      headers: { 'x-user-id': 'test-user' },
      body: { materialCardIds: ['card1', 'card2', 'card3'] }
    };
    
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await mockFusionAPI(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          fusionSuccess: expect.any(Boolean),
          successRate: expect.any(Number),
          engineVersion: '2.0.0',
          policyVersion: '1.0.0'
        })
      })
    );
  });

  test('응답에 필수 필드 포함 확인', async () => {
    const mockReq = {
      headers: { 'x-user-id': 'test-user' },
      body: { materialCardIds: ['card1', 'card2', 'card3'] }
    };
    
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await mockFusionAPI(mockReq, mockRes);

    const responseData = mockRes.json.mock.calls[0][0];
    
    // 필수 필드 검증
    expect(responseData.data).toHaveProperty('fusionSuccess');
    expect(responseData.data).toHaveProperty('successRate');
    expect(responseData.data).toHaveProperty('successRateBreakdown');
    expect(responseData.data).toHaveProperty('candidates');
    expect(responseData.data).toHaveProperty('selected');
    expect(responseData.data).toHaveProperty('engineVersion');
    expect(responseData.data).toHaveProperty('policyVersion');
    expect(responseData.data).toHaveProperty('materialsUsed');
  });

  test('성공률 분해 구조 검증', async () => {
    const mockReq = {
      headers: { 'x-user-id': 'test-user' },
      body: { materialCardIds: ['card1', 'card2', 'card3'] }
    };
    
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await mockFusionAPI(mockReq, mockRes);

    const responseData = mockRes.json.mock.calls[0][0];
    const breakdown = responseData.data.successRateBreakdown;
    
    expect(breakdown).toHaveProperty('base');
    expect(breakdown).toHaveProperty('card_bonus');
    expect(breakdown).toHaveProperty('pity_bonus');
    expect(breakdown).toHaveProperty('tier_bonus');
    expect(breakdown).toHaveProperty('recipe_bonus');
    expect(breakdown).toHaveProperty('material_count');
    expect(breakdown).toHaveProperty('pity_count');
  });
});

// E2E 테스트
describe('E2E 테스트', () => {
  test('더블클릭 방지 (멱등성)', async () => {
    const fusionId = 'test-idempotent';
    const mockReq = {
      headers: { 'x-user-id': 'test-user' },
      body: { materialCardIds: ['card1', 'card2', 'card3'], fusionId }
    };
    
    const mockRes1 = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    const mockRes2 = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // 첫 번째 요청
    await mockFusionAPI(mockReq, mockRes1);
    
    // 두 번째 요청 (같은 fusionId)
    await mockFusionAPI(mockReq, mockRes2);

    // 두 응답이 같아야 함 (멱등성)
    const response1 = mockRes1.json.mock.calls[0][0];
    const response2 = mockRes2.json.mock.calls[0][0];
    
    expect(response1.data.fusionSuccess).toBe(response2.data.fusionSuccess);
    expect(response1.data.successRate).toBe(response2.data.successRate);
  });

  test('네트워크 재시도 시나리오', async () => {
    const fusionId = 'test-retry';
    const mockReq = {
      headers: { 'x-user-id': 'test-user' },
      body: { materialCardIds: ['card1', 'card2', 'card3'], fusionId }
    };
    
    const responses = [];
    
    // 3번 재시도
    for (let i = 0; i < 3; i++) {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await mockFusionAPI(mockReq, mockRes);
      responses.push(mockRes.json.mock.calls[0][0]);
    }

    // 모든 응답이 동일해야 함
    responses.forEach((response, index) => {
      if (index > 0) {
        expect(response.data.fusionSuccess).toBe(responses[0].data.fusionSuccess);
        expect(response.data.successRate).toBe(responses[0].data.successRate);
      }
    });
  });
});

// 성능 테스트
describe('성능 테스트', () => {
  test('응답 시간 측정', async () => {
    const mockReq = {
      headers: { 'x-user-id': 'test-user' },
      body: { materialCardIds: ['card1', 'card2', 'card3'] }
    };
    
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    const startTime = Date.now();
    await mockFusionAPI(mockReq, mockRes);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    console.log(`응답 시간: ${responseTime}ms`);
    
    // 1초 이내 응답
    expect(responseTime).toBeLessThan(1000);
  });

  test('동시 요청 처리', async () => {
    const concurrentRequests = 10;
    const promises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      const mockReq = {
        headers: { 'x-user-id': `test-user-${i}` },
        body: { materialCardIds: ['card1', 'card2', 'card3'] }
      };
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      promises.push(mockFusionAPI(mockReq, mockRes));
    }
    
    const startTime = Date.now();
    await Promise.all(promises);
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    console.log(`${concurrentRequests}개 동시 요청 처리 시간: ${totalTime}ms`);
    
    // 5초 이내 처리
    expect(totalTime).toBeLessThan(5000);
  });
});
