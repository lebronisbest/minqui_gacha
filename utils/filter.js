// 민킈 카드 가챠게임 - 필터 관련 함수들
class FilterSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.currentFilter = 'all';
  }

  // 필터 설정
  setFilter(filter) {
    this.currentFilter = filter;
    this.game.collectionSystem.updateCollectionUI();
  }

  // 모바일 필터 설정
  setMobileFilter(filter) {
    this.currentFilter = filter;
    this.game.mobileSystem.renderMobileCollectionCards();
  }

  // 모바일 디바이스 감지
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
}

// 전역 필터 시스템 인스턴스 생성 함수
window.createFilterSystem = function(gameInstance) {
  return new FilterSystem(gameInstance);
};
