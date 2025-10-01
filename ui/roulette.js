// 민킈 카드 가챠게임 - 새로운 룰렛 시스템
class RouletteSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.isSpinning = false;
    this.spinDuration = 3000; // 3초
    this.cards = [];
    this.resultCard = null;
  }

  // 룰렛 표시
  showRoulette(selectedCards, resultCard) {
    console.log('🎰 새로운 룰렛 시작');

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
      this.startRouletteSpin(selectedCards);
    }, 500);
  }

  // 룰렛 카드 생성 (12개)
  generateRouletteCards(resultCard) {
    const cards = [];
    const totalCards = 12;
    
    // 결과 카드를 랜덤 위치에 배치
    const resultPosition = Math.floor(Math.random() * totalCards);
    
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

    // 카드 위치 계산 (원형 배치)
    const angle = (index * 30) * (Math.PI / 180); // 30도씩 배치
    const radius = 150; // 룰렛 중심에서 카드까지의 거리
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    cardDiv.style.left = `calc(50% + ${x}px)`;
    cardDiv.style.top = `calc(50% + ${y}px)`;
    cardDiv.style.transform = `translate(-50%, -50%) rotate(${angle * (180 / Math.PI)}deg)`;

    cardDiv.innerHTML = `
      <div class="card-image">
        <img src="${card.image}" alt="${card.name}">
      </div>
      <div class="card-info">
        <div class="card-name">${card.name}</div>
        <div class="card-rank">${card.rank}</div>
      </div>
    `;

    return cardDiv;
  }

  // 룰렛 회전 시작
  startRouletteSpin(selectedCards) {
    if (this.isSpinning) return;
    
    this.isSpinning = true;
    const rouletteWheel = document.getElementById('rouletteWheel');
    
    // 회전 각도 계산 (결과 카드가 화살표에 오도록)
    const resultCardIndex = this.cards.findIndex(card => card.isResult);
    const baseRotation = 360 * 5; // 5바퀴 회전
    const finalRotation = (360 / 12) * resultCardIndex; // 결과 카드 위치
    const totalRotation = baseRotation + finalRotation;
    
    // 회전 애니메이션
    rouletteWheel.style.transition = `transform ${this.spinDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    rouletteWheel.style.transform = `rotate(${totalRotation}deg)`;
    
    // 회전 완료 후 결과 표시
    setTimeout(() => {
      this.showRouletteResult(selectedCards);
    }, this.spinDuration);
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
      
      // 3초 후 룰렛 모달 닫기
      setTimeout(() => {
        this.hideRoulette();
      }, 3000);
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
