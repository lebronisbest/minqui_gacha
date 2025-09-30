// 민킈 카드 가챠게임 - 컬렉션 메인 시스템
class CollectionSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.serverCollectionData = [];
    this.currentFilter = 'all';
    
    // 하위 시스템들 초기화
    this.statsSystem = window.createCollectionStatsSystem(gameInstance);
    this.renderSystem = window.createCollectionRenderSystem(gameInstance);
    this.filterSystem = window.createCollectionFilterSystem(gameInstance);
    this.modalSystem = window.createCollectionModalSystem(gameInstance);
  }

  // 서버에서 컬렉션 데이터 로드
  async loadCollectionFromServer() {
    try {
      const response = await this.game.apiClient.get('/api/collection');
      if (response.success) {
        // 서버에서 받은 완전한 카드 데이터를 저장
        this.serverCollectionData = response.data || [];
        console.log('서버 컬렉션 데이터 로드 완료:', this.serverCollectionData.length, '개');
      } else {
        console.error('컬렉션 데이터 로드 실패:', response.message);
        this.serverCollectionData = [];
      }
    } catch (error) {
      console.error('컬렉션 데이터 로드 중 오류:', error);
      this.serverCollectionData = [];
    }
  }

  // 컬렉션에 카드 추가 (서버 데이터만 사용)
  addToCollection(cardId) {
    // 서버 데이터만 사용 - 로컬 배열 제거
    // 실제 카드 추가는 서버에서 처리됨
    // UI 업데이트는 호출하는 곳에서 필요에 따라 처리
  }

  // 컬렉션 UI 초기화
  initCollectionUI() {
    // 컬렉션 UI 초기화
    this.statsSystem.updateCollectionStats();
    this.renderSystem.renderCollectionCards();
    
    // 모바일 UI도 초기화
    if (this.game.mobileSystem.isMobileDevice()) {
      this.renderSystem.renderMobileCollectionCards();
    }
  }

  // 컬렉션 UI 전체 업데이트
  updateCollectionUI() {
    // 컬렉션 UI 전체 업데이트
    this.statsSystem.updateCollectionStats();
    this.renderSystem.renderCollectionCards();
    
    // 모바일 UI도 업데이트
    if (this.game.mobileSystem.isMobileDevice()) {
      this.renderSystem.renderMobileCollectionCards();
    }
  }

  // 필터 설정 (하위 시스템으로 위임)
  setFilter(filter) {
    this.filterSystem.setFilter(filter);
  }

  // 모바일 필터 설정 (하위 시스템으로 위임)
  setMobileFilter(filter) {
    this.filterSystem.setMobileFilter(filter);
  }

  // 카드 상세 정보 표시 (하위 시스템으로 위임)
  showCardDetail(card, duplicateCount = 1) {
    this.modalSystem.showCardDetail(card, duplicateCount);
  }

  // 컬렉션 카드 요소 생성 (하위 시스템으로 위임)
  createCollectionCardElement(card, isOwned, overrideDuplicateCount = null) {
    return this.renderSystem.createCollectionCardElement(card, isOwned, overrideDuplicateCount);
  }

  // 모바일 컬렉션 카드 요소 생성 (하위 시스템으로 위임)
  createMobileCollectionCardElement(card, isOwned, duplicateCount = 0) {
    return this.renderSystem.createMobileCollectionCardElement(card, isOwned, duplicateCount);
  }

  // 컬렉션 카드들 렌더링 (하위 시스템으로 위임)
  renderCollectionCards() {
    this.renderSystem.renderCollectionCards();
  }

  // 모바일 컬렉션 카드들 렌더링 (하위 시스템으로 위임)
  renderMobileCollectionCards() {
    this.renderSystem.renderMobileCollectionCards();
  }

  // 컬렉션 통계 업데이트 (하위 시스템으로 위임)
  updateCollectionStats() {
    this.statsSystem.updateCollectionStats();
  }
}

// 전역 함수로 생성
window.createCollectionSystem = function(gameInstance) {
  return new CollectionSystem(gameInstance);
};