// 민킈 카드 가챠게임 - 시크릿 코드 관련 함수들
class SecretSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.secretCode = 'minqui';
    this.enteredCode = '';
    this.isSecretMode = false;
  }

  // 시크릿 코드 초기화
  initSecretCode() {
    // keyup 이벤트로 한글 입력 감지 (조합 완료 후)
    document.addEventListener('keyup', (event) => {
      this.handleSecretCodeKeyup(event);
    });
    
    // keydown 이벤트로 영문 입력 감지 (실시간)
    document.addEventListener('keydown', (event) => {
      this.handleSecretCode(event);
    });
  }

  // 시크릿 코드 키업 이벤트 처리 (한글 입력용)
  handleSecretCodeKeyup(event) {
    // 한글 입력이 완료된 후 처리
    if (event.key && event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
      this.enteredCode += event.key.toLowerCase();
      
      // 시크릿 코드 확인
      if (this.enteredCode === this.secretCode) {
        this.activateSecretMode();
      }
      
      // 코드가 너무 길어지면 초기화
      if (this.enteredCode.length > this.secretCode.length) {
        this.enteredCode = '';
      }
    }
  }

  // 시크릿 코드 키다운 이벤트 처리 (영문 입력용)
  handleSecretCode(event) {
    // 백스페이스 처리
    if (event.key === 'Backspace') {
      this.enteredCode = this.enteredCode.slice(0, -1);
      return;
    }
    
    // 영문자만 처리
    if (event.key && event.key.length === 1) {
      this.enteredCode += event.key.toLowerCase();
      
      // 시크릿 코드 확인
      if (this.enteredCode === this.secretCode) {
        this.activateSecretMode();
      }
      
      // 코드가 너무 길어지면 초기화
      if (this.enteredCode.length > this.secretCode.length) {
        this.enteredCode = '';
      }
    }
  }

  // 시크릿 모드 활성화
  activateSecretMode() {
    this.isSecretMode = true;
    this.enteredCode = ''; // 코드 초기화
    
    // 시각적 피드백
    this.game.modalSystem.showSecretModeNotification();
    
    // 카드 클릭 가능 여부 업데이트
    this.game.updateCardClickability();
    
    // 티켓 표시 업데이트
    this.game.dataSystem.updateTicketDisplay();
  }
}

// 전역 시크릿 시스템 인스턴스 생성 함수
window.createSecretSystem = function(gameInstance) {
  return new SecretSystem(gameInstance);
};
