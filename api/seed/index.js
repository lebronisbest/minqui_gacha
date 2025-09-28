// 카드 데이터 시드 스크립트
const { pool, runMigrations } = require('../lib/database');

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
    // 마이그레이션 실행
    await runMigrations();

    const client = await pool.connect();
    
    try {
      // 관련 테이블 데이터 삭제 후 카드 삭제
      await client.query('DELETE FROM user_inventory');
      await client.query('DELETE FROM gacha_logs');
      await client.query('DELETE FROM fusion_logs');
      await client.query('DELETE FROM audit_logs');
      await client.query('DELETE FROM cards');
      console.log('기존 데이터 삭제됨');

      // cards.json에서 모든 카드 데이터 로드
      const fs = require('fs');
      const path = require('path');
      
      let cardsData;
      try {
        // 여러 경로 시도
        const possiblePaths = [
          path.join(__dirname, '../../../cards.json'),
          path.join(__dirname, '../../cards.json'),
          path.join(__dirname, '../cards.json'),
          '/var/task/cards.json'
        ];
        
        let cardsJsonContent = null;
        for (const cardsJsonPath of possiblePaths) {
          try {
            console.log('시도하는 경로:', cardsJsonPath);
            cardsJsonContent = fs.readFileSync(cardsJsonPath, 'utf8');
            console.log('cards.json 로드 성공:', cardsJsonPath);
            break;
          } catch (err) {
            console.log('경로 실패:', cardsJsonPath, err.message);
          }
        }
        
        if (!cardsJsonContent) {
          throw new Error('cards.json을 찾을 수 없습니다');
        }
        
        cardsData = JSON.parse(cardsJsonContent);
        console.log('파싱된 카드 수:', cardsData.cards?.length || 0);
      } catch (error) {
        console.error('cards.json 로드 실패:', error);
        // 폴백: 기본 카드 5장
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
            }
          ]
        };
      }

      // cards.json 형식을 데이터베이스 형식으로 변환
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
        await client.query(`
          INSERT INTO cards (id, name, type, rank, base_hp, base_attack, image, attacks, holo_pattern, holo_color)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [
          card.id, card.name, card.type, card.rank, card.base_hp, 
          card.base_attack, card.image, card.attacks, card.holo_pattern, card.holo_color
        ]);
      }

      console.log(`총 ${cards.length}장의 카드가 시드되었습니다.`);
      
      res.status(200).json({
        success: true,
        data: { 
          message: 'Card data seeded successfully', 
          count: cards.length,
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
