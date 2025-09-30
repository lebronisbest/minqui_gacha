// 민킈 카드 가챠게임 - 이벤트 핸들러 관련 함수들
class EventSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 이벤트 리스너 등록
  bindEvents() {
    // 클릭 이벤트
    this.game.cardWrapper.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleClick();
    });
    
    // 터치 이벤트 추가 (모바일 최적화)
    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };
    
    this.game.cardWrapper.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      touchStartPos = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    });
    
    this.game.cardWrapper.addEventListener('touchend', (e) => {
      const touchEndTime = Date.now();
      const touchEndPos = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY
      };
      
      const touchDuration = touchEndTime - touchStartTime;
      const touchDistance = Math.sqrt(
        Math.pow(touchEndPos.x - touchStartPos.x, 2) + 
        Math.pow(touchEndPos.y - touchStartPos.y, 2)
      );
      
      // 짧은 터치만 클릭으로 인식 (스와이프 방지)
      if (touchDuration < 300 && touchDistance < 50) {
        this.handleClick();
      }
      this.resetTilt();
    });
    
    // 3D 마우스 인터랙션 - 카드 래퍼에 적용
    this.game.cardWrapper.addEventListener('mousemove', (e) => {
      this.handleMouseMove(e);
    });

    // 탭 클릭 이벤트
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = e.target.dataset.tab;
        if (tabName) {
          this.game.coreSystem.switchTab(tabName);
        }
      });
    });
    
    this.game.cardWrapper.addEventListener('mouseleave', () => {
      this.resetTilt();
    });
    
    // 모바일 터치 인터랙션 (3D 효과)
    this.game.cardWrapper.addEventListener('touchmove', (e) => {
      e.preventDefault();
      
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
      }
    });
    
    // 터치 종료 시 틸트 리셋
    this.game.cardWrapper.addEventListener('touchend', () => {
      this.resetTilt();
    });
    
    // 터치 취소 시에도 리셋
    this.game.cardWrapper.addEventListener('touchcancel', () => {
      this.resetTilt();
    });
    
    // 선택 및 드래그 이벤트 차단
    this.game.cardWrapper.addEventListener('selectstart', (e) => {
      e.preventDefault();
    });
    
    this.game.cardWrapper.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });
    
    // 컬렉션 필터 이벤트
    document.querySelectorAll('.filter-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        this.game.collectionSystem.filterSystem.setFilter(e.target.dataset.filter);
      });
    });
    
    // 모바일 필터 이벤트
    document.querySelectorAll('.mobile-filter-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        this.game.collectionSystem.filterSystem.setMobileFilter(e.target.dataset.filter);
      });
    });
  }

  // 마우스 이동 이벤트 처리 (3D 틸트 효과)
  handleMouseMove(e) {
    const rect = this.game.cardWrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // 마우스 위치를 -1 ~ 1 범위로 정규화
    const tiltX = (mouseY / rect.height) * 2;
    const tiltY = (mouseX / rect.width) * 2;
    
    // 최대 틸트 각도 제한 (15도)
    const maxTilt = 15;
    const tiltRX = Math.max(-maxTilt, Math.min(maxTilt, tiltX * maxTilt));
    const tiltRY = Math.max(-maxTilt, Math.min(maxTilt, -tiltY * maxTilt));
    
    // CSS 변수로 3D 변환 적용
    this.game.cardWrapper.style.setProperty('--tilt-rx', `${tiltRX}deg`);
    this.game.cardWrapper.style.setProperty('--tilt-ry', `${tiltRY}deg`);
    
    // 글로우 효과 위치 계산
    const glossX = (mouseX / rect.width) + 0.5;
    const glossY = (mouseY / rect.height) + 0.5;
    
    this.game.cardWrapper.style.setProperty('--gloss-x', glossX.toString());
    this.game.cardWrapper.style.setProperty('--gloss-y', glossY.toString());
    
    // 홀로그램 효과 강도 계산
    const tiltIntensity = Math.sqrt(tiltX * tiltX + tiltY * tiltY);
    const holoIntensity = 0.2 + (tiltIntensity / 24) * 0.3; // 0.2~0.5 (더 강하게)
    
    this.game.cardWrapper.style.setProperty('--holo-intensity', holoIntensity);
    this.game.cardWrapper.style.setProperty('--gloss-alpha', 0.1 + (tiltIntensity / 24) * 0.3); // 0.1~0.4 (더 강하게)
    this.game.cardWrapper.style.setProperty('--shadow-elevation', 1 + (tiltIntensity / 24)); // 1~2
  }

  // 3D 틸트 효과 제거
  resetTilt() {
    this.game.cardWrapper.style.setProperty('--tilt-rx', '0deg');
    this.game.cardWrapper.style.setProperty('--tilt-ry', '0deg');
    
    this.game.cardWrapper.style.setProperty('--gloss-x', '0.5');
    this.game.cardWrapper.style.setProperty('--gloss-y', '0.5');
    this.game.cardWrapper.style.setProperty('--holo-intensity', '0.2');
    this.game.cardWrapper.style.setProperty('--gloss-alpha', '0.1');
    this.game.cardWrapper.style.setProperty('--shadow-elevation', '1');
  }

  // 클릭 이벤트 처리
  handleClick() {
    // 가챠 시스템으로 위임
    this.game.gachaSystem.handleClick();
  }
}

// 전역 이벤트 시스템 인스턴스 생성 함수
window.createEventSystem = function(gameInstance) {
  return new EventSystem(gameInstance);
};
