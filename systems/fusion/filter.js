// 민킈 카드 가챠게임 - 조합 필터링 관련 함수들
class FusionFilterSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 조합용 카드 필터링
  filterCardsForFusion(cards) {
    const serverData = this.game.collectionSystem.serverCollectionData || [];
    
    if (this.game.fusionSystem.currentFusionFilter === 'all') {
      return cards;
    }
    
    return cards.filter(card => {
      switch (this.game.fusionSystem.currentFusionFilter) {
        case 'owned':
          // 보유한 카드만 (서버 데이터가 없으면 모든 카드 표시)
          return Array.isArray(serverData) && serverData.length > 0 ? serverData.some(item => item.id === card.id) : true;
        case 'unowned':
          // 미보유 카드만
          return Array.isArray(serverData) && serverData.length > 0 ? !serverData.some(item => item.id === card.id) : false;
        case 'sss':
          return card.rank === 'SSS';
        case 'ss':
          return card.rank === 'SS';
        case 's':
          return card.rank === 'S';
        case 'a':
          return card.rank === 'A';
        case 'b':
          return card.rank === 'B';
        default:
          return true;
      }
    });
  }

  // 조합 필터 설정
  setFusionFilter(filter) {
    this.game.fusionSystem.currentFusionFilter = filter;
    
    // 필터 버튼 상태 업데이트
    document.querySelectorAll('.fusion-filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-fusion-filter="${filter}"]`)?.classList.add('active');
    
    // 카드 목록 다시 렌더링
    this.game.fusionUISystem.renderFusionCards();
    
    // 조합 정보 업데이트
    this.game.fusionProbabilitySystem.updateFusionInfo();
  }
}

// 전역 함수로 생성
window.createFusionFilterSystem = function(gameInstance) {
  return new FusionFilterSystem(gameInstance);
};
