// ====================================
// 카드 데이터 시드 스크립트
// ====================================
//
// ⚠️  중요: 이 스크립트는 카드 카탈로그만 업데이트합니다
//
// 🔒 보호되는 데이터 (절대 삭제하지 않음):
// - users (사용자 정보)
// - user_inventory (사용자 카드 컬렉션)
// - gacha_logs (가챠 기록)
// - fusion_logs (조합 기록)
// - audit_logs (감사 로그)
//
// 🔄 업데이트되는 데이터:
// - cards (카드 카탈로그 - 안전하게 재생성)
//
// ====================================

const { pool, runMigrations } = require('../lib/database');
const {
  safeCardReseed,
  generateDataStatusReport,
  validateTableOperation
} = require('../lib/data-protection');

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Id, X-Session-Id, X-Request-Id');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    // 🛡️ 데이터베이스 상태 확인 및 보고
    console.log('🔍 데이터베이스 상태 확인 중...');
    const statusReport = await generateDataStatusReport();
    console.log('📊 데이터베이스 현황:', {
      사용자수: statusReport.totalUsers,
      수집데이터: statusReport.totalCollections,
      가챠기록: statusReport.totalGachaLogs,
      조합기록: statusReport.totalFusionLogs,
      보호레벨: statusReport.protectionLevel
    });

    // 마이그레이션 실행
    await runMigrations();

    // 🔒 안전장치: cards 테이블 삭제 검증
    console.log('🛡️ 안전장치 검증 중...');
    await validateTableOperation('cards', 'DELETE');

    const client = await pool.connect();

    try {
      // 🔄 안전한 카드 데이터 재시드 실행
      console.log('🔄 안전한 카드 데이터 재시드 시작...');
      await safeCardReseed();
      console.log('✅ 카드 데이터 삭제 완료 (사용자 데이터는 보존됨)');

      // cards.json을 HTTP로 가져오기
      let cardsData;
      try {
        console.log('fetch API 사용 가능:', typeof fetch);

        const response = await fetch('https://minqui-gacha-game.vercel.app/cards.json');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const cardsJsonContent = await response.text();
        console.log('Response text length:', cardsJsonContent.length);
        console.log('Response text start:', cardsJsonContent.substring(0, 200));

        cardsData = JSON.parse(cardsJsonContent);
        console.log('파싱된 카드 수:', cardsData.cards?.length || 0);

        if (cardsData.cards && cardsData.cards.length > 0) {
          console.log('첫 번째 카드:', cardsData.cards[0]);
          if (cardsData.cards.length > 1) {
            console.log('두 번째 카드:', cardsData.cards[1]);
          }
        } else {
          throw new Error('cards.json에 카드 데이터가 없습니다.');
        }
      } catch (error) {
        console.error('cards.json 로드 실패:', error);
        // 폴백: 기본 카드 데이터
        cardsData = {
          cards: [
            {
              id: '001',
              name: '우정잉',
              type: 'Story',
              rank: 'SSS',
              baseHp: 130,
              baseAttack: 90,
              image: 'illust/010.png',
              holoPattern: 'crown',
              holoColor: '#ff6b6b',
              attacks: [{ name: '모든 잉모노의 신', description: '게임에서 즉시 승리한다.' }]
            },
            {
              id: '002',
              name: '오리 안경을 쓴 민킈',
              type: 'Innovation',
              rank: 'S',
              baseHp: 130,
              baseAttack: 140,
              image: 'illust/002.png',
              holoPattern: 'waves',
              holoColor: '#9c27b0',
              attacks: [{ name: '명사수', description: '공격은 반드시 명중한다' }]
            },
            {
              id: '003',
              name: '눈물 민킈',
              type: 'Art',
              rank: 'S',
              baseHp: 120,
              baseAttack: 100,
              image: 'illust/003.png',
              holoPattern: 'waves',
              holoColor: '#9c27b0',
              attacks: [{ name: '힝', description: '그냥 운다.' }]
            },
            {
              id: '004',
              name: '민킈 개발자',
              type: 'Tech',
              rank: 'A',
              baseHp: 100,
              baseAttack: 120,
              image: 'illust/004.png',
              holoPattern: 'sparkles',
              holoColor: '#2196f3',
              attacks: [{ name: '코딩 마법', description: '버그를 즉시 수정한다' }]
            },
            {
              id: '005',
              name: '민킈 디자이너',
              type: 'Design',
              rank: 'A',
              baseHp: 110,
              baseAttack: 110,
              image: 'illust/005.png',
              holoPattern: 'sparkles',
              holoColor: '#2196f3',
              attacks: [{ name: '아름다운 디자인', description: '모든 것을 예쁘게 만든다' }]
            }
          ]
        };
        console.log('폴백 카드 데이터 사용, 카드 수:', cardsData.cards.length);
      }

      // cards.json 형식을 데이터베이스 형식으로 변환
      console.log('변환 전 cardsData.cards 길이:', cardsData.cards.length);
      const cards = cardsData.cards.map(card => ({
        id: card.id,
        name: card.name,
        type: card.type,
        rank: card.rank,
        base_hp: card.baseHp || 100,
        base_attack: card.baseAttack || 100,
        image: card.image,
        attacks: JSON.stringify(card.attacks || []),
        holo_pattern: card.holoPattern || 'default',
        holo_color: card.holoColor || '#ffffff'
      }));

      for (const card of cards) {
        console.log(`카드 삽입 시도: ID=${card.id}, Name=${card.name}, Image=${card.image}`);
        try {
          await client.query(`
            INSERT INTO cards (id, name, type, rank, base_hp, base_attack, image, attacks, holo_pattern, holo_color)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING
          `, [
            card.id, card.name, card.type, card.rank, card.base_hp, 
            card.base_attack, card.image, card.attacks, card.holo_pattern, card.holo_color
          ]);
          console.log(`✅ 카드 삽입 성공: ID=${card.id}`);
        } catch (insertError) {
          console.error(`❌ 카드 삽입 실패: ID=${card.id}`, insertError.message);
        }
      }

      console.log(`총 ${cards.length}장의 카드가 시드되었습니다.`);

      // 실제 데이터베이스에 삽입된 카드 수 확인
      const countResult = await client.query('SELECT COUNT(*) as count FROM cards');
      const actualCount = parseInt(countResult.rows[0].count);
      console.log(`데이터베이스에 실제 저장된 카드 수: ${actualCount}`);

      // 🔒 최종 보호 확인: 사용자 데이터 안전성 검증
      const finalReport = await generateDataStatusReport();
      console.log('🛡️ 최종 안전성 검증:', {
        사용자데이터변경여부: finalReport.totalUsers === statusReport.totalUsers ? '변경없음✅' : '변경됨❌',
        수집데이터변경여부: finalReport.totalCollections === statusReport.totalCollections ? '변경없음✅' : '변경됨❌',
        카드카탈로그: `${actualCount}장 업데이트됨`
      });
      
      // 24, 25번 카드가 있는지 특별히 확인
      const card24 = await client.query('SELECT * FROM cards WHERE id = $1', ['024']);
      const card25 = await client.query('SELECT * FROM cards WHERE id = $1', ['025']);
      console.log(`024번 카드 존재: ${card24.rows.length > 0 ? 'YES' : 'NO'}`);
      console.log(`025번 카드 존재: ${card25.rows.length > 0 ? 'YES' : 'NO'}`);
      
      if (card24.rows.length > 0) {
        console.log(`024번 카드 정보:`, card24.rows[0]);
      }
      if (card25.rows.length > 0) {
        console.log(`025번 카드 정보:`, card25.rows[0]);
      }
      
      res.status(200).json({
        success: true,
        data: { 
          message: 'Card data seeded successfully', 
          count: cards.length,
          actualCount: actualCount,
          cards: cards.map(c => ({ id: c.id, name: c.name, rank: c.rank }))
        },
        timestamp: new Date().toISOString()
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Seed failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};
