// 민킈 카드 가챠게임 - 모달 관련 함수들
class ModalSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 카드 상세 정보 모달 표시
  showCardDetail(card, duplicateCount = 1) {
    const modal = document.getElementById('cardDetailModal');
    if (!modal) return;

    const rankInfo = this.game.gameData.ranks[card.rank];
    const emoji = rankInfo ? rankInfo.emoji : '⭐';
    
    // 모달 내용 업데이트
    modal.querySelector('.card-detail-image').src = card.image;
    modal.querySelector('.card-detail-image').alt = card.name;
    modal.querySelector('.card-detail-name').textContent = card.name;
    modal.querySelector('.card-detail-type').textContent = card.type;
    modal.querySelector('.card-detail-rank').textContent = card.rank;
    modal.querySelector('.card-detail-rank').className = `card-detail-rank rank-${card.rank.toLowerCase()}`;
    modal.querySelector('.card-detail-emoji').textContent = emoji;
    modal.querySelector('.card-detail-hp').textContent = card.baseHp;
    modal.querySelector('.card-detail-attack').textContent = card.baseAttack;
    modal.querySelector('.card-detail-duplicate').textContent = duplicateCount;
    
    // 공격 스킬 정보 업데이트
    const attacksContainer = modal.querySelector('.card-detail-attacks');
    attacksContainer.innerHTML = '';
    
    if (card.attacks && card.attacks.length > 0) {
      card.attacks.forEach(attack => {
        const attackDiv = document.createElement('div');
        attackDiv.className = 'attack-item';
        attackDiv.innerHTML = `
          <div class="attack-name">${attack.name}</div>
          <div class="attack-description">${attack.description}</div>
        `;
        attacksContainer.appendChild(attackDiv);
      });
    } else {
      attacksContainer.innerHTML = '<div class="no-attacks">공격 스킬 정보가 없습니다.</div>';
    }
    
    // PNG 내보내기 버튼 이벤트
    const exportButton = modal.querySelector('#exportPngButton');
    exportButton.onclick = () => {
      this.exportCardToPNG(card, duplicateCount);
    };
    
    // 모달 표시
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  // 카드 상세 정보 모달 숨기기
  hideCardDetail() {
    const modal = document.getElementById('cardDetailModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
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
      const cardElement = this.game.collectionSystem.createCollectionCardElement(card, true, duplicateCount);
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
      if (this.isMobileDevice()) {
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
                <div class="download-info">이미지를 길게 눌러서 저장하세요</div>
                <img src="${dataURL}" alt="${card.name} 카드" />
              </div>
            </body>
          </html>
        `);
        window.gameUtils.showNotification(`${card.name} 카드가 새 창에서 열렸습니다!`, 'success');
      } else {
        // 데스크톱: 직접 다운로드
        const link = document.createElement('a');
        link.download = `${card.name}_${card.id}.png`;
        link.href = dataURL;
        link.click();
        window.gameUtils.showNotification(`${card.name} 카드 이미지가 다운로드되었습니다!`, 'success');
      }

    } catch (error) {
      console.error('PNG 내보내기 오류:', error);
      window.gameUtils.showNotification('이미지 내보내기 중 오류가 발생했습니다.', 'error');
    } finally {
      // 버튼 상태 복원
      const exportButton = document.getElementById('exportPngButton');
      exportButton.textContent = originalText;
      exportButton.disabled = false;
    }
  }

  // 시크릿 모드 알림 표시
  showSecretModeNotification() {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.secret-mode-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = 'secret-mode-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        box-shadow: 0 10px 30px rgba(255, 107, 107, 0.5);
        z-index: 10000;
        animation: secretModePulse 0.5s ease-out;
      ">
        🎉 시크릿 모드 활성화! 🎉<br>
        <small style="font-size: 14px; opacity: 0.9;">무한 가챠가 가능합니다!</small>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 3초 후 제거
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  // 모바일 디바이스 감지
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
}

// 전역 모달 시스템 인스턴스 생성 함수
window.createModalSystem = function(gameInstance) {
  return new ModalSystem(gameInstance);
};
