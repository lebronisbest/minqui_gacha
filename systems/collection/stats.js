// 민킈 카드 가챠게임 - 컬렉션 통계 관련 함수들
class CollectionStatsSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 컬렉션 통계 업데이트
  updateCollectionStats() {
    // 컬렉션 통계 업데이트
    if (!this.game.gameData || !this.game.gameData.cards) {
      return;
    }

    // 서버 데이터가 있으면 서버 데이터 사용
    if (this.game.collectionSystem.serverCollectionData && this.game.collectionSystem.serverCollectionData.length > 0) {
      const totalCards = this.game.gameData.cards.length;
      const ownedCards = this.game.collectionSystem.serverCollectionData.length;
      const completionRate = totalCards > 0 ? Math.round((ownedCards / totalCards) * 100) : 0;

      // 통계 업데이트
      const statsElement = document.querySelector('.collection-stats');
      if (statsElement) {
        statsElement.innerHTML = `
          <div class="stat-item">
            <span class="stat-label">수집률</span>
            <span class="stat-value">${completionRate}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">보유 카드</span>
            <span class="stat-value">${ownedCards}/${totalCards}</span>
          </div>
        `;
      }
    } else {
      // 서버 데이터가 없으면 기본값 표시
      const statsElement = document.querySelector('.collection-stats');
      if (statsElement) {
        statsElement.innerHTML = `
          <div class="stat-item">
            <span class="stat-label">수집률</span>
            <span class="stat-value">0%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">보유 카드</span>
            <span class="stat-value">0/${this.game.gameData.cards.length}</span>
          </div>
        `;
      }
    }
  }

  // 필터링된 카드 목록 가져오기
  getFilteredCards() {
    if (!this.game.gameData || !this.game.gameData.cards) {
      return [];
    }

    const currentFilter = this.game.collectionSystem.currentFilter || 'all';
    let filteredCards = [...this.game.gameData.cards];

    if (currentFilter === 'all') {
      return filteredCards;
    } else if (currentFilter === 'owned') {
      // 서버 데이터에서 보유한 카드만 필터링
      const ownedCardIds = this.game.collectionSystem.serverCollectionData.map(item => item.id);
      filteredCards = filteredCards.filter(card => ownedCardIds.includes(card.id));
    } else if (currentFilter === 'unowned') {
      // 서버 데이터에서 보유하지 않은 카드만 필터링
      const ownedCardIds = this.game.collectionSystem.serverCollectionData.map(item => item.id);
      filteredCards = filteredCards.filter(card => !ownedCardIds.includes(card.id));
    }

    return filteredCards;
  }
}

// 전역 함수로 생성
window.createCollectionStatsSystem = function(gameInstance) {
  return new CollectionStatsSystem(gameInstance);
};
