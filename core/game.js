// 민킈 카드 가챠게임 - 서버 기반 버전
class MinquiCardGacha {
  constructor() {
    this.cardWrapper = document.getElementById('cardWrapper');
    this.isFlipped = false;
    this.cardData = null;
    this.sounds = {};
    this.currentFilter = 'all';
    
    // 티켓 시스템 (서버에서 관리)
    this.tickets = 0;
    this.maxTickets = 10;
    this.nextRefillAt = null;
    this.isAdminMode = window.location.pathname.includes('/admin');
    this.ticketTimer = null;
    
    // API 클라이언트
    this.apiClient = window.apiClient;
    
    // 게임 유틸리티
    this.gameUtils = window.gameUtils;
    
    // 무한 가챠 시크릿 코드 (개발용)
    this.secretCode = 'friendshiping';
    this.enteredCode = '';
    this.isSecretMode = false;

    // 가챠 시스템 초기화
    this.gachaSystem = window.createGachaSystem(this);

    // 조합 시스템 초기화
    this.fusionSystem = window.createFusionSystem(this);

    // 카드 시스템 초기화
    this.cardSystem = window.createCardSystem(this);

    // 이벤트 시스템 초기화
    this.eventSystem = window.createEventSystem(this);

    // 모달 시스템 초기화
    this.modalSystem = window.createModalSystem(this);

    // 티켓 시스템 초기화
    this.ticketSystem = window.createTicketSystem(this);

    // 로딩 시스템 초기화
    this.loadingSystem = window.createLoadingSystem(this);

    // 시크릿 시스템 초기화
    this.secretSystem = window.createSecretSystem(this);

    // 모바일 시스템 초기화
    this.mobileSystem = window.createMobileSystem(this);

    // 티켓 시스템 초기화
    this.ticketSystem = window.createTicketSystem(this);

    // 필터 시스템 초기화
    this.filterSystem = window.createFilterSystem(this);

    // 기타 시스템 초기화
    this.miscSystem = window.createMiscSystem(this);

    // 핵심 시스템 초기화
    this.coreSystem = window.createCoreSystem(this);

    // 공지사항 시스템 초기화
    this.noticeSystem = window.createNoticeSystem(this);

    // 룰렛 시스템 초기화
    this.rouletteSystem = window.createRouletteSystem(this);

    // 📱 모바일 오디오 관련
    this.audioContext = null;
    this.audioUnlocked = false;

    this.init();
  }
  
  async init() {
    try {
      // 로딩 화면 표시
      this.loadingSystem.showLoadingScreen();
      
      // 이벤트 리스너 등록
      this.eventSystem.bindEvents();
      
      // 데이터 시스템 초기화 (먼저 초기화)
      this.dataSystem = window.createDataSystem(this);

      // 애니메이션 시스템 초기화
      this.animationSystem = window.createAnimationSystem(this);
      
      // 서버 연결 시도
      try {
        await this.coreSystem.initializeServerConnection();
        await this.coreSystem.loadCardDataFromServer();
        await this.dataSystem.initTicketSystemFromServer();
        
        // 컬렉션 시스템 초기화 (gameData 로드 후)
        this.collectionSystem = window.createCollectionSystem(this);
        await this.collectionSystem.loadCollectionFromServer();
        this.collectionSystem.initCollectionUI();

        // UI 시스템 초기화
        this.uiSystem = window.createUISystem(this);
        
        console.log('서버 모드로 실행');
      } catch (error) {
        console.error('서버 연결 실패:', error);
        alert('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      
      // 효과음 초기화는 utils.js에서 처리됨
      
      // 조합 시스템 초기화
      this.fusionSystem.initFusionSystem();
    
      // 시크릿 코드 이벤트 리스너 등록
      this.secretSystem.initSecretCode();
      
      // 티켓 디스플레이만 시작 (데이터는 서버에서 이미 로드됨)
      this.dataSystem.updateTicketDisplay();

      // 타이머 시작 (1초마다 업데이트)
      setInterval(() => {
        this.dataSystem.updateTicketDisplay();
      }, 1000);
      
      // 초기 티켓 시스템 표시 설정 (가챠 탭이 기본)
      this.ticketSystem.updateTicketVisibility('gacha');
      
      // 초기 상태: 뒷면으로 시작
      this.gachaSystem.showBack();
      
      // 뒷면 이미지 설정
      this.cardSystem.setBackImage();
      
      // 로딩 화면 숨기기
      this.loadingSystem.hideLoadingScreen();
      
      console.log('민킈 가챠 게임 초기화 완료 (서버 기반)');
    } catch (error) {
      console.error('게임 초기화 실패:', error);
      this.loadingSystem.hideLoadingScreen();
      alert('게임을 시작할 수 없습니다. 서버 연결을 확인해주세요.');
    }
  }

  // ========================================
  // 함수들이 분리된 모듈들로 이동됨
  // ========================================
  // - 로딩 관련: loading.js
  // - 가챠 관련: gacha.js  
  // - 카드 관련: card.js
  // - 이벤트 관련: events.js
  // - 컬렉션 관련: collection.js
  // - 조합 관련: fusion.js
  // - 애니메이션 관련: animation.js
  // - UI 관련: ui.js
  // - 모달 관련: modal.js
  // - 데이터 관련: data.js
  // - 유틸리티 관련: utils.js
  // - 시크릿 관련: secret.js
  // - 모바일 관련: mobile.js
  // - 티켓 관련: ticket.js
  // - 필터 관련: filter.js
  // - 기타 관련: misc.js
  // - 핵심 로직: core.js
  // ========================================
}

// 페이지 로드 시 게임 시작
document.addEventListener('DOMContentLoaded', () => {
  new MinquiCardGacha();
});
