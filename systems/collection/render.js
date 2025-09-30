// 민킈 카드 가챠게임 - 컬렉션 렌더링 관련 함수들
class CollectionRenderSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 컬렉션 카드들 렌더링
  renderCollectionCards() {
    const container = document.querySelector('.collection-cards');
    if (!container) return;

    // 필터링된 카드 목록 가져오기
    const filteredCards = this.game.collectionSystem.statsSystem.getFilteredCards();
    
    if (!this.game.gameData || !this.game.gameData.cards) {
      container.innerHTML = '<p>카드 데이터를 불러오는 중...</p>';
      return;
    }

    // 컨테이너 초기화
    container.innerHTML = '';

    // 카드들 렌더링
    filteredCards.forEach(card => {
      const isOwned = this.game.collectionSystem.serverCollectionData.some(item => item.card_id === card.id);
      const duplicateCount = isOwned ? 
        this.game.collectionSystem.serverCollectionData.find(item => item.card_id === card.id)?.duplicate_count || 1 : 0;
      
      const cardElement = this.createCollectionCardElement(card, isOwned, duplicateCount);
      container.appendChild(cardElement);
    });
  }

  // 컬렉션 카드 요소 생성
  createCollectionCardElement(card, isOwned, overrideDuplicateCount = null) {
    const cardElement = document.createElement('div');
    cardElement.className = `collection-card ${isOwned ? 'owned' : 'unowned'}`;
    cardElement.dataset.cardId = card.id;

    const duplicateCount = overrideDuplicateCount !== null ? overrideDuplicateCount : 
      (isOwned ? this.game.collectionSystem.serverCollectionData.find(item => item.card_id === card.id)?.duplicate_count || 1 : 0);

    cardElement.innerHTML = `
      <div class="card-image-container">
        <img src="${card.image}" 
             alt="${card.name}" 
             class="card-image"
             onerror="this.src='assets/illust/000.png'">
        ${isOwned ? `<div class="duplicate-count">${duplicateCount}</div>` : ''}
        ${isOwned ? '<div class="owned-badge">보유</div>' : '<div class="unowned-badge">미보유</div>'}
      </div>
      <div class="card-info">
        <h3 class="card-name">${card.name}</h3>
        <p class="card-rank rank-${card.rank.toLowerCase()}">${card.rank}</p>
        <p class="card-description">${card.description}</p>
      </div>
    `;

    // 카드 클릭 이벤트
    cardElement.addEventListener('click', () => {
      if (isOwned) {
        this.game.collectionModalSystem.showCardDetail(card, duplicateCount);
      } else {
        this.game.miscSystem.showUnownedCardInfo(card);
      }
    });

    // 호버 효과
    cardElement.addEventListener('mouseenter', () => {
      cardElement.style.transform = 'translateY(-5px)';
    });

    cardElement.addEventListener('mouseleave', () => {
      cardElement.style.transform = 'translateY(0)';
    });

    return cardElement;
  }

  // 모바일 컬렉션 카드들 렌더링
  renderMobileCollectionCards() {
    const container = document.querySelector('.mobile-collection-cards');
    if (!container) return;

    // 필터링된 카드 목록 가져오기
    const filteredCards = this.game.collectionSystem.statsSystem.getFilteredCards();
    
    if (!this.game.gameData || !this.game.gameData.cards) {
      container.innerHTML = '<p>카드 데이터를 불러오는 중...</p>';
      return;
    }

    // 컨테이너 초기화
    container.innerHTML = '';

    // 카드들 렌더링
    filteredCards.forEach(card => {
      const isOwned = this.game.collectionSystem.serverCollectionData.some(item => item.card_id === card.id);
      const duplicateCount = isOwned ? 
        this.game.collectionSystem.serverCollectionData.find(item => item.card_id === card.id)?.duplicate_count || 1 : 0;
      
      const cardElement = this.createMobileCollectionCardElement(card, isOwned, duplicateCount);
      container.appendChild(cardElement);
    });
  }

  // 모바일 컬렉션 카드 요소 생성
  createMobileCollectionCardElement(card, isOwned, duplicateCount = 0) {
    const cardElement = document.createElement('div');
    cardElement.className = `mobile-collection-card ${isOwned ? 'owned' : 'unowned'}`;
    cardElement.dataset.cardId = card.id;

    cardElement.innerHTML = `
      <div class="mobile-card-image-container">
        <img src="assets/illust/${card.id.toString().padStart(3, '0')}.png" 
             alt="${card.name}" 
             class="mobile-card-image"
             onerror="this.src='assets/illust/000.png'">
        ${isOwned ? `<div class="mobile-duplicate-count">${duplicateCount}</div>` : ''}
        ${isOwned ? '<div class="mobile-owned-badge">보유</div>' : '<div class="mobile-unowned-badge">미보유</div>'}
      </div>
      <div class="mobile-card-info">
        <h3 class="mobile-card-name">${card.name}</h3>
        <p class="mobile-card-rank rank-${card.rank.toLowerCase()}">${card.rank}</p>
      </div>
    `;

    // 카드 클릭 이벤트
    cardElement.addEventListener('click', () => {
      if (isOwned) {
        this.game.collectionModalSystem.showCardDetail(card, duplicateCount);
      } else {
        this.game.miscSystem.showUnownedCardInfo(card);
      }
    });

    return cardElement;
  }
}

// 전역 함수로 생성
window.createCollectionRenderSystem = function(gameInstance) {
  return new CollectionRenderSystem(gameInstance);
};
