// 민킈 카드 가챠게임 - 애니메이션 관련 함수들
class AnimationSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.rouletteStartTime = 0;
  }

  // 룰렛 표시
  showRoulette(selectedCards, resultCard) {
    console.log('🎰 showRoulette 시작');

    const rouletteModal = document.getElementById('rouletteModal');
    const rouletteWheel = document.getElementById('rouletteWheel');
    const rouletteResult = document.getElementById('rouletteResult');
    
    if (!rouletteModal || !rouletteWheel || !rouletteResult) {
      console.error('룰렛 모달 요소를 찾을 수 없습니다.');
      return;
    }

    // 룰렛 결과 초기화
    rouletteResult.innerHTML = '';
    rouletteResult.style.display = 'none';

    // 룰렛 휠 초기화
    rouletteWheel.innerHTML = '';

    // 룰렛 카드 생성 (더 적은 수로 최적화)
    const totalCards = 12; // 총 카드 수 줄임
    const cardWidth = 100; // CSS 변수와 일치

    for (let i = 0; i < totalCards; i++) {
      const cardDiv = this.createRouletteCard(i, resultCard, totalCards);
      rouletteWheel.appendChild(cardDiv);
    }

    // 룰렛 모달 표시
    rouletteModal.style.display = 'flex';
    rouletteModal.classList.add('show');

    // 룰렛 애니메이션 시작 (더 빠르게)
    setTimeout(() => {
      this.startRouletteAnimation(rouletteWheel, resultCard, selectedCards);
    }, 300);
  }

  // 룰렛 카드 생성
  createRouletteCard(index, resultCard, totalCards) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'roulette-card';
    // CSS 변수 사용으로 인라인 스타일 제거

    if (index === totalCards - 1) {
      // 마지막 카드는 결과 카드
      cardDiv.innerHTML = `
        <img src="${resultCard.image}" alt="${resultCard.name}">
        <div class="card-name">${resultCard.name}</div>
        <div class="card-rank">${resultCard.rank}</div>
      `;
    } else {
      // 일반 카드들 (더 빠른 렌더링을 위해 미리 선택된 카드 사용)
      const randomCard = this.game.gameData.cards[Math.floor(Math.random() * this.game.gameData.cards.length)];
      cardDiv.innerHTML = `
        <img src="${randomCard.image}" alt="${randomCard.name}">
        <div class="card-name">${randomCard.name}</div>
        <div class="card-rank">${randomCard.rank}</div>
      `;
    }

    return cardDiv;
  }

  // 룰렛 애니메이션 시작
  startRouletteAnimation(rouletteWheel, resultCard, selectedCards) {
    const cards = rouletteWheel.children;
    
    // 🔧 CSS 변수 기반 치수 계산
    const containerWidth = rouletteWheel.parentElement.offsetWidth;
    const cardWidth = 100; // CSS 변수와 일치
    const cardSpacing = 8; // CSS 변수와 일치
    const totalCardWidth = cardWidth + cardSpacing;
    
    // 🎯 정확한 중앙 위치 계산
    const centerOffset = (containerWidth - cardWidth) / 2;
    const resultCardIndex = cards.length - 1; // 마지막 카드가 결과 카드
    const resultCardPosition = resultCardIndex * totalCardWidth;
    const endPosition = centerOffset - resultCardPosition;
    
    // 🎪 애니메이션 시작 시간 기록
    this.rouletteStartTime = performance.now();
    
    // 🎪 최적화된 애니메이션 실행
    const duration = 2500; // 2.5초로 단축
    const easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'; // 더 자연스러운 이징
    
    rouletteWheel.style.transition = `transform ${duration}ms ${easing}`;
    rouletteWheel.style.transform = `translateX(${endPosition}px)`;

    // 애니메이션 완료 후 결과 표시
    setTimeout(() => {
      // 성능 측정 완료
      const endTime = performance.now();
      const totalTime = endTime - this.rouletteStartTime;
      console.log(`🎯 룰렛 애니메이션 완료: ${totalTime.toFixed(1)}ms`);
      
      this.game.uiSystem.showRouletteResult(resultCard, selectedCards);
    }, duration);
  }

  // 룰렛 효과음 재생
  playRouletteSound() {
    // 룰렛 효과음 재생
    window.gameUtils.playSound('particle');
  }

  // 룰렛 결과 표시
  showRouletteResult(resultCard, selectedCards) {
    const rouletteResult = document.getElementById('rouletteResult');
    
    if (resultCard) {
      rouletteResult.innerHTML = `
        <div class="roulette-result-card">
          <img src="${resultCard.image}" alt="${resultCard.name}">
          <div class="roulette-result-info">
            <h3>${resultCard.name}</h3>
            <div class="roulette-result-rank">${resultCard.rank}</div>
          </div>
        </div>
        <div class="roulette-result-message">
          <h2>🎉 새로운 카드를 획득했습니다!</h2>
          <p>${selectedCards.length}장의 카드로 조합에 성공했습니다.</p>
        </div>
      `;
      
      rouletteResult.style.display = 'block';
      rouletteResult.classList.add('show');
      
      // 컬렉션에 카드 추가
      this.game.collectionSystem.addToCollection(resultCard.id);
      
      // 컬렉션 UI 업데이트
      this.game.collectionSystem.updateCollectionUI();
      
      // 2초 후 룰렛 모달 닫기 (더 빠르게)
      setTimeout(() => {
        this.hideRoulette();
      }, 2000);
    }
  }

  // 룰렛 모달 숨기기
  hideRoulette() {
    const rouletteModal = document.getElementById('rouletteModal');
    if (rouletteModal) {
      rouletteModal.classList.remove('show');
      setTimeout(() => {
        rouletteModal.style.display = 'none';
      }, 300);
    }
  }

  // 시크릿 모드 알림 애니메이션
  showSecretModeNotification() {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.secret-mode-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = 'secret-mode-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        box-shadow: 0 10px 30px rgba(255, 107, 107, 0.5);
        z-index: 10000;
        animation: secretModePulse 0.5s ease-out;
      ">
        🎉 시크릿 모드 활성화! 🎉<br>
        <small style="font-size: 14px; opacity: 0.9;">무한 가챠가 가능합니다!</small>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 3초 후 제거
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// 전역 애니메이션 시스템 인스턴스 생성 함수
window.createAnimationSystem = function(gameInstance) {
  return new AnimationSystem(gameInstance);
};
