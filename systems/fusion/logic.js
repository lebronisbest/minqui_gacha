// 민킈 카드 가챠게임 - 조합 로직 관련 함수들
class FusionLogicSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 조합용 카드 선택
  selectCardForFusion(card) {
    if (this.game.fusionSystem.isFusionInProgress) {
      return;
    }

    // 이미 선택된 카드인지 확인
    const existingIndex = this.game.fusionSystem.selectedFusionCards.findIndex(selectedCard => 
      selectedCard && selectedCard.id === card.id
    );

    if (existingIndex !== -1) {
      // 이미 선택된 카드면 제거
      this.removeCardFromFusion(existingIndex);
      return;
    }

    // 빈 슬롯 찾기
    const emptySlotIndex = this.game.fusionSystem.selectedFusionCards.findIndex(selectedCard => selectedCard === null);
    
    if (emptySlotIndex === -1) {
      // 슬롯이 가득 참
      this.game.gameUtils.showNotification('조합 슬롯이 가득 찼습니다!', 'warning');
      return;
    }

    // 카드 선택
    this.game.fusionSystem.selectedFusionCards[emptySlotIndex] = card;
    this.updateCardSelection();
    this.updateCardCounts();
    this.updateFusionSlot(emptySlotIndex, card);
    this.game.fusionSystem.uiSystem.updateFusionButtonState();
    this.game.fusionSystem.probabilitySystem.updateFusionInfo();
  }

  // 카드 선택 상태 업데이트
  updateCardSelection() {
    // 모든 카드 요소의 선택 상태 업데이트
    document.querySelectorAll('.fusion-card-item').forEach(cardElement => {
      const cardId = parseInt(cardElement.dataset.cardId);
      const isSelected = this.game.fusionSystem.selectedFusionCards.some(selectedCard => 
        selectedCard && selectedCard.id === cardId
      );
      
      cardElement.classList.toggle('selected', isSelected);
    });
  }

  // 카드 개수 업데이트
  updateCardCounts() {
    const cardCounts = {};
    
    // 선택된 카드들의 개수 계산
    this.game.fusionSystem.selectedFusionCards.forEach(card => {
      if (card) {
        cardCounts[card.id] = (cardCounts[card.id] || 0) + 1;
      }
    });

    // 카드 요소들에 개수 표시
    document.querySelectorAll('.fusion-card-item').forEach(cardElement => {
      const cardId = parseInt(cardElement.dataset.cardId);
      const count = cardCounts[cardId] || 0;
      
      let countElement = cardElement.querySelector('.card-count');
      if (count > 0) {
        if (!countElement) {
          countElement = document.createElement('div');
          countElement.className = 'card-count';
          cardElement.appendChild(countElement);
        }
        countElement.textContent = count;
      } else if (countElement) {
        countElement.remove();
      }
    });
  }

  // 조합에서 카드 제거
  removeCardFromFusion(slotIndex) {
    if (this.game.fusionSystem.isFusionInProgress) {
      return;
    }

    this.game.fusionSystem.selectedFusionCards[slotIndex] = null;
    this.updateCardSelection();
    this.updateCardCounts();
    this.updateFusionSlot(slotIndex, null);
    this.game.fusionSystem.uiSystem.updateFusionButtonState();
    this.game.fusionSystem.probabilitySystem.updateFusionInfo();
  }

  // 조합 슬롯 업데이트
  updateFusionSlot(slotIndex, card) {
    this.game.fusionSystem.uiSystem.updateFusionSlot(slotIndex, card);
  }

  // 사용 가능한 카드 목록 가져오기
  getAvailableCardsForFusion() {
    if (!this.game.gameData || !this.game.gameData.cards) {
      return [];
    }

    return this.game.fusionSystem.filterSystem.filterCardsForFusion(this.game.gameData.cards);
  }

  // 조합 실행
  async performFusion() {
    if (this.game.fusionSystem.isFusionInProgress) {
      return;
    }

    const selectedCards = this.game.fusionSystem.selectedFusionCards.filter(card => card !== null);
    
    if (selectedCards.length < this.game.fusionSystem.minFusionCards) {
      this.game.gameUtils.showNotification(`최소 ${this.game.fusionSystem.minFusionCards}개의 카드가 필요합니다!`, 'warning');
      return;
    }

    if (selectedCards.length > this.game.fusionSystem.maxFusionCards) {
      this.game.gameUtils.showNotification(`최대 ${this.game.fusionSystem.maxFusionCards}개의 카드만 조합할 수 있습니다!`, 'warning');
      return;
    }

    this.game.fusionSystem.isFusionInProgress = true;
    this.game.fusionSystem.uiSystem.updateFusionButtonState();

    try {
      // 서버에 조합 요청
      const response = await this.game.apiClient.request('/fusion/commit', {
        method: 'POST',
        body: JSON.stringify({
          cards: selectedCards.map(card => card.id)
        })
      });

      if (response.success) {
        const resultCard = response.data.resultCard;
        
        // 조합 성공 애니메이션
        this.game.animationSystem.showRoulette(selectedCards, resultCard);
        
        // 선택된 카드들 초기화
        this.game.fusionSystem.selectedFusionCards = new Array(this.game.fusionSystem.selectedFusionCards.length).fill(null);
        this.updateCardSelection();
        this.updateCardCounts();
        
        // 슬롯들 초기화
        for (let i = 0; i < this.game.fusionSystem.selectedFusionCards.length; i++) {
          this.updateFusionSlot(i, null);
        }

        this.game.fusionSystem.uiSystem.updateFusionButtonState();
        this.game.fusionSystem.probabilitySystem.updateFusionInfo();
        
        // 컬렉션 업데이트
        this.game.collectionSystem.updateCollectionUI();
        
      } else {
        this.game.gameUtils.showNotification(response.message || '조합에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('조합 실행 중 오류:', error);
      this.game.gameUtils.showNotification('조합 중 오류가 발생했습니다.', 'error');
    } finally {
      this.game.fusionSystem.isFusionInProgress = false;
      this.game.fusionSystem.uiSystem.updateFusionButtonState();
    }
  }
}

// 전역 함수로 생성
window.createFusionLogicSystem = function(gameInstance) {
  return new FusionLogicSystem(gameInstance);
};
