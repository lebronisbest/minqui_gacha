// 민킈 카드 가챠게임 - 데이터 관리 관련 함수들
class DataSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 서버에서 카드 데이터 로드
  async loadCardDataFromServer() {
    try {
      const catalog = await this.game.apiClient.getCatalog();
      this.game.gameData = {
        cards: catalog.cards,
        ranks: catalog.ranks,
        typeIcons: catalog.typeIcons
      };
      console.log('서버에서 카드 데이터 로드 완료:', this.game.gameData.cards.length, '장');
    } catch (error) {
      console.error('서버 카드 데이터 로드 실패:', error);
      // 폴백: 로컬 데이터 로드
      await this.loadCardDataFromLocal();
    }
  }

  // 로컬 카드 데이터 로드 (폴백)
  async loadCardDataFromLocal() {
    try {
      const response = await fetch('assets/cards.json');
      if (!response.ok) {
        throw new Error('로컬 카드 데이터 로드 실패');
      }
      const data = await response.json();
      
      // 로컬 데이터를 서버 형식에 맞게 변환
      this.game.gameData = {
        cards: data,
        ranks: {
          'SSS': { emoji: '⭐', color: '#ff6b6b', hpMultiplier: 2.0, attackMultiplier: 2.0 },
          'SS': { emoji: '⭐', color: '#ffa500', hpMultiplier: 1.8, attackMultiplier: 1.8 },
          'S': { emoji: '⭐', color: '#9c27b0', hpMultiplier: 1.6, attackMultiplier: 1.6 },
          'A': { emoji: '⭐', color: '#2196f3', hpMultiplier: 1.4, attackMultiplier: 1.4 },
          'B': { emoji: '⭐', color: '#4caf50', hpMultiplier: 1.2, attackMultiplier: 1.2 }
        },
        typeIcons: {
          'Tech': '💻',
          'Life': '🌱',
          'Sports': '⚽',
          'Art': '🎨',
          'Music': '🎵'
        }
      };
      console.log('로컬에서 카드 데이터 로드 완료:', this.game.gameData.cards.length, '장');
    } catch (error) {
      console.error('로컬 카드 데이터 로드 실패:', error);
      alert('카드 데이터를 로드할 수 없습니다. 페이지를 새로고침해주세요.');
    }
  }

  // 카드 정보 업데이트
  updateCardInfo() {
    if (!this.game.cardData) return;
    
    // 카드 정보 업데이트
    const cardImage = document.getElementById('cardImage');
    const cardName = document.getElementById('cardName');
    const cardRank = document.getElementById('cardRank');
    const cardHp = document.getElementById('cardHp');
    const cardAttack = document.getElementById('cardAttack');
    const cardType = document.getElementById('cardType');
    const cardSkill = document.getElementById('cardSkill');
    const cardSkillDesc = document.getElementById('cardSkillDesc');
    
    if (cardImage) cardImage.src = this.game.cardData.image;
    if (cardName) cardName.textContent = this.game.cardData.name;
    if (cardRank) cardRank.textContent = this.game.cardData.rank;
    if (cardHp) cardHp.textContent = this.game.cardData.hp;
    if (cardAttack) cardAttack.textContent = this.game.cardData.attack;
    if (cardType) cardType.textContent = this.game.cardData.type;
    if (cardSkill) cardSkill.textContent = this.game.cardData.skill;
    if (cardSkillDesc) cardSkillDesc.textContent = this.game.cardData.skillDesc;
    
    // 랭크별 색상 적용
    const rankInfo = this.game.gameData.ranks[this.game.cardData.rank];
    if (rankInfo) {
      this.game.cardData.color = rankInfo.color;
    }
  }

  // 서버에서 티켓 시스템 초기화
  async initTicketSystemFromServer() {
    try {
      const ticketInfo = await this.game.apiClient.getTicketInfo();
      this.game.tickets = ticketInfo.current;
      this.game.maxTickets = ticketInfo.max;
      this.game.nextRefillAt = ticketInfo.nextRefillAt;
      
      this.updateTicketDisplay();
    } catch (error) {
      console.error('티켓 정보 로드 실패:', error);
      // 폴백: 로컬 티켓 시스템 사용
      this.initTicketSystem();
    }
  }

  // 기존 티켓 시스템 (폴백용)
  initTicketSystem() {
    this.loadTicketData();
    this.updateTicketDisplay();
  }

  // 티켓 데이터 로드
  loadTicketData() {
    const savedTickets = localStorage.getItem('minquiTickets');
    const savedNextRefill = localStorage.getItem('minquiNextRefill');
    
    if (savedTickets !== null) {
      this.game.tickets = parseInt(savedTickets);
    }
    
    if (savedNextRefill) {
      this.game.nextRefillAt = new Date(savedNextRefill);
    }
  }

  // 티켓 데이터 저장
  saveTicketData() {
    localStorage.setItem('minquiTickets', this.game.tickets.toString());
    if (this.game.nextRefillAt) {
      localStorage.setItem('minquiNextRefill', this.game.nextRefillAt.toISOString());
    }
  }

  // 티켓 사용
  useTicket() {
    if (this.game.tickets > 0) {
      this.game.tickets--;
      this.saveTicketData();
      this.updateTicketDisplay();
      return true;
    }
    return false;
  }

  // 티켓 표시 업데이트 (원래 script.js 로직)
  updateTicketDisplay() {
    const ticketCountElement = document.getElementById('ticketCount');
    const ticketTimerElement = document.getElementById('ticketTimer');
    
    if (ticketCountElement) {
      ticketCountElement.textContent = this.game.tickets;
      
      // 티켓이 0일 때 시각적 피드백
      if (this.game.tickets <= 0 && !this.game.isAdminMode && !this.game.isSecretMode) {
        ticketCountElement.style.color = '#ff6b6b';
        ticketCountElement.style.textShadow = '0 0 10px rgba(255, 107, 107, 0.5)';
      } else {
        ticketCountElement.style.color = '#ffd700';
        ticketCountElement.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
      }
    }
    
    if (ticketTimerElement) {
      if (this.game.isAdminMode) {
        ticketTimerElement.textContent = '관리자 모드 - 무한 티켓';
        return;
      }
      
      if (this.game.isSecretMode) {
        ticketTimerElement.textContent = '시크릿 모드 - 무한 가챠';
        return;
      }
      
      if (!this.game.nextRefillAt) {
        ticketTimerElement.textContent = '다음 충전까지: --:--:--';
        return;
      }
      
      const now = new Date();
      const timeDiff = this.game.nextRefillAt - now;
      
      if (timeDiff <= 0) {
        // 12시가 되었으면 티켓 리셋
        this.game.tickets = this.game.maxTickets;
        this.saveTicketData();
        return;
      }
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      ticketTimerElement.textContent = `다음 충전까지: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  // 티켓 타이머 시작 (원래 script.js 로직)
  startTicketTimer() {
    if (this.game.isAdminMode) {
      const ticketTimerElement = document.getElementById('ticketTimer');
      if (ticketTimerElement) {
        ticketTimerElement.textContent = '관리자 모드 - 무한 티켓';
      }
      return;
    }
    
    if (this.game.isSecretMode) {
      const ticketTimerElement = document.getElementById('ticketTimer');
      if (ticketTimerElement) {
        ticketTimerElement.textContent = '시크릿 모드 - 무한 가챠';
      }
      return;
    }
    
    if (this.game.ticketTimer) {
      clearInterval(this.game.ticketTimer);
    }
    
    this.game.ticketTimer = setInterval(() => {
      this.updateTicketDisplay();
    }, 1000);
  }

  // checkTicketRefill 함수는 updateTicketDisplay에 통합됨

  // 카드 클릭 가능성 업데이트
  updateCardClickability() {
    const cardWrapper = this.game.cardWrapper;
    if (!cardWrapper) return;
    
    if (this.game.tickets > 0) {
      cardWrapper.style.pointerEvents = 'auto';
      cardWrapper.style.opacity = '1';
    } else {
      cardWrapper.style.pointerEvents = 'none';
      cardWrapper.style.opacity = '0.5';
    }
  }

  // 서버 연결 및 인증 초기화
  async initializeServerConnection() {
    try {
      // 기존 세션 복원 시도
      const sessionValid = await this.game.apiClient.restoreSession();
      
      if (!sessionValid) {
        // 새 게스트 세션 생성
        await this.game.apiClient.guestLogin();
        console.log('새 게스트 세션 생성됨');
      } else {
        console.log('기존 세션 복원됨');
      }
      
      return true;
    } catch (error) {
      console.error('서버 연결 실패:', error);
      return false;
    }
  }
}

// 전역 데이터 시스템 인스턴스 생성 함수
window.createDataSystem = function(gameInstance) {
  return new DataSystem(gameInstance);
};
