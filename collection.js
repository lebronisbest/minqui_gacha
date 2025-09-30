// 민킈 카드 가챠게임 - 컬렉션 관련 함수들
class CollectionSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.serverCollectionData = [];
  }

  // 서버에서 컬렉션 데이터 로드
  async loadCollectionFromServer() {
    try {
      const response = await this.game.apiClient.getCollection();
      // 서버에서 받은 완전한 카드 데이터를 저장
      this.serverCollectionData = response.collection || [];
      console.log('서버에서 컬렉션 로드 완료:', this.serverCollectionData.length, '장');
      console.log('컬렉션 카드 데이터:', this.serverCollectionData);
    } catch (error) {
      console.error('컬렉션 로드 실패:', error);
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
    this.updateCollectionStats();
    this.renderCollectionCards();
  }

  // 컬렉션 UI 전체 업데이트
  updateCollectionUI() {
    // 컬렉션 UI 전체 업데이트
    this.updateCollectionStats();
    this.renderCollectionCards();
    this.renderMobileCollectionCards();
  }

  // 컬렉션 통계 업데이트
  updateCollectionStats() {
    // 컬렉션 통계 업데이트
    if (!this.game.gameData || !this.game.gameData.cards) {
      console.warn('gameData가 아직 로드되지 않았습니다.');
      return;
    }
    const totalCards = this.game.gameData.cards.length;

    if (this.serverCollectionData && this.serverCollectionData.length > 0) {
      // 서버 데이터 기반 통계 (0장인 카드 제외)
      const ownedCards = this.serverCollectionData.filter(card => card.count > 0);
      const collectedCount = ownedCards.reduce((sum, card) => sum + card.count, 0);
      const uniqueCards = ownedCards.length;
      const collectionRate = Math.round((uniqueCards / totalCards) * 100);

      // 웹용 통계 업데이트
      const totalCardsEl = document.getElementById('totalCards');
      const collectionRateEl = document.getElementById('collectionRate');
      if (totalCardsEl) totalCardsEl.textContent = collectedCount;
      if (collectionRateEl) collectionRateEl.textContent = `${collectionRate}% (${uniqueCards}/${totalCards})`;
      
      // 모바일용 통계 업데이트
      const mobileTotalCards = document.getElementById('mobileTotalCards');
      const mobileCollectionRate = document.getElementById('mobileCollectionRate');
      if (mobileTotalCards) mobileTotalCards.textContent = collectedCount;
      if (mobileCollectionRate) mobileCollectionRate.textContent = `${collectionRate}%`;
    } else {
      // 서버 데이터가 없을 때
      const totalCardsEl = document.getElementById('totalCards');
      const collectionRateEl = document.getElementById('collectionRate');
      if (totalCardsEl) totalCardsEl.textContent = '0';
      if (collectionRateEl) collectionRateEl.textContent = `0% (0/${totalCards})`;
      
      // 모바일용 통계 업데이트
      const mobileTotalCards = document.getElementById('mobileTotalCards');
      const mobileCollectionRate = document.getElementById('mobileCollectionRate');
      if (mobileTotalCards) mobileTotalCards.textContent = '0';
      if (mobileCollectionRate) mobileCollectionRate.textContent = '0%';
    }
  }

  // 컬렉션 카드들 렌더링
  renderCollectionCards() {
    // 컬렉션 카드들 렌더링
    const grid = document.getElementById('collectionGrid');
    if (!grid) return;

    if (!this.game.gameData || !this.game.gameData.cards) {
      console.warn('gameData가 아직 로드되지 않았습니다.');
      return;
    }

    grid.innerHTML = '';

    // 모든 카드 렌더링
    this.game.gameData.cards.forEach(card => {
      // 해당 카드를 소유하고 있는지 확인 (0장은 소유하지 않은 것으로 처리)
      const ownedCard = this.serverCollectionData ?
        this.serverCollectionData.find(c => c.id === card.id) : null;
      const cardCount = ownedCard ? ownedCard.count : 0;
      const isOwned = cardCount > 0;
      
      const cardElement = this.createCollectionCardElement(card, isOwned);
      grid.appendChild(cardElement);
    });
  }

  // 컬렉션 카드 요소 생성
  createCollectionCardElement(card, isOwned, overrideDuplicateCount = null) {
    // 컬렉션 카드 요소 생성 - 가챠 카드와 동일한 구조
    const cardDiv = document.createElement('div');
    cardDiv.className = `collection-card ${isOwned ? 'owned' : 'not-owned'}`;
    
    
    const rankInfo = this.game.gameData.ranks[card.rank];
    const typeIcon = this.game.gameData.typeIcons?.[card.type] || '🎨';

    // 중복 횟수 계산
    const ownedCard = this.serverCollectionData ?
      this.serverCollectionData.find(c => c.id === card.id) : null;
    const duplicateCount = overrideDuplicateCount !== null ? overrideDuplicateCount : (ownedCard ? ownedCard.count : 0);
    
    // 스킬 정보
    const skill = card.attacks && card.attacks[0];
    const skillName = skill ? skill.name : '기본 공격';
    const skillDescription = skill ? skill.description : '기본 공격을 수행합니다.';

    cardDiv.innerHTML = `
      <!-- 카드 앞면 - 가챠 카드와 동일한 구조 -->
      <div class="collection-card-front">
        <!-- 배경 일러스트 -->
        <div class="collection-card-background-illustration">
          <img src="${card.image}" alt="${card.name} 배경 일러스트" class="collection-background-illust">
        </div>
        
        <!-- 카드 정보 박스 -->
        <div class="collection-card-info-box">
          <div class="collection-card-number-box">
            <div class="collection-card-number">#${card.id}</div>
          </div>
          <div class="collection-card-name">${card.name}</div>
        </div>
        
        <!-- 카드 정보 박스 오버레이 - 가챠와 동일한 구조 -->
        <div class="collection-card-info-box-overlay">
          <div class="collection-card-number-box">
            <div class="collection-card-number">#${card.id}</div>
          </div>
          <div class="collection-card-name">${card.name}</div>
        </div>
        
        <!-- 랭크 표시 -->
        <div class="collection-card-rank">
          <img src="illust/${card.rank}.png" alt="${card.rank} 랭크" class="collection-rank-image">
        </div>
        
        <!-- 하단 투명 박스 -->
        <div class="collection-card-bottom-overlay">
          <div class="collection-stats-container">
            <div class="collection-stat-item">
              <span class="collection-stat-label">HP</span>
              <span class="collection-stat-value">${Math.floor((card.baseHp || 100) * (rankInfo?.hpMultiplier || 1))}</span>
            </div>
            <div class="collection-stat-item">
              <span class="collection-stat-label">공격력</span>
              <span class="collection-stat-value">${Math.floor((card.baseAttack || 100) * (rankInfo?.attackMultiplier || 1))}</span>
            </div>
            <div class="collection-stat-item">
              <span class="collection-stat-value">${typeIcon}</span>
            </div>
          </div>
          
          <!-- 스킬 박스 -->
          <div class="collection-skill-box">
            <div class="collection-skill-name">${skillName}</div>
            <div class="collection-skill-description">${skillDescription}</div>
          </div>
        </div>
        
        <!-- 캐릭터 -->
        <div class="collection-card-character">
          <img src="${card.image.replace('.png', '_2.png')}" alt="${card.name} 캐릭터" class="collection-character-illust">
        </div>
        
        ${isOwned ? '<div class="owned-badge">획득</div>' : ''}
        ${duplicateCount > 1 ? `<div class="duplicate-count">x${duplicateCount}</div>` : ''}
      </div>
    `;

    return cardDiv;
  }

  // 모바일용 컬렉션 카드 렌더링
  renderMobileCollectionCards() {
    const mobileList = document.getElementById('mobileCollectionList');
    if (!mobileList) return;

    mobileList.innerHTML = '';

    // 필터링된 카드들만 렌더링
    const filteredCards = this.getFilteredCards();

    filteredCards.forEach(card => {
      // 해당 카드를 소유하고 있는지 확인 (0장은 소유하지 않은 것으로 처리)
      const ownedCard = this.serverCollectionData ?
        this.serverCollectionData.find(c => c.id === card.id) : null;
      const cardCount = ownedCard ? ownedCard.count : 0;
      const isOwned = cardCount > 0;
      
      const cardElement = this.createMobileCollectionCardElement(card, isOwned, cardCount);
      mobileList.appendChild(cardElement);
    });
  }

  // 모바일용 컬렉션 카드 요소 생성
  createMobileCollectionCardElement(card, isOwned, duplicateCount = 0) {
    const cardDiv = document.createElement('div');
    cardDiv.className = `mobile-collection-card ${isOwned ? 'owned' : 'not-owned'}`;
    
    const rankInfo = this.game.gameData.ranks[card.rank];
    const typeIcon = this.game.gameData.typeIcons?.[card.type] || '🎨';

    // 스킬 정보
    const skill = card.attacks && card.attacks[0];
    const skillName = skill ? skill.name : '기본 공격';
    const skillDescription = skill ? skill.description : '기본 공격을 수행합니다.';

    cardDiv.innerHTML = `
      <!-- 카드 앞면 - 가챠 카드와 동일한 구조 -->
      <div class="mobile-collection-card-front">
        <!-- 배경 일러스트 -->
        <div class="mobile-collection-card-background-illustration">
          <img src="${card.image}" alt="${card.name} 배경 일러스트" class="mobile-background-illust">
        </div>
        
        <!-- 카드 정보 박스 -->
        <div class="mobile-collection-card-info-box">
          <div class="mobile-collection-card-number-box">
            <div class="mobile-collection-card-number">#${card.id}</div>
          </div>
          <div class="mobile-collection-card-name">${card.name}</div>
        </div>
        
        <!-- 카드 정보 박스 오버레이 - 가챠와 동일한 구조 -->
        <div class="mobile-collection-card-info-box-overlay">
          <div class="mobile-collection-card-number-box">
            <div class="mobile-collection-card-number">#${card.id}</div>
          </div>
          <div class="mobile-collection-card-name">${card.name}</div>
        </div>
        
        <!-- 랭크 표시 -->
        <div class="mobile-collection-card-rank">
          <img src="illust/${card.rank}.png" alt="${card.rank} 랭크" class="mobile-collection-rank-image">
        </div>
        
        <!-- 하단 투명 박스 -->
        <div class="mobile-collection-card-bottom-overlay">
          <div class="mobile-collection-stats-container">
            <div class="mobile-collection-stat-item">
              <span class="mobile-collection-stat-label">HP</span>
              <span class="mobile-collection-stat-value">${Math.floor((card.baseHp || 100) * (rankInfo?.hpMultiplier || 1))}</span>
            </div>
            <div class="mobile-collection-stat-item">
              <span class="mobile-collection-stat-label">공격력</span>
              <span class="mobile-collection-stat-value">${Math.floor((card.baseAttack || 100) * (rankInfo?.attackMultiplier || 1))}</span>
            </div>
            <div class="mobile-collection-stat-item">
              <span class="mobile-collection-stat-value">${typeIcon}</span>
            </div>
          </div>
          
          <!-- 스킬 박스 -->
          <div class="mobile-collection-skill-box">
            <div class="mobile-collection-skill-name">${skillName}</div>
            <div class="mobile-collection-skill-description">${skillDescription}</div>
          </div>
        </div>
        
        <!-- 캐릭터 -->
        <div class="mobile-collection-card-character">
          <img src="${card.image.replace('.png', '_2.png')}" alt="${card.name} 캐릭터" class="mobile-collection-character-illust">
        </div>
        
        ${isOwned ? '<div class="mobile-owned-badge">획득</div>' : ''}
        ${duplicateCount > 1 ? `<div class="mobile-duplicate-count">x${duplicateCount}</div>` : ''}
      </div>
    `;

    return cardDiv;
  }

  // 필터링된 카드 목록 가져오기
  getFilteredCards() {
    if (!this.game.gameData || !this.game.gameData.cards) {
      console.warn('gameData가 아직 로드되지 않았습니다.');
      return [];
    }
    
    const currentFilter = this.game.currentFilter || 'all';
    
    if (currentFilter === 'all') {
      return this.game.gameData.cards;
    }
    
    return this.game.gameData.cards.filter(card => card.rank === currentFilter);
  }

  // 필터 설정
  setFilter(filter) {
    this.game.currentFilter = filter;
    
    // 필터 버튼 활성화 상태 업데이트
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // 컬렉션 카드 다시 렌더링
    this.renderCollectionCards();
  }

  // 모바일 필터 설정
  setMobileFilter(filter) {
    this.game.currentFilter = filter;
    
    // 모바일 필터 버튼 활성화 상태 업데이트
    document.querySelectorAll('.mobile-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    // 모바일 컬렉션 카드 다시 렌더링
    this.renderMobileCollectionCards();
  }
}

// 전역 컬렉션 시스템 인스턴스 생성 함수
window.createCollectionSystem = function(gameInstance) {
  return new CollectionSystem(gameInstance);
};
