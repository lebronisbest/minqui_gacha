// 민킈 카드 가챠게임 - 티켓 관련 함수들
class TicketSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.tickets = 0;
    this.maxTickets = 5;
    this.nextRefillAt = null;
    this.ticketTimer = null;
  }

  // 티켓 데이터 로드
  loadTicketData() {
    if (this.game.isAdminMode) {
      this.tickets = 999;
      this.maxTickets = 999;
      this.nextRefillAt = null;
      return;
    }

    if (!this.maxTickets) {
      this.maxTickets = 5;
    }

    const savedTickets = localStorage.getItem('gachaTickets');
    const lastReset = localStorage.getItem('lastTicketReset');
    
    if (savedTickets !== null && lastReset !== null) {
      const lastResetDate = new Date(lastReset);
      const now = new Date();
      
      if (this.checkTicketReset(lastResetDate)) {
        this.tickets = this.maxTickets;
        this.nextRefillAt = this.getNextRefillTime();
        this.saveTicketData();
      } else {
        this.tickets = parseInt(savedTickets) || 0;
        this.nextRefillAt = new Date(localStorage.getItem('nextRefillAt'));
      }
    } else {
      this.tickets = this.maxTickets;
      this.nextRefillAt = this.getNextRefillTime();
      this.saveTicketData();
    }
  }

  // 티켓 리셋 확인
  checkTicketReset(lastReset) {
    const now = new Date();
    const lastResetDate = new Date(lastReset);
    
    // 12시간이 지났거나 날짜가 바뀌었으면 리셋
    const timeDiff = now - lastResetDate;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff >= 12) {
      return true;
    }
    
    // 날짜가 바뀌었는지 확인
    const lastResetDay = lastResetDate.getDate();
    const currentDay = now.getDate();
    
    return lastResetDay !== currentDay;
  }

  // 티켓 데이터 저장
  saveTicketData() {
    if (!this.game.isAdminMode) {
      localStorage.setItem('gachaTickets', this.tickets.toString());
      localStorage.setItem('lastTicketReset', new Date().toISOString());
      if (this.nextRefillAt) {
        localStorage.setItem('nextRefillAt', this.nextRefillAt.toISOString());
      }
    }
  }

  // 티켓 사용
  useTicket() {
    if (this.game.isAdminMode || this.game.isSecretMode) {
      return true;
    }

    if (this.tickets > 0) {
      this.tickets--;
      this.saveTicketData();
      this.game.dataSystem.updateTicketDisplay();
      return true;
    }
    return false;
  }

  // 카드 클릭 가능 여부 업데이트
  updateCardClickability() {
    const cardWrapper = this.game.cardWrapper;
    if (!cardWrapper) return;

    if (this.game.isAdminMode || this.game.isSecretMode) {
      cardWrapper.style.opacity = '1';
      cardWrapper.style.pointerEvents = 'auto';
    } else {
      if (this.tickets > 0) {
        cardWrapper.style.opacity = '1';
        cardWrapper.style.pointerEvents = 'auto';
      } else {
        cardWrapper.style.opacity = '0.5';
        cardWrapper.style.pointerEvents = 'none';
      }
    }
  }

  // 티켓 표시 업데이트
  updateTicketVisibility(tabName) {
    const ticketSystem = document.getElementById('ticketSystem');
    if (ticketSystem) {
      if (tabName === 'gacha') {
        ticketSystem.style.display = 'block';
      } else {
        ticketSystem.style.display = 'none';
      }
    }
  }

  // 티켓 타이머 시작
  startTicketTimer() {
    if (this.game.isAdminMode) {
      return;
    }

    const ticketTimerElement = document.getElementById('ticketTimer');
    if (ticketTimerElement) {
      ticketTimerElement.style.display = 'block';
    }

    if (this.game.isSecretMode) {
      const ticketTimerElement = document.getElementById('ticketTimer');
      if (ticketTimerElement) {
        ticketTimerElement.innerHTML = '<div class="ticket-timer-text">무한 가챠 모드</div>';
      }
      return;
    }

    this.ticketTimer = setInterval(() => {
      this.updateTicketTimer();
    }, 1000);
  }

  // 티켓 타이머 업데이트
  updateTicketTimer() {
    const ticketTimerElement = document.getElementById('ticketTimer');
    if (!ticketTimerElement) return;

    if (this.tickets >= this.maxTickets) {
      ticketTimerElement.innerHTML = '<div class="ticket-timer-text">티켓이 가득참</div>';
      return;
    }

    const now = new Date();
    const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    
    // 12시가 지났는지 확인
    if (koreanTime.getHours() >= 12) {
      this.tickets = this.maxTickets;
      this.nextRefillAt = this.getNextRefillTime();
      this.saveTicketData();
      this.game.dataSystem.updateTicketDisplay();
      return;
    }

    const timeDiff = this.nextRefillAt - now;
    if (timeDiff <= 0) {
      this.tickets = this.maxTickets;
      this.nextRefillAt = this.getNextRefillTime();
      this.saveTicketData();
      this.game.dataSystem.updateTicketDisplay();
      return;
    }

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    ticketTimerElement.innerHTML = `
      <div class="ticket-timer-text">
        다음 충전: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}
      </div>
    `;
  }

  // 다음 충전 시간 계산
  getNextRefillTime() {
    const now = new Date();
    const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    
    // 오늘 12시가 지났으면 내일 12시, 아니면 오늘 12시
    const nextRefill = new Date(koreanTime);
    if (koreanTime.getHours() >= 12) {
      nextRefill.setDate(nextRefill.getDate() + 1);
    }
    nextRefill.setHours(12, 0, 0, 0);
    
    return nextRefill;
  }
}

// 전역 티켓 시스템 인스턴스 생성 함수
window.createTicketSystem = function(gameInstance) {
  return new TicketSystem(gameInstance);
};
