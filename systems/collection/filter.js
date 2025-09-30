// 민킈 카드 가챠게임 - 컬렉션 필터링 관련 함수들
class CollectionFilterSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 필터 설정
  setFilter(filter) {
    this.game.collectionSystem.currentFilter = filter;
    
    // 필터 버튼 상태 업데이트
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
    
    // 카드 목록 다시 렌더링
    this.game.collectionRenderSystem.renderCollectionCards();
    
    // 통계 업데이트
    this.game.collectionStatsSystem.updateCollectionStats();
  }

  // 모바일 필터 설정
  setMobileFilter(filter) {
    this.game.collectionSystem.currentFilter = filter;
    
    // 모바일 필터 버튼 상태 업데이트
    document.querySelectorAll('.mobile-filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
    
    // 모바일 카드 목록 다시 렌더링
    this.game.collectionRenderSystem.renderMobileCollectionCards();
    
    // 통계 업데이트
    this.game.collectionStatsSystem.updateCollectionStats();
  }
}

// 전역 함수로 생성
window.createCollectionFilterSystem = function(gameInstance) {
  return new CollectionFilterSystem(gameInstance);
};
