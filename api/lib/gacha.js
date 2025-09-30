// 가챠 서비스 - Vercel Functions용
const { pool, getRedisClient } = require('./database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class GachaService {
  constructor() {
    this.RANK_WEIGHTS = {
      'SSS': 0.01,
      'SS': 0.04,
      'S': 0.15,
      'A': 0.30,
      'B': 0.50
    };

    this.RANK_MULTIPLIERS = {
      'SSS': { hp: 2.0, attack: 2.0 },
      'SS': { hp: 1.8, attack: 1.8 },
      'S': { hp: 1.5, attack: 1.5 },
      'A': { hp: 1.2, attack: 1.2 },
      'B': { hp: 1.0, attack: 1.0 }
    };
  }

  // 서버에서 안전한 난수 생성
  generateSecureRandom() {
    const buffer = crypto.randomBytes(4);
    return buffer.readUInt32BE(0) / 0xFFFFFFFF;
  }

  // 가챠 실행
  async performGacha(context) {
    console.log('🎰 가챠 실행 시작');
    const client = await pool.connect();
    console.log('✅ 데이터베이스 연결 성공');
    
    try {
      await client.query('BEGIN');
      console.log('✅ 트랜잭션 시작');

      // 1. 사용자 티켓 확인 및 차감
      console.log('🎫 티켓 확인 및 차감 중...');
      const ticketResult = await this.consumeTicket(client, context.userId);
      console.log('티켓 결과:', ticketResult);
      
      if (!ticketResult.success) {
        console.log('❌ 티켓 부족');
        await client.query('ROLLBACK');
        return {
          success: false,
          cards: [],
          ticketsRemaining: ticketResult.remaining,
          nextRefillAt: ticketResult.nextRefillAt,
          drawId: ''
        };
      }
      console.log('✅ 티켓 차감 완료');

      // 2. 서버에서 확률 계산 및 카드 선택
      console.log('🎲 카드 선택 중...');
      const selectedCard = await this.selectCardByProbability(client);
      console.log('선택된 카드:', selectedCard);
      const drawId = uuidv4();

      // 3. 카드 결과 생성
      const cardResult = {
        card: selectedCard,
        rank: selectedCard.rank,
        hp: Math.floor(selectedCard.base_hp * this.RANK_MULTIPLIERS[selectedCard.rank].hp),
        attack: Math.floor(selectedCard.base_attack * this.RANK_MULTIPLIERS[selectedCard.rank].attack),
        drawId,
        timestamp: new Date().toISOString()
      };
      console.log('카드 결과:', cardResult);

      // 4. 인벤토리에 카드 추가
      console.log('📦 인벤토리에 카드 추가 중...');
      await this.addCardToInventory(client, context.userId, selectedCard.id);
      console.log('✅ 인벤토리 추가 완료');

      // 5. 가챠 로그 기록
      console.log('📝 가챠 로그 기록 중...');
      await this.logGachaDraw(client, context, drawId, [cardResult], ticketResult.remaining);
      console.log('✅ 가챠 로그 기록 완료');

      // 6. 다음 티켓 충전 시간 계산
      const nextRefillAt = await this.calculateNextRefillTime();

      await client.query('COMMIT');
      console.log('✅ 트랜잭션 커밋 완료');

      return {
        success: true,
        cards: [cardResult],
        ticketsRemaining: ticketResult.remaining,
        nextRefillAt,
        drawId
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Gacha draw failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // 티켓 소모
  async consumeTicket(client, userId) {
    const redis = await getRedisClient();
    const ticketKey = `tickets:${userId}`;
    
    // Redis에서 현재 티켓 수 확인
    const currentTickets = await redis.get(ticketKey);
    const tickets = currentTickets ? parseInt(currentTickets) : parseInt(process.env.MAX_TICKETS || '10');

    if (tickets <= 0) {
      const nextRefillAt = await this.calculateNextRefillTime();
      return {
        success: false,
        remaining: tickets,
        nextRefillAt
      };
    }

    // 티켓 차감
    const newTicketCount = tickets - 1;
    await redis.set(ticketKey, newTicketCount.toString());
    
    // 티켓 만료 시간 설정 (12시간)
    const refillHours = parseInt(process.env.TICKET_REFILL_HOURS || '12');
    await redis.expire(ticketKey, refillHours * 3600);

    const nextRefillAt = await this.calculateNextRefillTime();

    return {
      success: true,
      remaining: newTicketCount,
      nextRefillAt
    };
  }

  // 확률 기반 카드 선택
  async selectCardByProbability(client) {
    const random = this.generateSecureRandom();
    let cumulativeProbability = 0;

    // 랭크 선택
    let selectedRank = 'B';
    for (const [rank, probability] of Object.entries(this.RANK_WEIGHTS)) {
      cumulativeProbability += probability;
      if (random <= cumulativeProbability) {
        selectedRank = rank;
        break;
      }
    }

    // 해당 랭크의 카드 중에서 랜덤 선택
    const result = await client.query(
      'SELECT * FROM cards WHERE rank = $1 ORDER BY RANDOM() LIMIT 1',
      [selectedRank]
    );

    if (result.rows.length === 0) {
      // 폴백: 첫 번째 카드 반환
      const fallbackResult = await client.query('SELECT * FROM cards LIMIT 1');
      return fallbackResult.rows[0];
    }

    return result.rows[0];
  }

  // 인벤토리에 카드 추가
  async addCardToInventory(client, userId, cardId) {
    await client.query(`
      INSERT INTO user_inventory (user_id, card_id, count, last_obtained_at)
      VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, card_id)
      DO UPDATE SET 
        count = user_inventory.count + 1,
        last_obtained_at = CURRENT_TIMESTAMP
    `, [userId, cardId]);
  }

  // 가챠 로그 기록
  async logGachaDraw(client, context, drawId, cards, ticketsRemaining) {
    await client.query(`
      INSERT INTO gacha_logs (user_id, draw_id, cards_drawn, tickets_used, tickets_remaining, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      context.userId,
      drawId,
      JSON.stringify(cards),
      1,
      ticketsRemaining,
      context.ipAddress,
      context.userAgent
    ]);

    // 감사 로그
    await client.query(`
      INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent, request_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      context.userId,
      'GACHA_DRAW',
      JSON.stringify({ drawId, cardsCount: cards.length }),
      context.ipAddress,
      context.userAgent,
      context.requestId
    ]);
  }

  // 다음 티켓 충전 시간 계산
  async calculateNextRefillTime() {
    // 현재 UTC 시간
    const now = new Date();
    console.log('현재 UTC 시간:', now.toISOString());

    // 한국 시간으로 현재 시간 계산 (UTC+9)
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    console.log('KST 시간 (UTC 표현):', kstNow.toISOString());

    // 한국 시간 기준으로 오늘 12시를 UTC로 계산
    const kstYear = kstNow.getUTCFullYear();
    const kstMonth = kstNow.getUTCMonth();
    const kstDate = kstNow.getUTCDate();
    const kstHour = kstNow.getUTCHours();
    console.log('KST Hour:', kstHour);

    // UTC로 한국 시간 12시 계산 (UTC 03:00 = KST 12:00)
    let nextRefillUTC = new Date(Date.UTC(kstYear, kstMonth, kstDate, 3, 0, 0, 0));
    console.log('오늘 12시 UTC:', nextRefillUTC.toISOString());

    // 현재 한국 시간이 이미 12시를 넘었다면 내일 12시(UTC 03:00)
    if (kstHour >= 12) {
      nextRefillUTC = new Date(nextRefillUTC.getTime() + 24 * 60 * 60 * 1000);
      console.log('내일 12시로 변경:', nextRefillUTC.toISOString());
    }

    return nextRefillUTC.toISOString();
  }

  // 사용자 티켓 정보 조회
  async getTicketInfo(userId) {
    const redis = await getRedisClient();
    const ticketKey = `tickets:${userId}`;
    const currentTickets = await redis.get(ticketKey);
    const tickets = currentTickets ? parseInt(currentTickets) : parseInt(process.env.MAX_TICKETS || '10');
    const maxTickets = parseInt(process.env.MAX_TICKETS || '10');
    const nextRefillAt = await this.calculateNextRefillTime();
    const refillRate = parseInt(process.env.TICKET_REFILL_HOURS || '12') * 60; // 분 단위

    return {
      current: tickets,
      max: maxTickets,
      nextRefillAt,
      refillRate
    };
  }
}

module.exports = GachaService;
