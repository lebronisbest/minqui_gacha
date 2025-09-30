// 민킈 카드 가챠게임 - 가챠 관련 함수들
class GachaSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.isGachaLoading = false;
  }

  // 가챠 로딩 상태 표시
  showGachaLoading() {
    const cardWrapper = this.game.cardWrapper;
    if (cardWrapper) {
      cardWrapper.classList.add('gacha-loading');
      
      // 로딩 스피너 추가
      const existingSpinner = cardWrapper.querySelector('.gacha-spinner');
      if (!existingSpinner) {
        const spinner = document.createElement('div');
        spinner.className = 'gacha-spinner';
        spinner.innerHTML = `
          <div class="spinner-ring"></div>
          <div class="spinner-text">뽑는 중...</div>
        `;
        cardWrapper.appendChild(spinner);
      }
    }
  }

  // 가챠 로딩 상태 숨기기
  hideGachaLoading() {
    const cardWrapper = this.game.cardWrapper;
    if (cardWrapper) {
      cardWrapper.classList.remove('gacha-loading');
      
      // 로딩 스피너 제거
      const spinner = cardWrapper.querySelector('.gacha-spinner');
      if (spinner) {
        spinner.remove();
      }
    }
  }

  // 카드 클릭 처리
  handleClick() {
    // 가챠 로딩 중이면 클릭 무시
    if (this.isGachaLoading) {
      return;
    }

    if (!this.game.isFlipped) {
      // 뒷면에서 앞면으로 - 가챠 실행
      this.performGacha();
    } else {
      // 앞면에서 뒷면으로 - 다시 뽑기
      window.gameUtils.playSound('cardFlip');
      this.showBack();
    }
  }

  // 가챠 실행
  async performGacha() {
    // 이미 로딩 중이면 실행하지 않음
    if (this.isGachaLoading) {
      return;
    }

    try {
      this.isGachaLoading = true;

      // 로딩 상태 표시 (카드 뒤집기 전에)
      this.showGachaLoading();
      
      // 서버에서 가챠 실행
      const result = await this.game.apiClient.drawGacha();
      
      if (!result.success) {
        // 티켓 부족 시 로딩 상태 해제
        this.hideGachaLoading();
        this.isGachaLoading = false;
        alert('티켓이 부족합니다! 12시에 다시 충전됩니다.');
        return;
      }

      // 로딩 상태 해제
      this.hideGachaLoading();
      this.isGachaLoading = false;
      
      // 서버에서 받은 카드 결과 처리
      const selectedCard = result.data.cards[0];
      
      if (!selectedCard) {
        console.error('카드 데이터가 없습니다:', result);
        alert('카드 데이터를 받지 못했습니다. 다시 시도해주세요.');
        return;
      }
      
      const selectedRank = selectedCard.rank;
      
      // 카드 데이터 업데이트
      this.game.cardData = selectedCard;
      this.game.updateCardDisplay();
      
      // 이제 카드 뒤집기 (뽑기 완료 후)
      this.showFront();
      window.gameUtils.playSound('cardFlip');
      
      // 랭크별 효과음 재생
      window.gameUtils.playRankSound(selectedRank);
      
      // 랭크별 파티클 효과
      this.showRankParticles(selectedRank);
      
      // SSS 랭크 특별 애니메이션
      if (selectedRank === 'SSS') {
        this.showSSSAnimation();
      }
      
      // 가챠 결과 알림 (우측 상단, 미니멀)
      this.showResult();
      
      // 티켓 정보 업데이트
      this.game.tickets = result.data.ticketsRemaining;
      this.game.nextRefillAt = result.data.nextRefillAt;
      this.game.updateTicketDisplay();
      
      // 컬렉션 업데이트
      this.game.loadCollectionFromServer();
      
    } catch (error) {
      console.error('가챠 실행 실패:', error);
      // 에러 시 로딩 상태 숨기기 및 해제
      this.hideGachaLoading();
      this.isGachaLoading = false;
      alert('가챠 실행 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }

  // 카드 앞면 표시
  showFront() {
    this.game.cardWrapper.classList.add('flipped');
    this.game.isFlipped = true;
  }

  // 카드 뒷면 표시
  showBack() {
    this.game.cardWrapper.classList.remove('flipped');
    this.game.isFlipped = false;
  }

  // 가챠 결과 알림 표시
  showResult() {
    if (!this.game.cardData) return;
    
    const notification = document.createElement('div');
    notification.className = 'gacha-notification-minimal';
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-rank">${this.game.cardData.rank}</div>
        <div class="notification-name">${this.game.cardData.name}</div>
      </div>
    `;
    
    // 스타일 적용
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-weight: bold;
      animation: slideInRight 0.3s ease-out;
      max-width: 200px;
    `;
    
    document.body.appendChild(notification);
    
    // 3초 후 제거
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  }

  // 랭크별 파티클 효과
  showRankParticles(rank) {
    const cardWrapper = this.game.cardWrapper;
    const rect = cardWrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const bottomY = rect.bottom; // 카드 아래쪽에서 시작
    
    // 랭크별 파티클 설정
    const particleConfig = this.getParticleConfig(rank);
    
    // 파티클 효과음 재생 (고랭크만)
    if (rank === 'SSS' || rank === 'SS') {
      setTimeout(() => window.gameUtils.playSound('particle'), 200);
    }
    
    // 파티클 생성 - X축으로 퍼진 위치에서 시작
    for (let i = 0; i < particleConfig.count; i++) {
      setTimeout(() => {
        // X축으로 퍼진 시작 위치 계산
        const horizontalOffset = (Math.random() - 0.5) * 200; // 좌우 더 넓은 랜덤 오프셋
        const startX = centerX + horizontalOffset;
        
        this.createParticle(startX, bottomY, particleConfig);
      }, i * particleConfig.delay);
    }
    
    // 글로우 효과
    this.addGlowEffect(rank);
  }

  // 파티클 생성
  createParticle(x, y, config) {
    const particle = document.createElement('div');
    particle.className = 'gacha-particle';
    
    // 랜덤 속성 설정
    const speed = config.speed.min + Math.random() * (config.speed.max - config.speed.min);
    const size = config.size.min + Math.random() * (config.size.max - config.size.min);
    const color = config.colors[Math.floor(Math.random() * config.colors.length)];
    
    // 파티클 스타일 설정
    particle.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
      box-shadow: 0 0 ${size * 2}px ${color};
      transform: translate(-50%, -50%);
    `;
    
    document.body.appendChild(particle);
    
    // Y축 애니메이션 (아래에서 위로만 올라감, X축은 고정)
    const deltaY = -speed * 120; // 위로만 올라감 (음수값)
    
    particle.animate([
      { 
        transform: 'translate(-50%, -50%) scale(1)',
        opacity: 1
      },
      { 
        transform: `translate(-50%, calc(-50% + ${deltaY}px)) scale(0)`,
        opacity: 0
      }
    ], {
      duration: config.duration,
      easing: 'ease-out'
    }).onfinish = () => {
      particle.remove();
    };
  }

  // 파티클 설정 가져오기
  getParticleConfig(rank) {
    const configs = {
      'SSS': {
        count: 150,
        delay: 10,
        colors: ['#ff6b6b', '#ffa500', '#ffd700'],
        size: { min: 4, max: 12 },
        speed: { min: 2, max: 8 },
        duration: 2000
      },
      'SS': {
        count: 120,
        delay: 12,
        colors: ['#ffa500', '#ffd700'],
        size: { min: 3, max: 8 },
        speed: { min: 1.5, max: 6 },
        duration: 1500
      },
      'S': {
        count: 100,
        delay: 15,
        colors: ['#9c27b0', '#e91e63'],
        size: { min: 2, max: 6 },
        speed: { min: 1, max: 4 },
        duration: 1000
      },
      'A': {
        count: 80,
        delay: 18,
        colors: ['#2196f3', '#03a9f4'],
        size: { min: 2, max: 5 },
        speed: { min: 0.8, max: 3 },
        duration: 800
      },
      'B': {
        count: 60,
        delay: 20,
        colors: ['#4caf50', '#8bc34a'],
        size: { min: 1, max: 4 },
        speed: { min: 0.5, max: 2 },
        duration: 600
      }
    };
    
    return configs[rank] || configs['B'];
  }

  // 글로우 효과 추가
  addGlowEffect(rank) {
    const cardWrapper = this.game.cardWrapper;
    const glowConfig = this.getGlowConfig(rank);
    
    // 기존 글로우 효과 제거
    cardWrapper.classList.remove('glow-sss', 'glow-ss', 'glow-s', 'glow-a', 'glow-b');
    
    // 새로운 글로우 효과 추가
    cardWrapper.classList.add(`glow-${rank.toLowerCase()}`);
    
    // 3초 후 글로우 효과 제거
    setTimeout(() => {
      cardWrapper.classList.remove(`glow-${rank.toLowerCase()}`);
    }, 3000);
  }

  // 글로우 설정 가져오기
  getGlowConfig(rank) {
    const configs = {
      'SSS': { intensity: 3, duration: 3000, color: '#ff6b6b' },
      'SS': { intensity: 2.5, duration: 2500, color: '#ffa500' },
      'S': { intensity: 2, duration: 2000, color: '#9c27b0' },
      'A': { intensity: 1.5, duration: 1500, color: '#2196f3' },
      'B': { intensity: 1, duration: 1000, color: '#4caf50' }
    };
    
    return configs[rank] || configs['B'];
  }

  // SSS 랭크 특별 애니메이션
  showSSSAnimation() {
    // 홀로그램 효과
    const cardWrapper = this.game.cardWrapper;
    cardWrapper.classList.add('sss-special-animation');
    
    // 3초 후 효과 제거
    setTimeout(() => {
      cardWrapper.classList.remove('sss-special-animation');
    }, 3000);
  }
}

// 전역 가챠 시스템 인스턴스 생성 함수
window.createGachaSystem = function(gameInstance) {
  return new GachaSystem(gameInstance);
};
