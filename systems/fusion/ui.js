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
      console.error('조합 카드 컨테이너를 찾을 수 없습니다');
      return;
    }

    if (!this.game.gameData || !this.game.gameData.cards) {
      console.error('카드 데이터가 없습니다');
      container.innerHTML = '<p>카드 데이터를 불러오는 중...</p>';
      return;
    }

    // 필터링된 카드 목록 가져오기
    const filteredCards = this.game.fusionSystem.filterSystem.filterCardsForFusion(this.game.gameData.cards);
    console.log('조합 필터링된 카드:', filteredCards);

    // 컨테이너 초기화
    container.innerHTML = '';

    if (filteredCards.length === 0) {
      container.innerHTML = '<p style="color: white; text-align: center; padding: 20px;">조합 가능한 카드가 없습니다.</p>';
      return;
    }

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

    const imagePath = card.image?.startsWith('assets/') ? card.image : `assets/${card.image || 'illust/' + card.id.toString().padStart(3, '0') + '.png'}`;

    // 랭크 정보 가져오기
    const rankInfo = this.game.gameData.ranks[card.rank];
    const hp = Math.floor((card.baseHp || card.base_hp || 100) * (rankInfo?.hpMultiplier || 1));
    const attack = Math.floor((card.baseAttack || card.base_attack || 100) * (rankInfo?.attackMultiplier || 1));
    const skill = card.attacks && card.attacks[0];
    const typeIcon = this.game.gameData?.typeIcons?.[card.type] || '';

    // 보유 개수 확인
    const serverData = this.game.collectionSystem.serverCollectionData || [];
    const ownedCard = serverData.find(item => item.id === card.id);
    const count = ownedCard?.count || 0;

    // 컬렉션 카드와 동일한 디자인으로 렌더링
    cardElement.innerHTML = `
      <div class="fusion-card-front">
        <!-- 배경 일러스트 -->
        <div class="fusion-card-background">
          <img src="${imagePath}" alt="${card.name} 배경 일러스트" class="fusion-background-illust">
        </div>

        <!-- 카드 정보 박스 -->
        <div class="fusion-card-info-box">
          <div class="fusion-card-number-box">
            <div class="fusion-card-number">#${card.id}</div>
          </div>
          <div class="fusion-card-name">${card.name}</div>
        </div>

        <!-- 랭크 표시 -->
        <div class="fusion-card-rank">
          <img src="assets/illust/${card.rank}.png" alt="${card.rank} 랭크" class="fusion-rank-image">
        </div>

        <!-- 하단 투명 박스 -->
        <div class="fusion-card-bottom">
          <div class="fusion-stats-container">
            <div class="fusion-stat-item">
              <span class="fusion-stat-label">HP</span>
              <span class="fusion-stat-value">${hp}</span>
            </div>
            <div class="fusion-stat-item">
              <span class="fusion-stat-label">공격력</span>
              <span class="fusion-stat-value">${attack}</span>
            </div>
            <div class="fusion-stat-item">
              <span class="fusion-stat-value">${typeIcon}</span>
            </div>
          </div>
        </div>

        <!-- 보유 개수 배지 -->
        <div class="fusion-count-badge">${count}개</div>
      </div>
    `;

    // 카드 클릭 이벤트
    cardElement.addEventListener('click', () => {
      this.game.fusionSystem.selectCardForFusion(card);
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
