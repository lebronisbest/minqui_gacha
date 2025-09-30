// 민킈 카드 가챠게임 - 조합 관련 함수들
class FusionSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.selectedFusionCards = [];
    this.maxFusionCards = 10;
    this.minFusionCards = 3;
    this.isFusionInProgress = false;
    this.currentFusionFilter = 'all';
    this.currentProbabilities = null;
    
    // 게임 인스턴스에 조합 시스템 참조 추가
    this.game.fusionSystem = this;
  }

  // 조합 시스템 초기화
  initFusionSystem() {
    // 조합 버튼 클릭 이벤트
    const fusionButton = document.getElementById('fusionButton');
    if (fusionButton) {
      fusionButton.addEventListener('click', () => {
        console.log('🔘 조합 버튼 클릭됨');
        this.performFusion();
      });
      console.log('✅ 조합 버튼 이벤트 리스너 등록 완료');
    } else {
      console.error('❌ fusionButton 요소를 찾을 수 없음');
    }
    
    // 조합 결과 모달 닫기 이벤트
    document.getElementById('fusionResultModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'fusionResultModal' || e.target.id === 'closeFusionResult') {
        this.hideFusionResult();
      }
    });
    
    // 필터 버튼 이벤트
    document.querySelectorAll('.fusion-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setFusionFilter(e.target.dataset.filter);
      });
    });
  }

  // 조합 UI 초기화 (탭 전환 시 호출)
  initFusionUI() {
    // 조합 슬롯 초기화
    this.updateFusionSlots();
    
    // 카드 그리드 렌더링
    this.renderFusionCards();
    
    // 조합 정보 업데이트
    this.updateFusionInfo();
  }

  // 조합 슬롯 업데이트
  updateFusionSlots() {
    const container = document.getElementById('fusionSlots');
    if (!container) {
      console.error('fusionSlots container not found!');
      return;
    }

    container.innerHTML = '';
    
    // 선택된 카드 배열 초기화 (10개 고정)
    this.selectedFusionCards = new Array(10).fill(null);
    
    for (let i = 0; i < 10; i++) {
      const slot = document.createElement('div');
      slot.className = 'fusion-slot';
      slot.dataset.slot = i;
      slot.innerHTML = '<div class="slot-placeholder">카드 선택</div>';
      
      // 슬롯 클릭 이벤트 (카드 제거)
      slot.onclick = () => {
        this.removeCardFromFusion(i);
      };

      container.appendChild(slot);
    }
    
    this.updateFusionInfo();
  }

  // 조합 카드 그리드 렌더링
  renderFusionCards() {
    const container = document.getElementById('fusionCardGrid');
    if (!container) return;

    const availableCards = this.getAvailableCardsForFusion();
    const filteredCards = this.filterCardsForFusion(availableCards);

    container.innerHTML = '';

    filteredCards.forEach(card => {
      const cardElement = this.createFusionCardElement(card);
      container.appendChild(cardElement);
    });
  }

  // 조합 카드 요소 생성
  createFusionCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'fusion-card-item';
    cardDiv.dataset.cardId = card.id;
    
    // 카드 수량 계산
    const cardCount = card.count || 0;
    
    // 조합탭에서는 0장인 카드는 렌더링되지 않으므로 disabled 체크 불필요
    
    cardDiv.innerHTML = `
      <img src="${card.image}" alt="${card.name}" class="fusion-card-image">
      <div class="fusion-card-name">${card.name}</div>
      <div class="fusion-card-rank">${card.rank}</div>
      <div class="fusion-card-count">${cardCount}장</div>
    `;
    
    // 카드 클릭 이벤트
    cardDiv.onclick = () => {
      this.selectCardForFusion(card);
    };

    return cardDiv;
  }

  // 조합 카드 필터링
  filterCardsForFusion(cards) {
    if (this.currentFusionFilter === 'all') {
      return cards;
    }
    return cards.filter(card => card.rank === this.currentFusionFilter);
  }
  
  // 조합 필터 설정
  setFusionFilter(filter) {
    this.currentFusionFilter = filter;
    
    // 필터 버튼 활성화 상태 업데이트
    document.querySelectorAll('.fusion-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    this.renderFusionCards();
  }
  
  // 조합용 카드 선택
  selectCardForFusion(card) {
    if (!card || !card.id) {
      console.error('유효하지 않은 카드:', card);
      return;
    }

    // 이미 선택된 카드 수 확인
    const selectedCardCount = this.selectedFusionCards.filter(selectedCard =>
      selectedCard && selectedCard.id === card.id
    ).length;

    // 보유 카드 수 확인
    const availableCount = card.count || 0;
    
    if (selectedCardCount >= availableCount) {
      alert('선택할 수 있는 카드 수를 초과했습니다!');
      return;
    }

    // 빈 슬롯 찾기
    const emptySlotIndex = this.selectedFusionCards.findIndex(slot => slot === null);

    if (emptySlotIndex === -1) {
      alert('조합 슬롯이 가득 찼습니다!');
      return;
    }

    // 카드 선택
    this.selectedFusionCards[emptySlotIndex] = card;

    try {
      this.updateFusionSlot(emptySlotIndex, card);
    } catch (slotError) {
      console.error('슬롯 업데이트 오류:', slotError);
    }

    try {
      this.updateFusionInfo();
    } catch (infoError) {
      console.error('조합 정보 업데이트 오류:', infoError);
    }

    try {
      this.updateCardSelection();
      this.updateCardCounts();
    } catch (selectionError) {
      console.error('카드 선택 상태 업데이트 오류:', selectionError);
    }

    try {
      // 🔄 조합 카드 목록 다시 렌더링 (0장 카드 숨김 처리)
      this.renderFusionCards();
    } catch (renderError) {
      console.error('카드 그리드 렌더링 오류:', renderError);
    }
  }

  // 카드 선택 상태 업데이트
  updateCardSelection() {
    document.querySelectorAll('.fusion-card-item').forEach(item => {
      const cardId = item.dataset.cardId;
      const isSelected = this.selectedFusionCards.some(card => card && card.id === cardId);
      item.classList.toggle('selected', isSelected);
    });
  }

  // 카드 수량 업데이트
  updateCardCounts() {
    document.querySelectorAll('.fusion-card-item').forEach(item => {
      const cardId = item.dataset.cardId;
      
      // 서버 컬렉션에서 해당 카드의 총 수량 찾기
      const totalCardCount = this.game.collectionSystem.serverCollectionData.find(ownedCard => 
        ownedCard.id === cardId
      )?.count || 0;

      const selectedCardCount = this.selectedFusionCards.filter(selectedCard => 
        selectedCard && selectedCard.id === cardId
      ).length;

      const countElement = item.querySelector('.fusion-card-count');
      if (countElement) {
        countElement.textContent = `${totalCardCount}장`;
        countElement.style.color = selectedCardCount > 0 ? '#ff6b6b' : '#666';
      }
    });
  }

  // 조합에서 카드 제거
  removeCardFromFusion(slotIndex) {
    if (this.selectedFusionCards[slotIndex]) {
      this.selectedFusionCards[slotIndex] = null;
      this.updateFusionSlot(slotIndex, null);
      this.updateFusionInfo();
      this.updateCardSelection();
      this.updateCardCounts();

      // 🔄 조합 카드 목록 다시 렌더링 (사용 가능한 카드 다시 표시)
      this.renderFusionCards();
    }
  }

  // 조합 슬롯 업데이트
  updateFusionSlot(slotIndex, card) {
    const slot = document.querySelector(`[data-slot="${slotIndex}"]`);
    
    if (!slot) {
      console.error(`슬롯 ${slotIndex}을 찾을 수 없습니다.`);
      return;
    }

    if (card) {
      slot.innerHTML = `
        <img src="${card.image}" alt="${card.name}" class="fusion-slot-card-image">
        <div class="fusion-slot-card-name">${card.name}</div>
        <div class="fusion-slot-card-rank">${card.rank}</div>
        <button class="remove-card-btn" onclick="event.stopPropagation(); window.game.fusionSystem.removeCardFromFusion(${slotIndex})">×</button>
      `;
      slot.classList.add('filled');
    } else {
      slot.innerHTML = '<div class="slot-placeholder">카드 선택</div>';
      slot.classList.remove('filled');
    }
  }

  // 조합 가능한 카드 목록 가져오기
  getAvailableCardsForFusion() {
    // 서버 컬렉션 데이터만 사용
    if (!this.game.collectionSystem.serverCollectionData || this.game.collectionSystem.serverCollectionData.length === 0) {
      console.log('❌ 서버 컬렉션 데이터가 없습니다');
      return [];
    }

    console.log('✅ 서버 컬렉션 데이터:', this.game.collectionSystem.serverCollectionData);

    // 🔒 1장 이상 보유한 카드만 조합에 사용 가능
    const availableCards = this.game.collectionSystem.serverCollectionData
      .filter(ownedCard => ownedCard.count > 0) // 0장인 카드 제외
      .map(ownedCard => ({
        ...ownedCard,
        count: ownedCard.count
      }));

    console.log('✅ 조합 가능한 카드들:', availableCards);
    return availableCards;
  }

  // 조합 확률 계산
  calculateFusionProbability(selectedCards) {
    if (selectedCards.length < this.minFusionCards) {
      return { success: false, message: `최소 ${this.minFusionCards}장의 카드가 필요합니다.` };
    }

    if (selectedCards.length > this.maxFusionCards) {
      return { success: false, message: `최대 ${this.maxFusionCards}장의 카드만 선택할 수 있습니다.` };
    }

    // 기본 확률 계산 (간단한 버전)
    const baseSuccessRate = Math.min(0.95, 0.3 + (selectedCards.length - this.minFusionCards) * 0.1);
    
    // 랭크별 가중치 계산
    const rankWeights = {
      'SSS': 1.0,
      'SS': 0.8,
      'S': 0.6,
      'A': 0.4,
      'B': 0.2
    };

    const averageRank = selectedCards.reduce((sum, card) => sum + (rankWeights[card.rank] || 0), 0) / selectedCards.length;
    const finalSuccessRate = Math.min(0.95, baseSuccessRate * (0.5 + averageRank * 0.5));

    return {
      success: true,
      successRate: finalSuccessRate,
      message: `조합 성공률: ${Math.round(finalSuccessRate * 100)}%`
    };
  }

  // 조합 정보 업데이트
  updateFusionInfo() {
    const filledSlots = this.selectedFusionCards.filter(card => card !== null);
    const fusionButton = document.getElementById('fusionButton');
    if (!fusionButton) {
      console.error('❌ fusionButton 요소를 찾을 수 없음');
      return;
    }

    const result = this.calculateFusionProbability(filledSlots);

    if (result.success) {
      this.currentProbabilities = result;
      fusionButton.disabled = false;
    } else {
      this.currentProbabilities = null;
      fusionButton.disabled = true;
    }
  }

  // 조합 실행
  async performFusion() {
    console.log('🎯 performFusion 시작');

    // 🛡️ 중복 실행 방지
    if (this.isFusionInProgress) {
      console.log('❌ 이미 조합 진행 중');
      return;
    }

    const filledSlots = this.selectedFusionCards.filter(card => card !== null);
    console.log('선택된 카드들:', filledSlots);

    if (filledSlots.length < this.minFusionCards) {
      console.log('❌ 카드 수 부족:', filledSlots.length, '/', this.minFusionCards);
      alert(`최소 ${this.minFusionCards}장의 카드를 선택해주세요!`);
      return;
    }

    // 🔒 조합 진행 상태 설정
    this.isFusionInProgress = true;
    this.updateFusionButtonState(true);

    try {
      // 서버에서 조합 실행
      const materialCardIds = filledSlots.map(card => card.id);

      const result = await this.game.apiClient.commitFusion(materialCardIds);
      console.log('🔧 API 응답 전체:', JSON.stringify(result, null, 2));

      // 🔧 조합 엔진 v3.0 응답 처리
      let fusionSuccess = false;
      let resultCard = null;
      let successRate = 0;

      if (result && typeof result === 'object') {
        // 조합 엔진 v3.0 응답 구조
        fusionSuccess = result.fusionSuccess || false;
        resultCard = result.resultCard || null;
        successRate = result.probabilities ? Object.values(result.probabilities).reduce((sum, prob) => sum + prob, 0) : 0;

        console.log('✅ 조합 엔진 v3.0 응답 파싱 완료');
        console.log('📊 확률:', result.probabilities);
        console.log('📊 등급 분포:', result.rankDistribution);
      }

      // 조합 결과 표시
      this.showFusionResult(
        fusionSuccess, 
        resultCard, 
        successRate, 
        filledSlots
      );

      if (fusionSuccess !== undefined) {
        console.log('✅ 조합 API 성공, 룰렛 표시');
        console.log('🔧 fusionSuccess:', fusionSuccess);
        console.log('🔧 resultCard:', resultCard);

        // 조합 결과에 따른 효과음 재생 (항상 성공)
        try {
          if (resultCard) {
            window.gameUtils.playSound('fusion_success');
          }
        } catch (soundError) {
          console.error('효과음 재생 에러:', soundError);
        }
      } else {
        console.error('❌ 조합 결과를 파싱할 수 없음:', result);
      }

      // 조합 결과에 관계없이 서버 컬렉션 데이터 업데이트
      try {
        await this.game.collectionSystem.loadCollectionFromServer();
      } catch (loadError) {
        console.error('컬렉션 데이터 로드 오류:', loadError);
      }

      // 조합창도 업데이트 (사용된 카드들이 사라지도록)
      try {
        this.initFusionUI();
      } catch (uiError) {
        console.error('조합 UI 초기화 오류:', uiError);
      }

    } catch (error) {
      console.error('조합 실행 실패:', error);
      alert('조합 실행 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      // 🔓 조합 진행 상태 해제
      this.isFusionInProgress = false;
      this.updateFusionButtonState(false);
    }
  }

  // 조합 버튼 상태 업데이트 (로딩 스피너 포함)
  updateFusionButtonState(isLoading) {
    const executeButton = document.querySelector('.execute-fusion-btn');
    if (!executeButton) return;

    if (isLoading) {
      executeButton.innerHTML = `
        <div class="fusion-loading">
          <div class="spinner"></div>
          <span>조합 중...</span>
        </div>
      `;
      executeButton.disabled = true;
    } else {
      executeButton.innerHTML = '조합 실행';
      executeButton.disabled = false;
    }
  }

  // 조합 결과 표시
  showFusionResult(success, resultCard, successRate, materialCards) {
    const modal = document.getElementById('fusionResultModal');
    const resultCardDiv = document.getElementById('resultCardDisplay');
    const resultMessage = document.getElementById('resultMessage');

    if (!modal || !resultCardDiv || !resultMessage) return;

    if (success && resultCard) {
      // 성공한 경우
      resultCardDiv.innerHTML = `
        <div class="result-card">
          <img src="${resultCard.image}" alt="${resultCard.name}" class="result-card-image">
          <div class="result-card-info">
            <h3>${resultCard.name}</h3>
            <div class="result-card-rank">${resultCard.rank}</div>
          </div>
        </div>
      `;
      resultMessage.innerHTML = `
        <div class="success-message">
          <h2>🎉 조합 성공!</h2>
          <p>새로운 카드를 획득했습니다!</p>
        </div>
      `;
    } else {
      // 실패한 경우
      resultCardDiv.innerHTML = `
        <div class="result-card failed">
          <div class="failed-icon">💥</div>
          <div class="result-card-info">
            <h3>조합 실패</h3>
            <p>다시 시도해보세요!</p>
          </div>
        </div>
      `;
      resultMessage.innerHTML = `
        <div class="failure-message">
          <h2>😢 조합 실패</h2>
          <p>카드가 소모되었지만 새로운 카드를 얻지 못했습니다.</p>
        </div>
      `;
    }

    modal.style.display = 'flex';
  }

  // 조합 결과 숨기기
  hideFusionResult() {
    const modal = document.getElementById('fusionResultModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
}

// 전역 조합 시스템 인스턴스 생성 함수
window.createFusionSystem = function(gameInstance) {
  return new FusionSystem(gameInstance);
};
