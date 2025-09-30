// 민킈 카드 가챠게임 - 조합 UI 관련 함수들
class FusionUISystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 조합 UI 초기화
  initFusionUI() {
    // 조합 UI 초기화
    this.updateFusionSlots();
    this.renderFusionCards();
    
    // 조합 버튼 이벤트
    const fusionButton = document.getElementById('fusionButton');
    if (fusionButton) {
      fusionButton.addEventListener('click', () => {
        this.game.fusionSystem.performFusion();
      });
    }
  }

  // 조합 슬롯 업데이트
  updateFusionSlots() {
    const container = document.querySelector('.fusion-slots');
    if (!container) {
      return;
    }

    // 기존 슬롯들 제거
    container.innerHTML = '';

    // 10개의 슬롯 생성
    for (let i = 0; i < 10; i++) {
      const slot = document.createElement('div');
      slot.className = 'fusion-slot';
      slot.dataset.slotIndex = i;
      slot.innerHTML = `
        <div class="slot-content">
          <div class="slot-placeholder">슬롯 ${i + 1}</div>
        </div>
        <button class="remove-slot-btn" style="display: none;">&times;</button>
      `;
      
      // 슬롯 클릭 이벤트
      slot.addEventListener('click', () => {
        this.game.fusionSystem.removeCardFromFusion(i);
      });
      
      container.appendChild(slot);
    }
  }

  // 조합 카드들 렌더링
  renderFusionCards() {
    const container = document.querySelector('.fusion-card-grid');
    if (!container) {
      return;
    }

    // 필터링된 카드 목록 가져오기
    const filteredCards = this.game.fusionSystem.filterCardsForFusion(this.game.gameData.cards);
    
    // 컨테이너 초기화
    container.innerHTML = '';

    // 카드들 렌더링
    filteredCards.forEach(card => {
      const cardElement = this.createFusionCardElement(card);
      container.appendChild(cardElement);
    });
  }

  // 조합 카드 요소 생성
  createFusionCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'fusion-card-item';
    cardElement.dataset.cardId = card.id;

    // 카드 이미지
    const img = document.createElement('img');
    img.src = card.image.startsWith('assets/') ? card.image : `assets/${card.image}`;
    img.alt = card.name;
    img.className = 'fusion-card-image';
    img.onload = () => {
      console.log('조합 이미지 로드 성공:', img.src);
    };
    img.onerror = () => {
      console.error('조합 이미지 로드 실패:', img.src, '→ 폴백 이미지 사용');
      img.src = 'assets/illust/000.png';
    };

    // 카드 정보
    const info = document.createElement('div');
    info.className = 'fusion-card-info';
    info.innerHTML = `
      <h4 class="fusion-card-name">${card.name}</h4>
      <p class="fusion-card-rank rank-${card.rank.toLowerCase()}">${card.rank}</p>
    `;

    cardElement.appendChild(img);
    cardElement.appendChild(info);

    // 카드 클릭 이벤트
    cardElement.addEventListener('click', () => {
      this.game.fusionSystem.selectCardForFusion(card);
    });

    // 호버 효과
    cardElement.addEventListener('mouseenter', () => {
      cardElement.style.transform = 'translateY(-2px)';
    });

    cardElement.addEventListener('mouseleave', () => {
      cardElement.style.transform = 'translateY(0)';
    });

    return cardElement;
  }

  // 조합 슬롯에 카드 표시
  updateFusionSlot(slotIndex, card) {
    const slot = document.querySelector(`[data-slot-index="${slotIndex}"]`);
    if (!slot) return;

    if (card) {
      const imagePath = card.image.startsWith('assets/') ? card.image : `assets/${card.image}`;
      slot.innerHTML = `
        <div class="slot-content">
          <img src="${imagePath}" 
               alt="${card.name}" 
               class="fusion-slot-card-image"
               onerror="this.src='assets/illust/000.png'">
          <div class="slot-card-info">
            <h4>${card.name}</h4>
            <p class="rank-${card.rank.toLowerCase()}">${card.rank}</p>
          </div>
        </div>
        <button class="remove-slot-btn">&times;</button>
      `;
      
      // 제거 버튼 이벤트
      const removeBtn = slot.querySelector('.remove-slot-btn');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.game.fusionSystem.removeCardFromFusion(slotIndex);
      });
    } else {
      slot.innerHTML = `
        <div class="slot-content">
          <div class="slot-placeholder">슬롯 ${slotIndex + 1}</div>
        </div>
        <button class="remove-slot-btn" style="display: none;">&times;</button>
      `;
    }
  }

  // 조합 버튼 상태 업데이트
  updateFusionButtonState() {
    const fusionButton = document.getElementById('fusionButton');
    if (!fusionButton) return;

    const selectedCount = this.game.fusionSystem.selectedFusionCards.filter(card => card !== null).length;
    const canFuse = selectedCount >= this.game.fusionSystem.minFusionCards && 
                   selectedCount <= this.game.fusionSystem.maxFusionCards;

    fusionButton.disabled = !canFuse;
    fusionButton.textContent = canFuse ? 
      `조합하기 (${selectedCount}/${this.game.fusionSystem.maxFusionCards})` : 
      `카드를 ${this.game.fusionSystem.minFusionCards}개 이상 선택하세요`;
  }
}

// 전역 함수로 생성
window.createFusionUISystem = function(gameInstance) {
  return new FusionUISystem(gameInstance);
};
