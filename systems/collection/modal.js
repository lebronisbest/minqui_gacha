// 민킈 카드 가챠게임 - 컬렉션 모달 관련 함수들
class CollectionModalSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 카드 상세 정보 모달 표시
  showCardDetail(card, duplicateCount = 1) {
    // 기존 모달이 있으면 제거
    const existingModal = document.querySelector('.card-detail-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // 랭크 정보 가져오기
    const rankInfo = this.game.gameData.ranks[card.rank];
    const hp = Math.floor((card.baseHp || card.base_hp || 100) * (rankInfo?.hpMultiplier || 1));
    const attack = Math.floor((card.baseAttack || card.base_attack || 100) * (rankInfo?.attackMultiplier || 1));
    const skill = card.attacks && card.attacks[0];
    const imagePath = card.image?.startsWith('assets/') ? card.image : `assets/${card.image || 'illust/' + card.id.toString().padStart(3, '0') + '.png'}`;
    const typeIcon = this.game.gameData?.typeIcons?.[card.type] || '';
    const typeDisplay = typeIcon ? `${typeIcon} ${card.type}` : (card.type || 'Normal');

    // 모달 생성 - 가챠 탭과 동일한 카드 디자인 사용
    const modal = document.createElement('div');
    modal.className = 'card-detail-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>${card.name}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="card-wrapper-modal">
            <div class="card-front">
              <!-- 배경 일러스트 -->
              <div class="card-background-illustration">
                <img src="${imagePath}" alt="${card.name} 배경 일러스트" class="background-illust">
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

              <!-- 중복 카운트 배지 -->
              <div class="duplicate-count-badge-modal">${duplicateCount}개 보유</div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="export-btn" onclick="window.game.collectionSystem.modalSystem.exportCardToPNG(${JSON.stringify(card).replace(/"/g, '&quot;')}, ${duplicateCount})">
              PNG 내보내기
            </button>
          </div>
        </div>
      </div>
    `;

    // 모달을 body에 추가
    document.body.appendChild(modal);

    // 모달 표시 애니메이션
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    // 닫기 버튼 이벤트
    const closeBtn = modal.querySelector('.modal-close');
    const backdrop = modal.querySelector('.modal-backdrop');
    
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
      }, 300);
    };

    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);

    // ESC 키로 닫기
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 카드 이미지 클릭 시 확대
    const cardImage = modal.querySelector('.detail-card-image');
    if (cardImage) {
      cardImage.addEventListener('click', () => {
        this.showCardImageModal(card);
      });
    }
  }

  // 카드 이미지 확대 모달
  showCardImageModal(card) {
    const imageModal = document.createElement('div');
    imageModal.className = 'card-image-modal';
    imageModal.innerHTML = `
      <div class="image-modal-backdrop"></div>
      <div class="image-modal-content">
        <img src="assets/illust/${card.id.toString().padStart(3, '0')}.png" 
             alt="${card.name}" 
             class="enlarged-card-image"
             onerror="this.src='assets/illust/000.png'">
        <button class="image-modal-close">&times;</button>
      </div>
    `;

    document.body.appendChild(imageModal);

    // 애니메이션
    setTimeout(() => {
      imageModal.classList.add('show');
    }, 10);

    // 닫기 이벤트
    const closeImageModal = () => {
      imageModal.classList.remove('show');
      setTimeout(() => {
        imageModal.remove();
      }, 300);
    };

    imageModal.querySelector('.image-modal-close').addEventListener('click', closeImageModal);
    imageModal.querySelector('.image-modal-backdrop').addEventListener('click', closeImageModal);

    // ESC 키로 닫기
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeImageModal();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
  }

  // 카드 PNG 내보내기
  async exportCardToPNG(card, duplicateCount = 1) {
    try {
      // 로딩 상태 표시
      const exportBtn = document.querySelector('.export-btn');
      if (exportBtn) {
        exportBtn.textContent = '내보내는 중...';
        exportBtn.disabled = true;
      }

      // 카드 이미지 로드
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `assets/illust/${card.id.toString().padStart(3, '0')}.png`;
      });

      // 캔버스 생성
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 캔버스 크기 설정 (카드 이미지 크기)
      canvas.width = img.width;
      canvas.height = img.height;

      // 배경 그리기
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 카드 이미지 그리기
      ctx.drawImage(img, 0, 0);

      // 중복 개수 표시 (우상단)
      if (duplicateCount > 1) {
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(canvas.width - 60, 10, 50, 30);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${duplicateCount}`, canvas.width - 35, 30);
      }

      // 등급 표시 (좌상단)
      ctx.fillStyle = this.getRankColor(card.rank);
      ctx.fillRect(10, 10, 80, 30);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(card.rank, 50, 30);

      // PNG로 변환 및 다운로드
      const link = document.createElement('a');
      link.download = `${card.name}_${card.rank}_x${duplicateCount}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // 성공 메시지
      this.game.gameUtils.showNotification('카드가 성공적으로 내보내졌습니다!', 'success');

    } catch (error) {
      console.error('카드 내보내기 실패:', error);
      this.game.gameUtils.showNotification('카드 내보내기에 실패했습니다.', 'error');
    } finally {
      // 버튼 상태 복원
      const exportBtn = document.querySelector('.export-btn');
      if (exportBtn) {
        exportBtn.textContent = 'PNG 내보내기';
        exportBtn.disabled = false;
      }
    }
  }

  // 등급별 색상 반환
  getRankColor(rank) {
    const colors = {
      'SSS': '#ff6b6b',
      'SS': '#ffa500',
      'S': '#ffff00',
      'A': '#00ff00',
      'B': '#00bfff'
    };
    return colors[rank] || '#666666';
  }
}

// 전역 함수로 생성
window.createCollectionModalSystem = function(gameInstance) {
  return new CollectionModalSystem(gameInstance);
};
