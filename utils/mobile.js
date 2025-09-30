// 민킈 카드 가챠게임 - 모바일 관련 함수들
class MobileSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 모바일 디바이스 감지
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // 모바일 컬렉션 카드 렌더링
  renderMobileCollectionCards() {
    const container = document.getElementById('mobileCollectionCards');
    if (!container) return;

    const cards = this.game.collectionSystem.getFilteredCards();
    container.innerHTML = '';

    cards.forEach(card => {
      const isOwned = this.game.collectionSystem.isCardOwned(card.id);
      const duplicateCount = isOwned ? this.game.collectionSystem.getCardCount(card.id) : 0;
      
      if (this.game.currentFilter !== 'all') {
        const rankFilter = this.game.currentFilter.toLowerCase();
        if (card.rank.toLowerCase() !== rankFilter) return;
      }
      
      const cardElement = this.createMobileCollectionCardElement(card, isOwned, duplicateCount);
      container.appendChild(cardElement);
    });
  }

  // 모바일 컬렉션 카드 요소 생성
  createMobileCollectionCardElement(card, isOwned, duplicateCount = 0) {
    const cardDiv = document.createElement('div');
    cardDiv.className = `mobile-collection-card ${isOwned ? 'owned' : 'unowned'}`;
    
    const rankInfo = this.game.gameData.ranks[card.rank];
    const emoji = rankInfo ? rankInfo.emoji : '⭐';
    
    cardDiv.innerHTML = `
      <div class="mobile-card-image-container">
        <img src="${card.image}" alt="${card.name}" class="mobile-card-image">
        ${!isOwned ? '<div class="mobile-unowned-overlay">미수집</div>' : ''}
        ${duplicateCount > 1 ? `<div class="mobile-duplicate-count">${duplicateCount}</div>` : ''}
      </div>
      <div class="mobile-card-info">
        <div class="mobile-card-name">${card.name}</div>
        <div class="mobile-card-rank rank-${card.rank.toLowerCase()}">${emoji} ${card.rank}</div>
        <div class="mobile-card-type">${card.type}</div>
      </div>
    `;
    
    if (isOwned) {
      // 클릭 이벤트 추가
      cardDiv.addEventListener('click', (e) => {
        e.preventDefault();
        this.game.modalSystem.showCardDetail(card, duplicateCount);
      });

      // 모바일 터치 이벤트 추가
      cardDiv.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.game.modalSystem.showCardDetail(card, duplicateCount);
      });
    }
    
    return cardDiv;
  }
}

// 전역 모바일 시스템 인스턴스 생성 함수
window.createMobileSystem = function(gameInstance) {
  return new MobileSystem(gameInstance);
};
