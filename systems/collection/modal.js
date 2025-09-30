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

    // 모달 생성
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
          <div class="card-detail-image">
            <img src="assets/illust/${card.id.toString().padStart(3, '0')}.png" 
                 alt="${card.name}" 
                 class="detail-card-image"
                 onerror="this.src='assets/illust/000.png'">
            <div class="duplicate-count-badge">${duplicateCount}개</div>
          </div>
          <div class="card-detail-info">
            <div class="detail-rank rank-${card.rank.toLowerCase()}">${card.rank}</div>
            <p class="detail-description">${card.description}</p>
            <div class="detail-stats">
              <div class="stat-row">
                <span class="stat-label">카드 ID:</span>
                <span class="stat-value">${card.id}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">등급:</span>
                <span class="stat-value">${card.rank}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">보유 개수:</span>
                <span class="stat-value">${duplicateCount}개</span>
              </div>
            </div>
            <div class="modal-actions">
              <button class="export-btn" onclick="window.game.collectionModalSystem.exportCardToPNG(${JSON.stringify(card).replace(/"/g, '&quot;')}, ${duplicateCount})">
                PNG 내보내기
              </button>
            </div>
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
