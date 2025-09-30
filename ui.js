// 민킈 카드 가챠게임 - UI 관련 함수들
class UISystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 카드 PNG 내보내기
  async exportCardToPNG(card, duplicateCount = 1) {
    try {
      // 로딩 상태 표시
      const exportButton = document.getElementById('exportPngButton');
      const originalText = exportButton.textContent;
      exportButton.textContent = '내보내는 중...';
      exportButton.disabled = true;

      // 임시 컨테이너 생성 (화면 밖에 배치)
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: fixed;
        top: -2000px;
        left: -2000px;
        width: 600px;
        height: 840px;
        background: transparent;
        pointer-events: none;
        z-index: -1;
      `;

      // 컬렉션 카드와 동일한 구조로 생성 (2배 크기)
      const cardElement = this.game.collectionSystem.createCollectionCardElement(card, true, duplicateCount);
      cardElement.style.cssText = `
        width: 600px !important;
        height: 840px !important;
        transform: scale(1) !important;
        transform-origin: center !important;
        margin: 0 !important;
      `;

      tempContainer.appendChild(cardElement);
      document.body.appendChild(tempContainer);

      // html2canvas로 PNG 생성
      const canvas = await html2canvas(cardElement, {
        backgroundColor: null,
        scale: 1,
        width: 600,
        height: 840,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      // 임시 요소 제거
      document.body.removeChild(tempContainer);

      // PNG 다운로드
      const dataURL = canvas.toDataURL('image/png', 1.0);

      // 모바일 및 데스크톱 환경에 따른 다운로드 처리
      if (this.game.isMobileDevice()) {
        // 모바일: 새 창에서 이미지 표시
        const newWindow = window.open();
        newWindow.document.write(`
          <html>
            <head>
              <title>${card.name} 카드</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { margin: 0; padding: 20px; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                img { max-width: 100%; height: auto; border-radius: 10px; }
                .download-info { color: white; text-align: center; margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <div>
                <div class="download-info">카드를 길게 눌러 저장하세요</div>
                <img src="${dataURL}" alt="${card.name} 카드">
              </div>
            </body>
          </html>
        `);
      } else {
        // 데스크톱: 직접 다운로드
        const link = document.createElement('a');
        link.download = `${card.name}_카드.png`;
        link.href = dataURL;
        link.click();
      }

      // 버튼 상태 복원
      exportButton.textContent = originalText;
      exportButton.disabled = false;

    } catch (error) {
      console.error('PNG 내보내기 실패:', error);
      alert('PNG 내보내기에 실패했습니다.');
      
      // 버튼 상태 복원
      const exportButton = document.getElementById('exportPngButton');
      exportButton.textContent = 'PNG로 내보내기';
      exportButton.disabled = false;
    }
  }

  // 룰렛 표시
  showRoulette(selectedCards, resultCard) {
    console.log('🎰 showRoulette 시작');

    const rouletteModal = document.getElementById('rouletteModal');
    const rouletteContainer = document.getElementById('rouletteContainer');
    const rouletteResult = document.getElementById('rouletteResult');
    
    if (!rouletteModal || !rouletteContainer || !rouletteResult) {
      console.error('룰렛 모달 요소를 찾을 수 없습니다.');
      return;
    }

    // 룰렛 결과 초기화
    rouletteResult.innerHTML = '';
    rouletteResult.style.display = 'none';

    // 룰렛 컨테이너 초기화
    rouletteContainer.innerHTML = '';

    // 룰렛 아이템 생성
    const rouletteItems = [];
    const totalItems = 20; // 룰렛 아이템 수

    for (let i = 0; i < totalItems; i++) {
      const item = document.createElement('div');
      item.className = 'roulette-item';
      
      if (i === totalItems - 1) {
        // 마지막 아이템은 결과 카드
        item.innerHTML = `
          <div class="roulette-card">
            <img src="${resultCard.image}" alt="${resultCard.name}">
            <div class="roulette-card-name">${resultCard.name}</div>
            <div class="roulette-card-rank">${resultCard.rank}</div>
          </div>
        `;
        item.classList.add('result-item');
      } else {
        // 일반 아이템들
        const randomCard = this.game.gameData.cards[Math.floor(Math.random() * this.game.gameData.cards.length)];
        item.innerHTML = `
          <div class="roulette-card">
            <img src="${randomCard.image}" alt="${randomCard.name}">
            <div class="roulette-card-name">${randomCard.name}</div>
            <div class="roulette-card-rank">${randomCard.rank}</div>
          </div>
        `;
      }
      
      rouletteContainer.appendChild(item);
      rouletteItems.push(item);
    }

    // 룰렛 모달 표시
    rouletteModal.style.display = 'flex';
    rouletteModal.classList.add('show');

    // 룰렛 애니메이션 시작
    this.startRouletteAnimation(rouletteItems, resultCard, selectedCards);
  }

  // 룰렛 애니메이션 시작
  startRouletteAnimation(rouletteItems, resultCard, selectedCards) {
    const container = document.getElementById('rouletteContainer');
    const resultItem = rouletteItems[rouletteItems.length - 1];
    
    // 초기 위치 설정
    let currentPosition = 0;
    const itemWidth = 200; // 룰렛 아이템 너비
    const visibleItems = 3; // 화면에 보이는 아이템 수
    const centerOffset = (container.offsetWidth - itemWidth) / 2;
    
    // 애니메이션 설정
    let animationSpeed = 50; // 초기 속도 (ms)
    const minSpeed = 200; // 최종 속도 (ms)
    const acceleration = 1.1; // 가속도
    let animationId;
    
    const animate = () => {
      currentPosition -= itemWidth;
      
      // 룰렛 아이템들을 순환시키기
      if (currentPosition <= -itemWidth * rouletteItems.length) {
        currentPosition = 0;
      }
      
      container.style.transform = `translateX(${currentPosition + centerOffset}px)`;
      
      // 속도 조절
      if (animationSpeed < minSpeed) {
        animationSpeed *= acceleration;
      }
      
      // 결과 아이템이 중앙에 왔을 때 정지
      const resultPosition = -itemWidth * (rouletteItems.length - 1);
      if (currentPosition <= resultPosition + 50 && animationSpeed >= minSpeed) {
        // 정확한 위치로 조정
        container.style.transform = `translateX(${resultPosition + centerOffset}px)`;
        
        // 결과 표시
        setTimeout(() => {
          this.showRouletteResult(resultCard, selectedCards);
        }, 500);
        
        return;
      }
      
      animationId = setTimeout(animate, animationSpeed);
    };
    
    // 애니메이션 시작
    animate();
  }

  // 룰렛 결과 표시
  showRouletteResult(resultCard, selectedCards) {
    const rouletteResult = document.getElementById('rouletteResult');
    
    if (!rouletteResult) return;
    
    // 결과 카드 표시
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
    
    // 컬렉션에 카드 추가
    this.game.collectionSystem.addToCollection(resultCard.id);
    
    // 컬렉션 UI 업데이트
    this.game.collectionSystem.updateCollectionUI();
    
    // 3초 후 룰렛 모달 닫기
    setTimeout(() => {
      this.hideRoulette();
    }, 3000);
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

  // 조합 결과 표시
  showFusionResult(card, success) {
    const modal = document.getElementById('fusionResultModal');
    const resultCardDiv = document.getElementById('resultCardDisplay');
    const resultMessage = document.getElementById('resultMessage');
    
    if (!modal || !resultCardDiv || !resultMessage) return;
    
    if (success && card) {
      // 성공한 경우
      resultCardDiv.innerHTML = `
        <div class="result-card">
          <img src="${card.image}" alt="${card.name}" class="result-card-image">
          <div class="result-card-info">
            <h3>${card.name}</h3>
            <div class="result-card-rank">${card.rank}</div>
          </div>
        </div>
      `;
      resultMessage.innerHTML = `
        <div class="success-message">
          <h2>🎉 조합 성공!</h2>
          <p>새로운 카드를 획득했습니다!</p>
        </div>
      `;
    } else {
      // 실패한 경우
      resultCardDiv.innerHTML = `
        <div class="result-card failed">
          <div class="failed-icon">💥</div>
          <div class="result-card-info">
            <h3>조합 실패</h3>
            <p>다시 시도해보세요!</p>
          </div>
        </div>
      `;
      resultMessage.innerHTML = `
        <div class="failure-message">
          <h2>😢 조합 실패</h2>
          <p>카드가 소모되었지만 새로운 카드를 얻지 못했습니다.</p>
        </div>
      `;
    }
    
    modal.style.display = 'flex';
  }

  // 조합 결과 숨기기
  hideFusionResult() {
    const modal = document.getElementById('fusionResultModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
}

// 전역 UI 시스템 인스턴스 생성 함수
window.createUISystem = function(gameInstance) {
  return new UISystem(gameInstance);
};
