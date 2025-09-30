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
      const isOwned = Array.isArray(serverData) && serverData.length > 0 && serverData.some(item => item.card_id === card.id);
      const duplicateCount = isOwned ?
        (Array.isArray(serverData) ? serverData.find(item => item.card_id === card.id)?.duplicate_count || 1 : 0) : 0;

      const cardElement = this.createCollectionCardElement(card, isOwned, duplicateCount);
      container.appendChild(cardElement);
    });
  }

  // 컬렉션 카드 요소 생성
  createCollectionCardElement(card, isOwned, overrideDuplicateCount = null) {
    const cardElement = document.createElement('div');
    cardElement.className = `collection-card ${isOwned ? 'owned' : 'unowned'}`;
    cardElement.dataset.cardId = card.id;

    const duplicateCount = overrideDuplicateCount !== null ? overrideDuplicateCount :
      (isOwned ? this.game.collectionSystem.serverCollectionData.find(item => item.card_id === card.id)?.duplicate_count || 1 : 0);

    // 랭크 정보 가져오기
    const rankInfo = this.game.gameData.ranks[card.rank];
    const hp = Math.floor((card.baseHp || card.base_hp || 100) * (rankInfo?.hpMultiplier || 1));
    const attack = Math.floor((card.baseAttack || card.base_attack || 100) * (rankInfo?.attackMultiplier || 1));
    const skill = card.attacks && card.attacks[0];
    const imagePath = card.image?.startsWith('assets/') ? card.image : `assets/${card.image || 'illust/' + card.id.toString().padStart(3, '0') + '.png'}`;
    const typeIcon = this.game.gameData?.typeIcons?.[card.type] || '';
    const typeDisplay = typeIcon || (card.type || 'Normal');

    // 가챠 탭과 동일한 카드 앞면 디자인 사용
    cardElement.innerHTML = `
      <div class="card-wrapper-collection">
        <div class="card-front">
          <!-- 배경 일러스트 -->
          <div class="card-background-illustration">
            <img src="${imagePath}" alt="${card.name} 배경 일러스트" class="background-illust"
                 onload="console.log('이미지 로드 성공:', this.src)"
                 onerror="console.error('이미지 로드 실패:', this.src); this.src='assets/illust/000.png'">
          </div>
          <!-- 글로스 효과 -->
          <div class="card__gloss" aria-hidden="true"></div>

          <!-- 카드 정보 박스 -->
          <div class="card-info-box">
            <div class="card-number-box">
              <div class="card-number">#${card.id}</div>
            </div>
            <div class="card-name">${card.name}</div>
          </div>

          <!-- 카드 정보 박스 오버레이 -->
          <div class="card-info-box-overlay">
            <div class="card-number-box">
              <div class="card-number">#${card.id}</div>
            </div>
            <div class="card-name">${card.name}</div>
          </div>

          <!-- 랭크 표시 -->
          <div class="card-rank">
            <img src="assets/illust/${card.rank}.png" alt="${card.rank} 랭크" class="rank-image">
          </div>

          <!-- 하단 투명 박스 -->
          <div class="card-bottom-overlay">
            <div class="stats-container">
              <div class="stat-item hp-item">
                <span class="stat-label">HP</span>
                <span class="stat-value">${hp}</span>
              </div>
              <div class="stat-item attack-item">
                <span class="stat-label">공격력</span>
                <span class="stat-value">${attack}</span>
              </div>
              <div class="stat-item type-item">
                <span class="stat-value">${typeDisplay}</span>
              </div>
            </div>

            <!-- 스킬 박스 -->
            <div class="skill-box">
              <div class="skill-name">${skill?.name || '창작 마법'}</div>
              <div class="skill-description">${skill?.description || '무한한 상상력으로 새로운 세계를 창조한다.'}</div>
            </div>
          </div>

          <!-- 캐릭터 이미지 -->
          <div class="card-character">
            <img src="${imagePath.replace('.png', '_2.png')}" alt="${card.name} 캐릭터" class="character-illust" onerror="this.style.display='none'">
          </div>

          <!-- 보유 상태 배지 -->
          ${isOwned ? `<div class="owned-badge-collection">보유 ${duplicateCount}개</div>` : '<div class="unowned-badge-collection">미보유</div>'}
        </div>
      </div>
    `;

    // 카드 클릭 이벤트
    cardElement.addEventListener('click', () => {
      if (isOwned) {
        this.game.collectionSystem.modalSystem.showCardDetail(card, duplicateCount);
      } else {
        this.game.miscSystem.showUnownedCardInfo(card);
      }
    });

    // 호버 효과
    cardElement.addEventListener('mouseenter', () => {
      cardElement.style.transform = 'translateY(-5px)';
    });

    cardElement.addEventListener('mouseleave', () => {
      cardElement.style.transform = 'translateY(0)';
    });

    return cardElement;
  }

  // 모바일 컬렉션 카드들 렌더링
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

    // 카드들 렌더링
    filteredCards.forEach(card => {
      const isOwned = this.game.collectionSystem.serverCollectionData.some(item => item.card_id === card.id);
      const duplicateCount = isOwned ? 
        this.game.collectionSystem.serverCollectionData.find(item => item.card_id === card.id)?.duplicate_count || 1 : 0;
      
      const cardElement = this.createMobileCollectionCardElement(card, isOwned, duplicateCount);
      container.appendChild(cardElement);
    });
  }

  // 모바일 컬렉션 카드 요소 생성
  createMobileCollectionCardElement(card, isOwned, duplicateCount = 0) {
    const cardElement = document.createElement('div');
    cardElement.className = `mobile-collection-card ${isOwned ? 'owned' : 'unowned'}`;
    cardElement.dataset.cardId = card.id;

    cardElement.innerHTML = `
      <div class="mobile-card-image-container">
        <img src="assets/illust/${card.id.toString().padStart(3, '0')}.png" 
             alt="${card.name}" 
             class="mobile-card-image"
             onerror="this.src='assets/illust/000.png'">
        ${isOwned ? `<div class="mobile-duplicate-count">${duplicateCount}</div>` : ''}
        ${isOwned ? '<div class="mobile-owned-badge">보유</div>' : '<div class="mobile-unowned-badge">미보유</div>'}
      </div>
      <div class="mobile-card-info">
        <h3 class="mobile-card-name">${card.name}</h3>
        <p class="mobile-card-rank rank-${card.rank.toLowerCase()}">${card.rank}</p>
      </div>
    `;

    // 카드 클릭 이벤트
    cardElement.addEventListener('click', () => {
      if (isOwned) {
        this.game.collectionSystem.modalSystem.showCardDetail(card, duplicateCount);
      } else {
        this.game.miscSystem.showUnownedCardInfo(card);
      }
    });

    return cardElement;
  }
}

// 전역 함수로 생성
window.createCollectionRenderSystem = function(gameInstance) {
  return new CollectionRenderSystem(gameInstance);
};
