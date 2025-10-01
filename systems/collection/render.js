// 민킈 카드 가챠게임 - 컬렉션 렌더링 관련 함수들
class CollectionRenderSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 컬렉션 카드들 렌더링
  renderCollectionCards() {
    const container = document.getElementById('collectionGrid');
    if (!container) {
      console.error('컬렉션 카드 컨테이너를 찾을 수 없습니다');
      return;
    }

    console.log('게임 데이터:', this.game.gameData);
    console.log('카드 데이터:', this.game.gameData?.cards);
    
    // 필터링된 카드 목록 가져오기
    const filteredCards = this.game.collectionSystem.statsSystem.getFilteredCards();
    console.log('필터링된 카드:', filteredCards);
    
    if (!this.game.gameData || !this.game.gameData.cards) {
      container.innerHTML = '<p>카드 데이터를 불러오는 중...</p>';
      return;
    }

    // 컨테이너 초기화
    container.innerHTML = '';

    // 카드들 렌더링
    const serverData = this.game.collectionSystem.serverCollectionData || [];
    console.log('서버 컬렉션 데이터:', serverData);

    filteredCards.forEach(card => {
      const isOwned = Array.isArray(serverData) && serverData.length > 0 && serverData.some(item => item.id === card.id);
      const duplicateCount = isOwned ?
        (Array.isArray(serverData) ? serverData.find(item => item.id === card.id)?.count || 1 : 0) : 0;

      const cardElement = this.createCollectionCardElement(card, isOwned, duplicateCount);
      container.appendChild(cardElement);
    });
  }

  // 컬렉션 카드 요소 생성
  createCollectionCardElement(card, isOwned, overrideDuplicateCount = null) {
    const cardElement = document.createElement('div');
    cardElement.className = `collection-card ${isOwned ? 'owned' : 'not-owned'}`;
    cardElement.dataset.cardId = card.id;

    const duplicateCount = overrideDuplicateCount !== null ? overrideDuplicateCount :
      (isOwned ? this.game.collectionSystem.serverCollectionData.find(item => item.id === card.id)?.count || 1 : 0);

    const imagePath = card.image?.startsWith('assets/') ? card.image : `assets/${card.image || 'illust/' + card.id.toString().padStart(3, '0') + '.png'}`;

    // 랭크 정보 가져오기
    const rankInfo = this.game.gameData.ranks[card.rank];
    const hp = Math.floor((card.baseHp || card.base_hp || 100) * (rankInfo?.hpMultiplier || 1));
    const attack = Math.floor((card.baseAttack || card.base_attack || 100) * (rankInfo?.attackMultiplier || 1));
    const skill = card.attacks && card.attacks[0];
    const typeIcon = this.game.gameData?.typeIcons?.[card.type] || '';

    // 가챠 탭과 동일한 디자인으로 렌더링 (컬렉션 전용 클래스 사용)
    cardElement.innerHTML = `
      <div class="collection-card-front">
        <!-- 배경 일러스트 -->
        <div class="collection-card-background-illustration">
          <img src="${imagePath}" alt="${card.name} 배경 일러스트" class="collection-background-illust">
        </div>

        <!-- 카드 정보 박스 -->
        <div class="collection-card-info-box">
          <div class="collection-card-number-box">
            <div class="collection-card-number">#${card.id}</div>
          </div>
          <div class="collection-card-name">${card.name}</div>
        </div>

        <!-- 카드 정보 박스 오버레이 -->
        <div class="collection-card-info-box-overlay">
          <div class="collection-card-number-box">
            <div class="collection-card-number">#${card.id}</div>
          </div>
          <div class="collection-card-name">${card.name}</div>
        </div>

        <!-- 랭크 표시 -->
        <div class="collection-card-rank">
          <img src="assets/illust/${card.rank}.png" alt="${card.rank} 랭크" class="collection-rank-image">
        </div>

        <!-- 하단 투명 박스 -->
        <div class="collection-card-bottom-overlay">
          <div class="collection-stats-container">
            <div class="collection-stat-item collection-hp-item">
              <span class="collection-stat-label">HP</span>
              <span class="collection-stat-value">${hp}</span>
            </div>
            <div class="collection-stat-item collection-attack-item">
              <span class="collection-stat-label">공격력</span>
              <span class="collection-stat-value">${attack}</span>
            </div>
            <div class="collection-stat-item collection-type-item">
              <span class="collection-stat-value">${typeIcon}</span>
            </div>
          </div>

          <!-- 스킬 박스 -->
          <div class="collection-skill-box">
            <div class="collection-skill-name">${skill?.name || '창작 마법'}</div>
            <div class="collection-skill-description">${skill?.description || '무한한 상상력으로 새로운 세계를 창조한다.'}</div>
          </div>
        </div>

        <!-- 캐릭터 이미지 -->
        <div class="collection-card-character">
          <img src="${imagePath.replace('.png', '_2.png')}" alt="${card.name} 캐릭터" class="collection-character-illust" onerror="this.style.display='none'">
        </div>

        ${isOwned ? `<div class="collection-duplicate-badge">${duplicateCount}개 보유</div>` : ''}
      </div>
    `;

    // 카드 클릭 이벤트 - 보유한 카드만
    if (isOwned) {
      cardElement.addEventListener('click', () => {
        this.game.collectionSystem.modalSystem.showCardDetail(card, duplicateCount);
      });
      cardElement.style.cursor = 'pointer';
    } else {
      cardElement.style.cursor = 'default';
    }

    return cardElement;
  }

  // 모바일 컬렉션 카드들 렌더링 - 데스크톱과 동일한 구조 사용
  renderMobileCollectionCards() {
    const container = document.getElementById('mobileCollectionList');
    if (!container) return;

    // 필터링된 카드 목록 가져오기
    const filteredCards = this.game.collectionSystem.statsSystem.getFilteredCards();
    
    if (!this.game.gameData || !this.game.gameData.cards) {
      container.innerHTML = '<p>카드 데이터를 불러오는 중...</p>';
      return;
    }

    // 컨테이너 초기화
    container.innerHTML = '';

    // 카드들 렌더링 - 데스크톱과 동일한 로직 사용
    const serverData = this.game.collectionSystem.serverCollectionData || [];
    console.log('모바일 서버 컬렉션 데이터:', serverData);

    filteredCards.forEach(card => {
      const isOwned = Array.isArray(serverData) && serverData.length > 0 && serverData.some(item => item.id === card.id);
      const duplicateCount = isOwned ?
        (Array.isArray(serverData) ? serverData.find(item => item.id === card.id)?.count || 1 : 0) : 0;

      const cardElement = this.createMobileCollectionCardElement(card, isOwned, duplicateCount);
      container.appendChild(cardElement);
    });
  }

  // 모바일 컬렉션 카드 요소 생성 - 데스크톱과 동일한 구조 사용
  createMobileCollectionCardElement(card, isOwned, overrideDuplicateCount = null) {
    const cardElement = document.createElement('div');
    cardElement.className = `mobile-collection-card ${isOwned ? 'owned' : 'not-owned'}`;
    cardElement.dataset.cardId = card.id;

    const duplicateCount = overrideDuplicateCount !== null ? overrideDuplicateCount :
      (isOwned ? this.game.collectionSystem.serverCollectionData.find(item => item.id === card.id)?.count || 1 : 0);

    const imagePath = card.image?.startsWith('assets/') ? card.image : `assets/${card.image || 'illust/' + card.id.toString().padStart(3, '0') + '.png'}`;

    // 랭크 정보 가져오기
    const rankInfo = this.game.gameData.ranks[card.rank];
    const hp = Math.floor((card.baseHp || card.base_hp || 100) * (rankInfo?.hpMultiplier || 1));
    const attack = Math.floor((card.baseAttack || card.base_attack || 100) * (rankInfo?.attackMultiplier || 1));
    const skill = card.attacks && card.attacks[0];
    const typeIcon = this.game.gameData?.typeIcons?.[card.type] || '';

    // 데스크톱과 동일한 디자인으로 렌더링 (모바일 전용 클래스 사용)
    cardElement.innerHTML = `
      <div class="mobile-collection-card-front">
        <!-- 배경 일러스트 -->
        <div class="mobile-collection-card-background-illustration">
          <img src="${imagePath}" alt="${card.name} 배경 일러스트" class="mobile-collection-background-illust">
        </div>

        <!-- 카드 정보 박스 -->
        <div class="mobile-collection-card-info-box">
          <div class="mobile-collection-card-number-box">
            <div class="mobile-collection-card-number">#${card.id}</div>
          </div>
          <div class="mobile-collection-card-name">${card.name}</div>
        </div>

        <!-- 카드 정보 박스 오버레이 -->
        <div class="mobile-collection-card-info-box-overlay">
          <div class="mobile-collection-card-number-box">
            <div class="mobile-collection-card-number">#${card.id}</div>
          </div>
          <div class="mobile-collection-card-name">${card.name}</div>
        </div>

        <!-- 랭크 표시 -->
        <div class="mobile-collection-card-rank">
          <img src="assets/illust/${card.rank}.png" alt="${card.rank} 랭크" class="mobile-collection-rank-image">
        </div>

        <!-- 하단 투명 박스 -->
        <div class="mobile-collection-card-bottom-overlay">
          <div class="mobile-collection-stats-container">
            <div class="mobile-collection-stat-item mobile-collection-hp-item">
              <span class="mobile-collection-stat-label">HP</span>
              <span class="mobile-collection-stat-value">${hp}</span>
            </div>
            <div class="mobile-collection-stat-item mobile-collection-attack-item">
              <span class="mobile-collection-stat-label">공격력</span>
              <span class="mobile-collection-stat-value">${attack}</span>
            </div>
            <div class="mobile-collection-stat-item mobile-collection-type-item">
              <span class="mobile-collection-stat-value">${typeIcon}</span>
            </div>
          </div>

          <!-- 스킬 박스 -->
          <div class="mobile-collection-skill-box">
            <div class="mobile-collection-skill-name">${skill?.name || '창작 마법'}</div>
            <div class="mobile-collection-skill-description">${skill?.description || '무한한 상상력으로 새로운 세계를 창조한다.'}</div>
          </div>
        </div>

        <!-- 캐릭터 이미지 -->
        <div class="mobile-collection-card-character">
          <img src="${imagePath.replace('.png', '_2.png')}" alt="${card.name} 캐릭터" class="mobile-collection-character-illust" onerror="this.style.display='none'">
        </div>

        ${isOwned ? `<div class="mobile-collection-duplicate-badge">${duplicateCount}개 보유</div>` : ''}
      </div>
    `;

    // 카드 클릭 이벤트 - 보유한 카드만
    if (isOwned) {
      cardElement.addEventListener('click', () => {
        this.game.collectionSystem.modalSystem.showCardDetail(card, duplicateCount);
      });
      cardElement.style.cursor = 'pointer';
    } else {
      cardElement.style.cursor = 'default';
    }

    return cardElement;
  }
}

// 전역 함수로 생성
window.createCollectionRenderSystem = function(gameInstance) {
  return new CollectionRenderSystem(gameInstance);
};
