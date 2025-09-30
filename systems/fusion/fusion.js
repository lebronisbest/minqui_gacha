// 민킈 카드 가챠게임 - 조합 메인 시스템
class FusionSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.selectedFusionCards = [];
    this.maxFusionCards = 10;
    this.minFusionCards = 3;
    this.isFusionInProgress = false;
    this.currentFusionFilter = 'all';
    this.currentProbabilities = null;
    
    // 하위 시스템들 초기화
    this.uiSystem = window.createFusionUISystem(gameInstance);
    this.logicSystem = window.createFusionLogicSystem(gameInstance);
    this.filterSystem = window.createFusionFilterSystem(gameInstance);
    this.probabilitySystem = window.createFusionProbabilitySystem(gameInstance);
  }

  // 조합 시스템 초기화
  initFusionSystem() {
    // 조합 버튼 이벤트 리스너
    const fusionButton = document.getElementById('fusionButton');
    if (fusionButton) {
      fusionButton.addEventListener('click', () => {
        this.performFusion();
      });
    }

    // 조합 결과 모달 이벤트 리스너
    document.addEventListener('click', (e) => {
      if (e.target.id === 'fusionResultModal' || e.target.id === 'closeFusionResult') {
        this.hideFusionResult();
      }
    });
  }

  // 조합 UI 초기화 (하위 시스템으로 위임)
  initFusionUI() {
    this.uiSystem.initFusionUI();
  }

  // 조합 슬롯 업데이트 (하위 시스템으로 위임)
  updateFusionSlots() {
    this.uiSystem.updateFusionSlots();
  }

  // 조합 카드들 렌더링 (하위 시스템으로 위임)
  renderFusionCards() {
    this.uiSystem.renderFusionCards();
  }

  // 조합 카드 요소 생성 (하위 시스템으로 위임)
  createFusionCardElement(card) {
    return this.uiSystem.createFusionCardElement(card);
  }

  // 조합용 카드 필터링 (하위 시스템으로 위임)
  filterCardsForFusion(cards) {
    return this.filterSystem.filterCardsForFusion(cards);
  }

  // 조합 필터 설정 (하위 시스템으로 위임)
  setFusionFilter(filter) {
    this.filterSystem.setFusionFilter(filter);
  }

  // 조합용 카드 선택 (하위 시스템으로 위임)
  selectCardForFusion(card) {
    this.logicSystem.selectCardForFusion(card);
  }

  // 카드 선택 상태 업데이트 (하위 시스템으로 위임)
  updateCardSelection() {
    this.logicSystem.updateCardSelection();
  }

  // 카드 개수 업데이트 (하위 시스템으로 위임)
  updateCardCounts() {
    this.logicSystem.updateCardCounts();
  }

  // 조합에서 카드 제거 (하위 시스템으로 위임)
  removeCardFromFusion(slotIndex) {
    this.logicSystem.removeCardFromFusion(slotIndex);
  }

  // 조합 슬롯 업데이트 (하위 시스템으로 위임)
  updateFusionSlot(slotIndex, card) {
    this.logicSystem.updateFusionSlot(slotIndex, card);
  }

  // 사용 가능한 카드 목록 가져오기 (하위 시스템으로 위임)
  getAvailableCardsForFusion() {
    return this.logicSystem.getAvailableCardsForFusion();
  }

  // 조합 확률 계산 (하위 시스템으로 위임)
  calculateFusionProbability(selectedCards) {
    return this.probabilitySystem.calculateFusionProbability(selectedCards);
  }

  // 조합 정보 업데이트 (하위 시스템으로 위임)
  updateFusionInfo() {
    this.probabilitySystem.updateFusionInfo();
  }

  // 확률 툴팁 표시 (하위 시스템으로 위임)
  showProbabilityTooltip(element, text) {
    this.probabilitySystem.showProbabilityTooltip(element, text);
  }

  // 확률 툴팁 숨기기 (하위 시스템으로 위임)
  hideProbabilityTooltip() {
    this.probabilitySystem.hideProbabilityTooltip();
  }

  // 조합 실행 (하위 시스템으로 위임)
  async performFusion() {
    await this.logicSystem.performFusion();
  }

  // 조합 버튼 상태 업데이트 (하위 시스템으로 위임)
  updateFusionButtonState() {
    this.uiSystem.updateFusionButtonState();
  }

  // 조합 결과 표시 (하위 시스템으로 위임)
  showFusionResult(resultCard) {
    this.game.uiSystem.showFusionResult(resultCard);
  }

  // 조합 결과 숨기기 (하위 시스템으로 위임)
  hideFusionResult() {
    this.game.uiSystem.hideFusionResult();
  }
}

// 전역 함수로 생성
window.createFusionSystem = function(gameInstance) {
  return new FusionSystem(gameInstance);
};