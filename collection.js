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

  // 카드 상세 정보 표시
  showCardDetail(card, duplicateCount = 1) {
    const modal = document.getElementById('cardDetailModal');
    const modalTitle = document.getElementById('modalCardTitle');
    const detailCardDisplay = document.getElementById('detailCardDisplay');
    const cardStatsInfo = document.getElementById('cardStatsInfo');
    const exportPngButton = document.getElementById('exportPngButton');
    const closeModalButton = document.getElementById('closeModalButton');
    const cardDetailCloseBtn = document.getElementById('cardDetailCloseBtn');
    const cardDetailOverlay = document.getElementById('cardDetailOverlay');

    if (!modal) return;

    const rankInfo = this.game.gameData.ranks[card.rank];
    const typeIcon = this.game.gameData.typeIcons?.[card.type] || '🎨';
    const skill = card.attacks && card.attacks[0];
    const skillName = skill ? skill.name : '창작 마법';
    const skillDescription = skill ? skill.description : '무한한 상상력으로 새로운 세계를 창조한다.';

    // 모달 제목 설정
    modalTitle.textContent = `${card.name} ${duplicateCount > 1 ? `(x${duplicateCount})` : ''}`;

    // 카드 프리뷰 생성
    // 컬렉션 카드와 동일한 구조 사용
    const tempCardElement = this.createCollectionCardElement(card, true, duplicateCount);

    // 컬렉션 카드 비율 유지를 위한 래퍼 추가
    detailCardDisplay.innerHTML = `
      <div class="detail-card-wrapper" style="
        width: 300px;
        height: 420px;
        margin: 0 auto;
        overflow: hidden;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      ">
        ${tempCardElement.innerHTML}
      </div>
    `;

    // 내부 카드 요소에 크기 조정
    const cardElement = detailCardDisplay.querySelector('.collection-card');
    if (cardElement) {
      cardElement.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        transform: none !important;
      `;
    }

    // 스탯 정보 생성
    cardStatsInfo.innerHTML = `
      <div class="stat-section">
        <h3>기본 정보</h3>
        <div class="stat-row">
          <span class="label">카드 번호</span>
          <span class="value">#${card.id}</span>
        </div>
        <div class="stat-row">
          <span class="label">등급</span>
          <span class="value">${card.rank}</span>
        </div>
        <div class="stat-row">
          <span class="label">타입</span>
          <span class="value">${card.type} ${typeIcon}</span>
        </div>
        <div class="stat-row">
          <span class="label">보유 수량</span>
          <span class="value">${duplicateCount}장</span>
        </div>
      </div>

      <div class="stat-section">
        <h3>스탯 정보</h3>
        <div class="stat-row">
          <span class="label">HP</span>
          <span class="value">${Math.floor((card.baseHp || 100) * (rankInfo?.hpMultiplier || 1))}</span>
        </div>
        <div class="stat-row">
          <span class="label">공격력</span>
          <span class="value">${Math.floor((card.baseAttack || 100) * (rankInfo?.attackMultiplier || 1))}</span>
        </div>
        <div class="stat-row">
          <span class="label">HP 배율</span>
          <span class="value">x${rankInfo?.hpMultiplier || 1}</span>
        </div>
        <div class="stat-row">
          <span class="label">공격력 배율</span>
          <span class="value">x${rankInfo?.attackMultiplier || 1}</span>
        </div>
      </div>

      <div class="stat-section skill-info">
        <h3>스킬 정보</h3>
        <div class="stat-row">
          <span class="label">스킬명</span>
          <span class="value">${skillName}</span>
        </div>
        <div class="skill-description">${skillDescription}</div>
      </div>
    `;

    // PNG 내보내기 버튼 이벤트
    exportPngButton.onclick = () => {
      this.exportCardToPNG(card, duplicateCount);
    };

    // 모달 닫기 이벤트들
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    };

    closeModalButton.onclick = closeModal;
    cardDetailCloseBtn.onclick = closeModal;
    cardDetailOverlay.onclick = closeModal;

    // ESC 키로 모달 닫기
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscKey);
      }
    };

    document.addEventListener('keydown', handleEscKey);

    // 모달 표시
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  }

  // 카드 PNG 내보내기
  async exportCardToPNG(card, duplicateCount = 1) {
    try {
      // 로딩 상태 표시
      const exportButton = document.getElementById('exportPngButton');
      const originalText = exportButton.textContent;
      exportButton.textContent = '내보내는 중...';
      exportButton.disabled = true;

      // 임시 컨테이너 생성 (화면 밖에 배치)
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: fixed;
        top: -2000px;
        left: -2000px;
        width: 600px;
        height: 840px;
        background: transparent;
        pointer-events: none;
        z-index: -1;
      `;

      // 컬렉션 카드와 동일한 구조로 생성 (2배 크기)
      const cardElement = this.createCollectionCardElement(card, true, duplicateCount);
      cardElement.style.cssText = `
        width: 600px !important;
        height: 840px !important;
        transform: scale(1) !important;
        transform-origin: center !important;
        margin: 0 !important;
      `;

      tempContainer.appendChild(cardElement);
      document.body.appendChild(tempContainer);

      // html2canvas로 PNG 생성
      const canvas = await html2canvas(cardElement, {
        backgroundColor: null,
        scale: 1,
        width: 600,
        height: 840,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      // 임시 요소 제거
      document.body.removeChild(tempContainer);

      // PNG 다운로드
      const dataURL = canvas.toDataURL('image/png', 1.0);

      // 모바일 및 데스크톱 환경에 따른 다운로드 처리
      if (this.game.isMobileDevice()) {
        // 모바일: 새 창에서 이미지 표시
        const newWindow = window.open();
        newWindow.document.write(`
          <html>
            <head>
              <title>${card.name} 카드</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { margin: 0; padding: 20px; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                img { max-width: 100%; height: auto; border-radius: 10px; }
                .download-info { color: white; text-align: center; margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <div>
                <div class="download-info">카드를 길게 눌러 저장하세요</div>
                <img src="${dataURL}" alt="${card.name} 카드">
              </div>
            </body>
          </html>
        `);
      } else {
        // 데스크톱: 직접 다운로드
        const link = document.createElement('a');
        link.download = `${card.name}_카드.png`;
        link.href = dataURL;
        link.click();
      }

      // 버튼 상태 복원
      exportButton.textContent = originalText;
      exportButton.disabled = false;

    } catch (error) {
      console.error('PNG 내보내기 실패:', error);
      alert('PNG 내보내기에 실패했습니다.');
      
      // 버튼 상태 복원
      const exportButton = document.getElementById('exportPngButton');
      exportButton.textContent = 'PNG로 내보내기';
      exportButton.disabled = false;
    }
  }
}

// 전역 컬렉션 시스템 인스턴스 생성 함수
window.createCollectionSystem = function(gameInstance) {
  return new CollectionSystem(gameInstance);
};
