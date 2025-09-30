// 민킈 카드 가챠게임 - 유틸리티 함수들
class GameUtils {
  constructor() {
    this.sounds = {};
    this.initSounds();
  }

  // 효과음 초기화
  initSounds() {
    // 효과음 파일들 로드 (WAV 파일 사용)
    this.sounds = {
      cardFlip: new Audio('assets/sounds/card_flip.wav'),
      aObtain: new Audio('assets/sounds/a_obtain.wav'),
      bObtain: new Audio('assets/sounds/b_obtain.wav'),
      sObtain: new Audio('assets/sounds/s_obtain.wav'),
      ssObtain: new Audio('assets/sounds/ss_obtain.wav'),
      sssObtain: new Audio('assets/sounds/sss_obtain.wav'),
      holo: new Audio('assets/sounds/holo.wav'),
      particle: new Audio('assets/sounds/particle.wav'),
      fusion_success: new Audio('assets/sounds/fusion_success.wav')
    };

    // 모바일에서 오디오 컨텍스트 초기화
    this.audioContext = null;
    this.audioUnlocked = false;
  }

  // 효과음 재생
  playSound(soundName, volume = null) {
    if (this.sounds[soundName]) {
      const sound = this.sounds[soundName];
      if (volume !== null) {
        sound.volume = volume;
      }
      
      // 모바일에서 오디오 컨텍스트 초기화
      if (!this.audioUnlocked) {
        this.initAudioContext();
      }
      
      try {
        sound.currentTime = 0;
        sound.play().catch(error => {
          console.warn('효과음 재생 실패:', error);
        });
      } catch (error) {
        console.warn('효과음 재생 오류:', error);
      }
    }
  }

  // 모바일 오디오 컨텍스트 초기화
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.audioUnlocked = true;
      });
    } else {
      this.audioUnlocked = true;
    }
  }

  // 랭크별 효과음 재생
  playRankSound(rank) {
    switch (rank) {
      case 'SSS':
        this.playSound('sssObtain');
        // 홀로그램 효과음도 함께 재생
        setTimeout(() => this.playSound('holo'), 500);
        break;
      case 'SS':
        this.playSound('ssObtain');
        setTimeout(() => this.playSound('holo'), 300);
        break;
      case 'S':
        this.playSound('sObtain');
        break;
      case 'A':
        this.playSound('aObtain');
        break;
      case 'B':
        this.playSound('bObtain');
        break;
      default:
        // 카드 드로우 효과음 제거
        break;
    }
  }

  // 알림 표시
  showNotification(message, type = 'info') {
    // 간단한 알림 표시
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 스타일 적용
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-weight: bold;
      max-width: 300px;
      word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    // 3초 후 자동 제거
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  // 날짜 포맷팅
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // 1분 미만
    if (diff < 60000) {
      return '방금 전';
    }
    
    // 1시간 미만
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}분 전`;
    }
    
    // 24시간 미만
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}시간 전`;
    }
    
    // 7일 미만
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}일 전`;
    }
    
    // 그 이상은 날짜로 표시
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // 카드 이미지 내보내기
  async exportCardImage(card) {
    try {
      // 버튼 비활성화
      const exportButton = document.getElementById('exportPngButton');
      if (exportButton) {
        exportButton.disabled = true;
        exportButton.textContent = '내보내는 중...';
      }

      // 카드 요소 찾기
      const cardElement = document.querySelector('.card');
      if (!cardElement) {
        throw new Error('카드 요소를 찾을 수 없습니다.');
      }

      // html2canvas로 캡처
      const canvas = await html2canvas(cardElement, {
        backgroundColor: null,
        scale: 2, // 고해상도
        useCORS: true,
        allowTaint: true
      });

      // 모바일 환경 확인
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // 모바일: 새 창에서 열기
        const dataURL = canvas.toDataURL('image/png');
        const newWindow = window.open();
        newWindow.document.write(`
          <html>
            <head><title>${card.name} 카드</title></head>
            <body style="margin:0; padding:20px; text-align:center; background:#f0f0f0;">
              <img src="${dataURL}" style="max-width:100%; height:auto; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.3);" />
              <p style="margin-top:20px; font-family:Arial, sans-serif; color:#333;">
                ${card.name} 카드
              </p>
              <p style="font-size:12px; color:#666;">
                길게 눌러서 이미지를 저장하세요
              </p>
            </body>
          </html>
        `);
        this.showNotification(`${card.name} 카드가 새 창에서 열렸습니다!`, 'success');
      } else {
        // 데스크톱: 직접 다운로드
        const link = document.createElement('a');
        link.download = `${card.name}_카드.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        this.showNotification(`${card.name} 카드 이미지가 다운로드되었습니다!`, 'success');
      }

    } catch (error) {
      console.error('이미지 내보내기 오류:', error);
      this.showNotification('이미지 내보내기 중 오류가 발생했습니다.', 'error');
    } finally {
      // 버튼 상태 복원
      const exportButton = document.getElementById('exportPngButton');
      if (exportButton) {
        exportButton.disabled = false;
        exportButton.textContent = 'PNG로 내보내기';
      }
    }
  }
}

// 전역 유틸리티 인스턴스 생성
window.gameUtils = new GameUtils();
