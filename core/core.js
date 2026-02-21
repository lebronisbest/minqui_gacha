// 민킈 카드 가챠게임 - 핵심 게임 로직
class CoreSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 서버 연결 및 인증 초기화
  async initializeServerConnection() {
    try {
      // 기존 세션 복원 시도
      const sessionValid = await this.game.apiClient.restoreSession();

      if (!sessionValid) {
        // 로그인 모달 표시 후 완료될 때까지 대기
        await this.showAuthModal();
        console.log('로그인 완료');
      } else {
        console.log('기존 세션 복원됨');
      }
    } catch (error) {
      console.error('서버 연결 실패:', error);
      throw error;
    }
  }

  // 로그인/회원가입 모달 표시 및 완료 대기
  showAuthModal() {
    return new Promise((resolve) => {
      const modal = document.getElementById('authModal');
      const loginForm = document.getElementById('loginForm');
      const registerForm = document.getElementById('registerForm');
      const tabs = document.querySelectorAll('.auth-tab');

      // 로딩 화면 숨기기
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) loadingScreen.style.display = 'none';

      // 모달 표시
      modal.style.display = 'flex';

      // 탭 전환
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const target = tab.dataset.tab;
          loginForm.style.display = target === 'login' ? 'flex' : 'none';
          registerForm.style.display = target === 'register' ? 'flex' : 'none';
          document.getElementById('loginError').textContent = '';
          document.getElementById('registerError').textContent = '';
        });
      });

      // 인증 성공 처리 공통 함수
      const onAuthSuccess = () => {
        modal.style.display = 'none';
        if (loadingScreen) loadingScreen.style.display = 'flex';
        resolve();
      };

      // 로그인 폼 제출
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');
        const btn = document.getElementById('loginSubmitBtn');

        if (!username || !password) {
          errorEl.textContent = '닉네임과 비밀번호를 입력해주세요.';
          return;
        }

        btn.disabled = true;
        btn.querySelector('.auth-btn-text').textContent = '로그인 중...';
        errorEl.textContent = '';

        try {
          await this.game.apiClient.login(username, password);
          onAuthSuccess();
        } catch (error) {
          errorEl.textContent = error.message || '로그인에 실패했습니다.';
          btn.disabled = false;
          btn.querySelector('.auth-btn-text').textContent = '로그인';
        }
      });

      // 회원가입 폼 제출
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        const errorEl = document.getElementById('registerError');
        const btn = document.getElementById('registerSubmitBtn');

        if (!username || !password || !passwordConfirm) {
          errorEl.textContent = '모든 항목을 입력해주세요.';
          return;
        }

        if (password !== passwordConfirm) {
          errorEl.textContent = '비밀번호가 일치하지 않습니다.';
          return;
        }

        btn.disabled = true;
        btn.querySelector('.auth-btn-text').textContent = '가입 중...';
        errorEl.textContent = '';

        try {
          await this.game.apiClient.register(username, password);
          onAuthSuccess();
        } catch (error) {
          errorEl.textContent = error.message || '회원가입에 실패했습니다.';
          btn.disabled = false;
          btn.querySelector('.auth-btn-text').textContent = '회원가입';
        }
      });
    });
  }

  // 서버에서 카드 데이터 로드
  async loadCardDataFromServer() {
    try {
      const catalog = await this.game.apiClient.getCatalog();
      this.game.gameData = {
        cards: catalog.cards,
        ranks: catalog.ranks,
        typeIcons: catalog.typeIcons
      };
      this.game.cardData = { ...this.game.gameData.cards[0] };
      console.log('서버에서 카드 데이터 로드 완료:', this.game.gameData.cards.length, '장');
      console.log('확률 데이터:', this.game.gameData.ranks);
      console.log('타입 데이터:', this.game.gameData.typeIcons);
    } catch (error) {
      console.error('서버에서 카드 데이터 로드 실패:', error);
      throw error; // 에러를 다시 던져서 상위에서 처리하도록 함
    }
  }

  // 로컬 카드 데이터 로드 (폴백)
  async loadCardDataFromLocal() {
    try {
      const response = await fetch('assets/cards.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.game.gameData = await response.json();
      this.game.cardData = { ...this.game.gameData.cards[0] };
      console.log('로컬 카드 데이터 로드 완료:', this.game.gameData.cards.length, '장');
    } catch (error) {
      console.error('로컬 카드 데이터 로드 실패:', error);
      
      // 폴백: 하드코딩된 데이터 사용
      this.game.gameData = {
        cards: [
          {
            id: "minqui_001",
            name: "점령하는 민킈",
            type: "Creator",
            rarity: "Mythic",
            rank: "SSS",
            stage: "기본",
            baseHp: 150,
            baseAttack: 120,
            defense: 110,
            image: "assets/illust/001.png",
            description: "창작의 마법사, 무한한 상상력으로 세상을 만들어가는 존재",
            attacks: [
              {
                name: "점령",
                damage: 240,
                cost: ["creator", "creator"],
                description: "무한한 상상력으로 새로운 세계를 창조한다."
              }
            ],
            weakness: "없음",
            resistance: "없음",
            retreatCost: 2
          }
        ],
        ranks: {
          "SSS": {
            name: "SSS등급",
            hpMultiplier: 2.0,
            attackMultiplier: 2.0,
            probability: 0.5,
            color: "#ff6b6b",
            emoji: "👑"
          },
          "SS": {
            name: "SS등급",
            hpMultiplier: 1.8,
            attackMultiplier: 1.8,
            probability: 2.5,
            color: "#ffa500",
            emoji: "🌟"
          },
          "S": {
            name: "S등급",
            hpMultiplier: 1.5,
            attackMultiplier: 1.5,
            probability: 7.0,
            color: "#9c27b0",
            emoji: "⭐"
          },
          "A": {
            name: "A등급",
            hpMultiplier: 1.2,
            attackMultiplier: 1.2,
            probability: 20.0,
            color: "#2196f3",
            emoji: "✨"
          },
          "B": {
            name: "B등급",
            hpMultiplier: 1.0,
            attackMultiplier: 1.0,
            probability: 70.0,
            color: "#4caf50",
            emoji: "💫"
          }
        },
        typeIcons: {
          "Creator": "🎨",
          "Art": "🖼️",
          "Tech": "💻",
          "Story": "📚",
          "Design": "🎨",
          "Idea": "💡",
          "Team": "🤝",
          "Innovation": "🚀"
        }
      };
      
      this.game.cardData = { ...this.game.gameData.cards[0] };
    }
  }

  // 탭 전환
  async switchTab(tabName) {
    // 탭 전환
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // 티켓 시스템 표시/숨김 제어
    this.game.ticketSystem.updateTicketVisibility(tabName);
    
    // 컬렉션 탭으로 전환 시 UI 업데이트
    if (tabName === 'collection') {
      this.game.collectionSystem.updateCollectionUI();
    }
    
    // 조합 탭으로 전환 시 컬렉션 데이터 다시 로드 및 조합창 초기화
    if (tabName === 'fusion') {
      await this.game.collectionSystem.loadCollectionFromServer();
      this.game.fusionSystem.initFusionUI();
    }
  }
}

// 전역 핵심 시스템 인스턴스 생성 함수
window.createCoreSystem = function(gameInstance) {
  return new CoreSystem(gameInstance);
};
