// 민킈 카드 가챠게임 - 개선된 룰렛 시스템 (좌우 이동)
class RouletteSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.isSpinning = false;
    this.spinDuration = 2500; // 2.5초
    this.cards = [];
    this.resultCard = null;
  }

  // 룰렛 표시
  showRoulette(selectedCards, resultCard) {
    console.log('🎰 개선된 룰렛 시작');

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

    // 룰렛 카드 생성
    this.cards = this.generateRouletteCards(resultCard);
    this.resultCard = resultCard;

    // 룰렛 휠에 카드들 추가
    this.cards.forEach((card, index) => {
      const cardElement = this.createRouletteCard(card, index);
      rouletteWheel.appendChild(cardElement);
    });

    // 룰렛 모달 표시
    rouletteModal.style.display = 'flex';
    rouletteModal.classList.add('show');

    // 룰렛 애니메이션 시작
    setTimeout(() => {
      this.startRouletteAnimation(selectedCards);
    }, 300);
  }

  // 룰렛 카드 생성 (10개)
  generateRouletteCards(resultCard) {
    const cards = [];
    const totalCards = 10;
    
    // 결과 카드를 마지막에 배치
    const resultPosition = totalCards - 1;
    
    for (let i = 0; i < totalCards; i++) {
      if (i === resultPosition) {
        cards.push({
          ...resultCard,
          isResult: true
        });
      } else {
        // 랜덤 카드 선택
        const randomCard = this.game.gameData.cards[Math.floor(Math.random() * this.game.gameData.cards.length)];
        cards.push({
          ...randomCard,
          isResult: false
        });
      }
    }
    
    return cards;
  }

  // 룰렛 카드 엘리먼트 생성
  createRouletteCard(card, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'roulette-card';
    
    if (card.isResult) {
      cardDiv.classList.add('result-card');
    }

    cardDiv.innerHTML = `
      <div class="card-image">
        <img src="${card.image}" alt="${card.name}" onerror="this.src='assets/illust/000.png'">
      </div>
      <div class="card-info">
        <div class="card-name">${card.name}</div>
        <div class="card-rank">${card.rank}</div>
      </div>
    `;

    return cardDiv;
  }

  // 룰렛 애니메이션 시작 (역동적이고 짜릿한 효과)
  startRouletteAnimation(selectedCards) {
    if (this.isSpinning) return;
    
    this.isSpinning = true;
    const rouletteWheel = document.getElementById('rouletteWheel');
    const rouletteContainer = document.getElementById('rouletteContainer');
    
    // 중앙 정렬 계산
    const containerWidth = rouletteWheel.parentElement.offsetWidth;
    const cardWidth = 100; // CSS 변수와 일치
    const cardSpacing = 8; // CSS 변수와 일치
    const totalCardWidth = cardWidth + cardSpacing;
    
    // 결과 카드가 중앙에 오도록 계산
    const resultCardIndex = this.cards.length - 1; // 마지막 카드가 결과 카드
    const resultCardPosition = resultCardIndex * totalCardWidth;
    const centerOffset = (containerWidth - cardWidth) / 2;
    const endPosition = centerOffset - resultCardPosition;
    
    // 🎪 역동적인 애니메이션 효과들
    this.addDramaticEffects(rouletteContainer);
    
    // 🎰 단계별 애니메이션
    this.startMultiStageAnimation(rouletteWheel, endPosition, selectedCards);
  }

  // 🎪 역동적인 시각 효과 추가
  addDramaticEffects(container) {
    // 배경 글로우 효과
    container.style.boxShadow = `
      0 0 50px rgba(255, 215, 0, 0.8),
      inset 0 0 30px rgba(0, 0, 0, 0.3),
      0 0 100px rgba(255, 215, 0, 0.4)
    `;
    
    // 컨테이너 진동 효과
    container.style.animation = 'rouletteShake 0.1s ease-in-out infinite';
    
    // 카드들에 개별 효과 추가
    const cards = container.querySelectorAll('.roulette-card');
    cards.forEach((card, index) => {
      // 각 카드마다 다른 지연시간으로 깜빡임 효과
      card.style.animation = `cardFlicker 0.2s ease-in-out infinite`;
      card.style.animationDelay = `${index * 0.05}s`;
    });
  }

  // 🎰 다단계 애니메이션 실행
  startMultiStageAnimation(rouletteWheel, endPosition, selectedCards) {
    // 1단계: 빠른 시작 (0.5초)
    rouletteWheel.style.transition = `transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    rouletteWheel.style.transform = `translateX(-200px)`;
    
    setTimeout(() => {
      // 2단계: 중간 속도 (1초)
      rouletteWheel.style.transition = `transform 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      rouletteWheel.style.transform = `translateX(-400px)`;
      
      setTimeout(() => {
        // 3단계: 느린 마무리 (1초) - 결과 카드로 이동
        rouletteWheel.style.transition = `transform 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
        rouletteWheel.style.transform = `translateX(${endPosition}px)`;
        
        // 최종 단계: 결과 표시
        setTimeout(() => {
          this.showRouletteResult(selectedCards);
        }, 1000);
      }, 1000);
    }, 500);
  }

  // 룰렛 결과 표시
  showRouletteResult(selectedCards) {
    const rouletteResult = document.getElementById('rouletteResult');
    
    if (this.resultCard) {
      rouletteResult.innerHTML = `
        <div class="roulette-result-card">
          <div class="result-card-image">
            <img src="${this.resultCard.image}" alt="${this.resultCard.name}">
          </div>
          <div class="result-card-info">
            <h3>${this.resultCard.name}</h3>
            <div class="result-card-rank">${this.resultCard.rank}</div>
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
      this.game.collectionSystem.addToCollection(this.resultCard.id);
      
      // 컬렉션 UI 업데이트
      this.game.collectionSystem.updateCollectionUI();
      
      // 2초 후 룰렛 모달 닫기
      setTimeout(() => {
        this.hideRoulette();
      }, 2000);
    }
    
    this.isSpinning = false;
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
}

// 전역 룰렛 시스템 인스턴스 생성 함수
window.createRouletteSystem = function(gameInstance) {
  return new RouletteSystem(gameInstance);
};
