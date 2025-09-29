// 민킈 카드 가챠게임 - 서버 기반 버전
class MinquiCardGacha {
  constructor() {
    this.cardWrapper = document.getElementById('cardWrapper');
    this.isFlipped = false;
    this.cardData = null;
    this.sounds = {};
    // collectedCards 배열 제거됨 - 서버 데이터만 사용
    this.currentFilter = 'all';
    this.selectedFusionCards = [];
    this.maxFusionCards = 10;
    this.minFusionCards = 3;
    
    // 티켓 시스템 (서버에서 관리)
    this.tickets = 0;
    this.maxTickets = 10;
    this.nextRefillAt = null;
    this.isAdminMode = window.location.pathname.includes('/admin');
    this.ticketTimer = null;
    
    // API 클라이언트
    this.apiClient = window.apiClient;
    
    // 무한 가챠 시크릿 코드 (개발용)
    this.secretCode = 'friendshiping';
    this.enteredCode = '';
    this.isSecretMode = false;

    // 가챠 로딩 상태 (중복 요청 방지)
    this.isGachaLoading = false;

    // 조합 로딩 상태 (중복 요청 방지)
    this.isFusionInProgress = false;

    // 📱 모바일 오디오 관련
    this.audioContext = null;
    this.audioUnlocked = false;

    this.init();
  }
  
  async init() {
    try {
      // 로딩 화면 표시
      this.showLoadingScreen();
      
      // 이벤트 리스너 등록
      this.bindEvents();
      
      // 서버 연결 시도
      try {
        await this.initializeServerConnection();
        await this.loadCardDataFromServer();
        await this.loadCollectionFromServer();
        await this.initTicketSystemFromServer();
        console.log('서버 모드로 실행');
      } catch (error) {
        console.error('서버 연결 실패:', error);
        alert('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      
      // 효과음 초기화
      this.initSounds();
      
      // 컬렉션 UI 초기화
      this.initCollectionUI();
      
      // 조합 시스템 초기화
      this.initFusionSystem();
    
      // 시크릿 코드 이벤트 리스너 등록
      this.initSecretCode();
      
      // 초기 티켓 시스템 표시 설정 (가챠 탭이 기본)
      this.updateTicketVisibility('gacha');
      
      // 초기 상태: 뒷면으로 시작
      this.showBack();
      
      // 뒷면 이미지 설정
      this.setBackImage();
      
      // 로딩 화면 숨기기
      this.hideLoadingScreen();
      
      console.log('민킈 가챠 게임 초기화 완료 (서버 기반)');
    } catch (error) {
      console.error('게임 초기화 실패:', error);
      this.hideLoadingScreen();
      alert('게임을 시작할 수 없습니다. 서버 연결을 확인해주세요.');
    }
  }

  // 로딩 화면 표시
  showLoadingScreen() {
    // 로딩 화면이 이미 있으면 제거
    const existingLoading = document.getElementById('loadingScreen');
    if (existingLoading) {
      existingLoading.remove();
    }
    
    // 로딩 화면 생성
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loadingScreen';
    loadingScreen.innerHTML = `
      <div class="minimal-loading">
        <div class="loading-bar">
          <div id="loadingProgress" class="loading-fill"></div>
        </div>
        <div id="loadingPercentage" class="loading-text">0%</div>
      </div>
    `;
    
    document.body.appendChild(loadingScreen);
    
    // 로딩 진행률 시뮬레이션
    this.simulateLoadingProgress();
  }

  // 로딩 화면 숨기기
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      loadingScreen.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        loadingScreen.remove();
      }, 500);
    }
  }

  // 가챠 로딩 상태 표시
  showGachaLoading() {
    const cardWrapper = this.cardWrapper;
    if (cardWrapper) {
      cardWrapper.classList.add('gacha-loading');
      
      // 로딩 스피너 추가
      const existingSpinner = cardWrapper.querySelector('.gacha-spinner');
      if (!existingSpinner) {
        const spinner = document.createElement('div');
        spinner.className = 'gacha-spinner';
        spinner.innerHTML = `
          <div class="spinner-ring"></div>
          <div class="spinner-text">뽑는 중...</div>
        `;
        cardWrapper.appendChild(spinner);
      }
    }
  }

  // 가챠 로딩 상태 숨기기
  hideGachaLoading() {
    const cardWrapper = this.cardWrapper;
    if (cardWrapper) {
      cardWrapper.classList.remove('gacha-loading');
      
      // 로딩 스피너 제거
      const spinner = cardWrapper.querySelector('.gacha-spinner');
      if (spinner) {
        spinner.remove();
      }
    }
  }

  // 로딩 진행률 시뮬레이션
  simulateLoadingProgress() {
    let progress = 0;
    const progressBar = document.getElementById('loadingProgress');
    const loadingPercentage = document.getElementById('loadingPercentage');
    
    const updateProgress = () => {
      progress += Math.random() * 15;
      if (progress > 100) progress = 100;
      
      if (progressBar) {
        progressBar.style.width = progress + '%';
      }
      if (loadingPercentage) {
        loadingPercentage.textContent = Math.round(progress) + '%';
      }
      
      if (progress < 100) {
        setTimeout(updateProgress, Math.random() * 500 + 200);
      }
    };
    
    updateProgress();
  }



  // 서버 연결 및 인증 초기화
  async initializeServerConnection() {
    try {
      // 기존 세션 복원 시도
      const sessionValid = await this.apiClient.restoreSession();
      
      if (!sessionValid) {
        // 새 게스트 세션 생성
        await this.apiClient.guestLogin();
        console.log('새 게스트 세션 생성됨');
      } else {
        console.log('기존 세션 복원됨');
      }
    } catch (error) {
      console.error('서버 연결 실패:', error);
      throw error;
    }
  }


  // 서버에서 카드 데이터 로드
  async loadCardDataFromServer() {
    try {
      const catalog = await this.apiClient.getCatalog();
      this.gameData = {
        cards: catalog.cards,
        ranks: catalog.ranks,
        typeIcons: catalog.typeIcons
      };
      this.cardData = { ...this.gameData.cards[0] };
      console.log('서버에서 카드 데이터 로드 완료:', this.gameData.cards.length, '장');
      console.log('확률 데이터:', this.gameData.ranks);
      console.log('타입 데이터:', this.gameData.typeIcons);
    } catch (error) {
      console.error('서버에서 카드 데이터 로드 실패:', error);
      throw error; // 에러를 다시 던져서 상위에서 처리하도록 함
    }
  }

  // 로컬 카드 데이터 로드 (폴백)
  async loadCardDataFromLocal() {
    try {
      const response = await fetch('cards.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.gameData = await response.json();
      this.cardData = { ...this.gameData.cards[0] };
      console.log('로컬 카드 데이터 로드 완료:', this.gameData.cards.length, '장');
    } catch (error) {
      console.error('로컬 카드 데이터 로드 실패:', error);
      
      // 폴백: 하드코딩된 데이터 사용
      this.gameData = {
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
            image: "illust/001.png",
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
      
      this.cardData = { ...this.gameData.cards[0] };
    }
  }
  
  initSounds() {
    // 효과음 파일들 로드 (WAV 파일 사용)
    this.sounds = {
      cardFlip: new Audio('sounds/card_flip.wav'),
      sssObtain: new Audio('sounds/sss_obtain.wav'),
      ssObtain: new Audio('sounds/ss_obtain.wav'),
      sObtain: new Audio('sounds/s_obtain.wav'),
      aObtain: new Audio('sounds/a_obtain.wav'),
      bObtain: new Audio('sounds/b_obtain.wav'),
      particle: new Audio('sounds/particle.wav'),
      holo: new Audio('sounds/holo.wav'),
      fusion_success: new Audio('sounds/sss_obtain.wav'), // 조합 성공 (기존 사운드 재사용)
      fusion_fail: new Audio('sounds/card_flip.wav') // 조합 실패 (기존 사운드 재사용)
    };
    
    // 효과음 볼륨 설정
    Object.values(this.sounds).forEach(sound => {
      sound.volume = 0.5; // 기본 볼륨 50%
      sound.preload = 'auto';
    });
    
    // 특별한 효과음 볼륨 조정
    this.sounds.sssObtain.volume = 0.7;
    this.sounds.ssObtain.volume = 0.6;
    this.sounds.particle.volume = 0.3;
    this.sounds.holo.volume = 0.4;
  }
  
  playSound(soundName, volume = null) {
    if (this.sounds[soundName]) {
      const sound = this.sounds[soundName];
      if (volume !== null) {
        sound.volume = volume;
      }
      sound.currentTime = 0; // 처음부터 재생

      // 📱 모바일 호환성: AudioContext unlock 시도
      this.ensureAudioContext();

      sound.play().catch(e => {
        console.log('효과음 재생 실패:', e);
        // 모바일에서 첫 터치 후 재시도
        if (!this.audioUnlocked) {
          this.unlockAudio();
        }
      });
    }
  }

  // 📱 모바일 오디오 컨텍스트 활성화
  ensureAudioContext() {
    if (!this.audioContext && window.AudioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    }
  }

  // 📱 모바일 오디오 언락 (사용자 상호작용 후)
  unlockAudio() {
    if (!this.audioUnlocked) {
      // 더미 오디오 재생으로 오디오 시스템 활성화
      Object.values(this.sounds).forEach(sound => {
        sound.play().then(() => {
          sound.pause();
          sound.currentTime = 0;
        }).catch(() => {});
      });
      this.audioUnlocked = true;
      console.log('📱 모바일 오디오 시스템 활성화됨');
    }
  }
  
  playRankSound(rank) {
    // 랭크별 효과음 재생
    switch(rank) {
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
    }
  }
  
  bindEvents() {
    // 클릭 이벤트
    this.cardWrapper.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleClick();
    });
    
    // 터치 이벤트 추가 (모바일 최적화)
    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };
    
    this.cardWrapper.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      touchStartTime = Date.now();
      touchStartPos = { x: touch.clientX, y: touch.clientY };
    });
    
    this.cardWrapper.addEventListener('touchend', (e) => {
      e.preventDefault();
      const touchEndTime = Date.now();
      const touchDuration = touchEndTime - touchStartTime;
      
      // 짧은 터치만 클릭으로 인식 (스와이프 방지)
      if (touchDuration < 300) {
        this.handleClick();
      }
      this.resetTilt();
    });
    
    // 3D 마우스 인터랙션 - 카드 래퍼에 적용
    this.cardWrapper.addEventListener('mousemove', (e) => {
      this.handleMouseMove(e);
    });
    
    this.cardWrapper.addEventListener('mouseleave', () => {
      this.resetTilt();
    });
    
    // 모바일 터치 인터랙션 (3D 효과)
    this.cardWrapper.addEventListener('touchmove', (e) => {
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
    this.cardWrapper.addEventListener('touchend', () => {
      this.resetTilt();
    });
    
    // 터치 취소 시에도 리셋
    this.cardWrapper.addEventListener('touchcancel', () => {
      this.resetTilt();
    });
    
    // 선택 및 드래그 이벤트 차단
    this.cardWrapper.addEventListener('selectstart', (e) => {
      e.preventDefault();
      return false;
    });
    
    this.cardWrapper.addEventListener('dragstart', (e) => {
      e.preventDefault();
      return false;
    });
    
    this.cardWrapper.addEventListener('drag', (e) => {
      e.preventDefault();
      return false;
    });
    
    this.cardWrapper.addEventListener('dragend', (e) => {
      e.preventDefault();
      return false;
    });
    
    this.cardWrapper.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
    
    // 추가 드래그 방지
    this.cardWrapper.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    this.cardWrapper.addEventListener('mouseup', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    this.cardWrapper.addEventListener('mousemove', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    this.cardWrapper.addEventListener('dragenter', (e) => {
      e.preventDefault();
      return false;
    });
    
    this.cardWrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      return false;
    });
    
    this.cardWrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      return false;
    });
    
    
    // 탭 전환 이벤트
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
    
    // 컬렉션 필터 이벤트 (웹용)
    document.querySelectorAll('.filter-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        this.setFilter(e.target.dataset.filter);
      });
    });
    
    // 모바일용 필터 이벤트
    document.querySelectorAll('.mobile-filter-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        this.setMobileFilter(e.target.dataset.filter);
      });
    });
  }
  
  handleMouseMove(e) {
    const rect = this.cardWrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // 정규화된 좌표 (0~1)
    const normalizedX = (mouseX / (rect.width / 2));
    const normalizedY = (mouseY / (rect.height / 2));
    
    // 틸트 각도 계산 (최대 12도)
    const tiltX = normalizedY * 12;
    const tiltY = -normalizedX * 12;
    
    // 3D 틸트 효과를 CSS 변수로 적용
    this.cardWrapper.style.setProperty('--tilt-rx', `${tiltX}deg`);
    this.cardWrapper.style.setProperty('--tilt-ry', `${tiltY}deg`);
    
    // 글로스 효과 위치 업데이트
    const glossX = Math.max(0, Math.min(1, (normalizedX + 1) / 2));
    const glossY = Math.max(0, Math.min(1, (normalizedY + 1) / 2));
    
    this.cardWrapper.style.setProperty('--gloss-x', glossX);
    this.cardWrapper.style.setProperty('--gloss-y', glossY);
    
    // 홀로그래픽 강도 업데이트 (더 눈에 띄게)
    const tiltIntensity = Math.abs(tiltX) + Math.abs(tiltY);
    const holoIntensity = 0.2 + (tiltIntensity / 24) * 0.3; // 0.2~0.5 (더 강하게)
    
    this.cardWrapper.style.setProperty('--holo-intensity', holoIntensity);
    this.cardWrapper.style.setProperty('--gloss-alpha', 0.1 + (tiltIntensity / 24) * 0.3); // 0.1~0.4 (더 강하게)
    this.cardWrapper.style.setProperty('--shadow-elevation', 1 + (tiltIntensity / 24)); // 1~2
  }
  
  resetTilt() {
    // 3D 틸트 효과 제거
    this.cardWrapper.style.setProperty('--tilt-rx', '0deg');
    this.cardWrapper.style.setProperty('--tilt-ry', '0deg');
    
    this.cardWrapper.style.setProperty('--gloss-x', '0.5');
    this.cardWrapper.style.setProperty('--gloss-y', '0.5');
    this.cardWrapper.style.setProperty('--holo-intensity', '0.2');
    this.cardWrapper.style.setProperty('--gloss-alpha', '0.1');
    this.cardWrapper.style.setProperty('--shadow-elevation', '1');
  }
  
  handleClick() {
    // 가챠 로딩 중이면 클릭 무시
    if (this.isGachaLoading) {
      return;
    }

    if (!this.isFlipped) {
      // 뒷면에서 앞면으로 - 가챠 실행
      this.performGacha();
    } else {
      // 앞면에서 뒷면으로 - 다시 뽑기
      this.playSound('cardFlip');
      this.showBack();
    }
  }
  
  async performGacha() {
    // 이미 로딩 중이면 실행하지 않음
    if (this.isGachaLoading) {
      return;
    }

    try {
      // 로딩 상태 시작
      this.isGachaLoading = true;

      // 로딩 상태 표시 (카드 뒤집기 전에)
      this.showGachaLoading();
      
      // 서버에서 가챠 실행
      const result = await this.apiClient.drawGacha();
      
      if (!result.success) {
        // 티켓 부족 등의 이유로 실패
        this.hideGachaLoading();
        this.isGachaLoading = false;
        alert('티켓이 부족합니다! 12시에 다시 충전됩니다.');
        return;
      }

      // 로딩 상태 숨기기
      this.hideGachaLoading();
      this.isGachaLoading = false;
      
      // 서버에서 받은 카드 결과 처리
      const cardResult = result.cards[0];
      const selectedCard = cardResult.card;
      const selectedRank = cardResult.rank;
      
      // 선택된 카드와 랭크로 데이터 업데이트
      this.updateCardData(selectedCard, selectedRank);
      
      // 카드 정보 업데이트
      this.updateCardInfo();
      
      // 이제 카드 뒤집기 (뽑기 완료 후)
      this.showFront();
      this.playSound('cardFlip');
      
      // 랭크별 효과음 재생
      this.playRankSound(selectedRank);
      
      // 랭크별 파티클 효과
      this.showRankParticles(selectedRank);
      
      // SSS 랭크 특별 애니메이션
      if (selectedRank === 'SSS') {
        this.showSSSSpecialAnimation();
      }
      
      // 가챠 결과 알림 (우측 상단, 미니멀)
      this.showResult();
      
      // 카드 컬렉션에 추가 (로컬 캐시)
      this.addToCollection(selectedCard.id);
      
      // 서버 컬렉션 데이터 다시 로드 (조합에서 사용할 수 있도록)
      await this.loadCollectionFromServer();

      // 조합탭 UI 업데이트 (카드 수량 동기화)
      const fusionTab = document.querySelector('.tab-button[data-tab="fusion"]');
      if (fusionTab && fusionTab.classList.contains('active')) {
        this.renderFusionCards();
        this.updateCardCounts();
      }

      // 티켓 정보 업데이트
      this.tickets = result.ticketsRemaining;
      this.updateTicketDisplay();
      
      // 다음 충전 시간 업데이트
      this.nextRefillAt = result.nextRefillAt;
      // updateRefillTimer 함수는 서버 모드에서는 불필요
      
    } catch (error) {
      console.error('가챠 실행 실패:', error);
      // 에러 시 로딩 상태 숨기기 및 해제
      this.hideGachaLoading();
      this.isGachaLoading = false;
      alert('가챠 실행 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }
  
  selectRandomCard(rank) {
    // 특정 랭크의 카드들 중에서 랜덤 선택
    const cardsOfRank = this.gameData.cards.filter(card => card.rank === rank);
    if (cardsOfRank.length === 0) {
      // 해당 랭크의 카드가 없으면 첫 번째 카드 반환
      return this.gameData.cards[0];
    }
    const randomIndex = Math.floor(Math.random() * cardsOfRank.length);
    return cardsOfRank[randomIndex];
  }
  
  selectRandomRank() {
    // 서버에서 받은 확률 사용
    if (!this.gameData.ranks) {
      console.error('확률 데이터가 없습니다!');
      return 'B'; // 폴백
    }
    
    const probabilities = {};
    for (const [rank, data] of Object.entries(this.gameData.ranks)) {
      probabilities[rank] = data.probability;
    }
    
    console.log('사용할 확률:', probabilities);
    return this.selectRankByProbability(probabilities);
  }
  
  
  setBackImage() {
    // 여러 방법으로 뒷면 이미지 요소 찾기
    let backIllust = document.getElementById('backIllust');
    
    if (!backIllust) {
      // 클래스로 찾기
      backIllust = document.querySelector('.back-illust');
    }
    
    if (!backIllust) {
      // 카드 뒷면 내부의 img 태그 찾기
      const cardBack = document.querySelector('.card-back');
      if (cardBack) {
        backIllust = cardBack.querySelector('img');
      }
    }
    
    if (backIllust) {
      // 절대 경로로 시도
      const imagePath = './illust/000.png';
      backIllust.src = imagePath;
      backIllust.alt = '카드 뒷면 일러스트';
      
      // 이미지 로드 확인
      backIllust.onload = () => {
        backIllust.style.display = 'block';
        backIllust.style.visibility = 'visible';
      };
      
      backIllust.onerror = () => {
        // 상대 경로로 다시 시도
        backIllust.src = 'illust/000.png';
      };
      
      // 이미지 로드 시도 (load() 메서드는 존재하지 않음)
      // 이미지가 자동으로 로드됨
    }
  }
  
  updateCardData(selectedCard, selectedRank) {
    if (!this.gameData || !this.gameData.ranks[selectedRank]) {
      console.error('랭크 데이터를 찾을 수 없습니다:', selectedRank);
      return;
    }

    const rankInfo = this.gameData.ranks[selectedRank];

    // 선택된 카드의 기본 데이터로 설정
    this.cardData = { ...selectedCard };

    // 이미지 경로가 없으면 기본값 설정
    if (!this.cardData.image) {
      console.warn('카드 이미지 경로가 없습니다:', selectedCard);
      this.cardData.image = 'illust/001.png'; // 기본 이미지
    }

    // 홀로그램 패턴이 없으면 기본값 설정
    if (!this.cardData.holoPattern) {
      this.cardData.holoPattern = 'sparkles'; // 기본 홀로그램 패턴
    }

    // 랭크에 따른 스탯 조정
    this.cardData.rank = selectedRank;
    this.cardData.hp = Math.floor(selectedCard.baseHp * rankInfo.hpMultiplier);
    this.cardData.attack = Math.floor(selectedCard.baseAttack * rankInfo.attackMultiplier);
    this.cardData.color = rankInfo.color;
  }
  
        updateCardInfo() {
            if (!this.cardData) return;
            
            // 카드 정보 업데이트
            const cardId = this.cardData.id || '001';
            const cardNumber = '#' + cardId;
            const cardName = this.cardData.name || '민킈';
            document.getElementById('cardNumber').textContent = cardNumber;
            document.getElementById('cardName').textContent = cardName;
            document.getElementById('cardNumberOverlay').textContent = cardNumber;
            document.getElementById('cardNameOverlay').textContent = cardName;
            
            
            // 카드 요소 확인
            const cardFront = document.querySelector('.card-front');
            const card = document.querySelector('.card');
            const cardWrapper = document.querySelector('.card-wrapper');
            
            // 홀로그램 패턴 제거됨
            
            // 하단 통계 정보 업데이트
            document.getElementById('cardHp').textContent = this.cardData.hp || 300;
            document.getElementById('cardAttack').textContent = this.cardData.attack || 240;
            
            // 타입 정보 업데이트 (이모지)
            const typeIcon = this.gameData.typeIcons?.[this.cardData.type] || '🎨';
            document.getElementById('cardType').textContent = typeIcon;
            
            // 스킬 정보 업데이트
            const skill = this.cardData.attacks && this.cardData.attacks[0];
            if (skill) {
                document.getElementById('skillName').textContent = skill.name || '창작 마법';
                document.getElementById('skillDescription').textContent = skill.description || '무한한 상상력으로 새로운 세계를 창조한다.';
            } else {
                // 스킬 데이터가 없을 때 기본값 설정
                document.getElementById('skillName').textContent = '창작 마법';
                document.getElementById('skillDescription').textContent = '무한한 상상력으로 새로운 세계를 창조한다.';
            }
            
            // 배경 이미지와 캐릭터 이미지 업데이트
            const cardBackground = document.getElementById('cardBackground');
            const cardCharacter = document.getElementById('cardCharacter');
            const cardBackgroundIllustration = document.querySelector('.card-background-illustration');
            
            if (cardBackground) {
                cardBackground.src = this.cardData.image;
                cardBackground.alt = `${this.cardData.name} 배경 일러스트`;
            }
            
            // 홀로그램 패턴 적용
            if (cardBackgroundIllustration && this.cardData.holoPattern) {
                cardBackgroundIllustration.setAttribute('data-pattern', this.cardData.holoPattern);
            }
            
            if (cardCharacter) {
                cardCharacter.src = this.cardData.image.replace('.png', '_2.png');
                cardCharacter.alt = `${this.cardData.name} 캐릭터`;
            }
            
            // 랭크 표시 업데이트
            this.updateRankDisplay();
        }
        
        // 홀로그램 패턴 메서드 제거됨
  
  
  updateRankDisplay() {
    const rankImage = document.getElementById('rankImage');
    
    if (!rankImage) {
      return;
    }
    
    const rank = this.cardData.rank;
    
    // 랭크에 따른 이미지 설정
    if (rank === 'SSS') {
      rankImage.src = 'illust/SSS.png';
      rankImage.alt = 'SSS 랭크';
    } else if (rank === 'SS') {
      rankImage.src = 'illust/SS.png';
      rankImage.alt = 'SS 랭크';
    } else if (rank === 'S') {
      rankImage.src = 'illust/S.png';
      rankImage.alt = 'S 랭크';
    } else if (rank === 'A') {
      rankImage.src = 'illust/A.png';
      rankImage.alt = 'A 랭크';
    } else if (rank === 'B') {
      rankImage.src = 'illust/B.png';
      rankImage.alt = 'B 랭크';
    } else {
      // 기본 랭크
      rankImage.src = 'illust/B.png';
      rankImage.alt = `${rank} 랭크`;
    }
  }
  
  applyRankStyle(rank) {
    const cardFront = this.cardWrapper.querySelector('.card-front');
    
    if (cardFront) {
      // 기존 랭크 클래스 제거
      cardFront.classList.remove('rank-s', 'rank-a', 'rank-b', 'rank-c', 'rank-d', 'rank-sss');
      
      // 새로운 랭크 클래스 추가
      cardFront.classList.add(`rank-${rank.toLowerCase()}`);
    }
  }
  
  showFront() {
    this.cardWrapper.classList.add('flipped');
    this.isFlipped = true;
  }
  
  showBack() {
    this.cardWrapper.classList.remove('flipped');
    this.isFlipped = false;
  }
  
  showSSSSpecialAnimation() {
    const cardWrapper = this.cardWrapper;
    
    // SSS 특별 애니메이션 클래스 추가
    cardWrapper.classList.add('sss-special-animation');
    
    // 애니메이션 완료 후 클래스 제거
    setTimeout(() => {
      cardWrapper.classList.remove('sss-special-animation');
    }, 3000);
  }
  
  showResult() {
    if (!this.cardData || !this.gameData) return;
    
    const rankInfo = this.gameData.ranks[this.cardData.rank];
    const emoji = rankInfo ? rankInfo.emoji : '⭐';
    
    const notification = document.createElement('div');
    notification.className = 'gacha-notification-minimal';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="rank-emoji">${emoji}</span>
        <span class="card-name">${this.cardData.name}</span>
        <span class="rank-text">${this.cardData.rank}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 2초 후 제거
    setTimeout(() => {
      notification.remove();
    }, 2000);
  }
  
  
  
  showRankParticles(rank) {
    const cardWrapper = this.cardWrapper;
    const rect = cardWrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const bottomY = rect.bottom; // 카드 아래쪽에서 시작
    
    // 랭크별 파티클 설정
    const particleConfig = this.getParticleConfig(rank);
    
    // 파티클 효과음 재생 (고랭크만)
    if (rank === 'SSS' || rank === 'SS') {
      setTimeout(() => this.playSound('particle'), 200);
    }
    
    // 파티클 생성 - X축으로 퍼진 위치에서 시작
    for (let i = 0; i < particleConfig.count; i++) {
      setTimeout(() => {
        // X축으로 퍼진 시작 위치 계산
        const horizontalOffset = (Math.random() - 0.5) * 200; // 좌우 더 넓은 랜덤 오프셋
        const startX = centerX + horizontalOffset;
        
        this.createParticle(startX, bottomY, particleConfig);
      }, i * particleConfig.delay);
    }
    
    // 글로우 효과
    this.addGlowEffect(rank);
  }
  
  getParticleConfig(rank) {
    const configs = {
      'SSS': {
        count: 150,
        delay: 10,
        colors: ['#ff6b6b', '#ffa500', '#ffd700'],
        size: { min: 4, max: 12 },
        speed: { min: 2, max: 8 },
        duration: 2000
      },
      'SS': {
        count: 120,
        delay: 12,
        colors: ['#ffa500', '#ffd700'],
        size: { min: 3, max: 8 },
        speed: { min: 1.5, max: 6 },
        duration: 1500
      },
      'S': {
        count: 100,
        delay: 15,
        colors: ['#9c27b0', '#e91e63'],
        size: { min: 2, max: 6 },
        speed: { min: 1, max: 4 },
        duration: 1000
      },
      'A': {
        count: 80,
        delay: 18,
        colors: ['#2196f3', '#03a9f4'],
        size: { min: 2, max: 5 },
        speed: { min: 0.8, max: 3 },
        duration: 800
      },
      'B': {
        count: 60,
        delay: 20,
        colors: ['#4caf50', '#8bc34a'],
        size: { min: 1, max: 4 },
        speed: { min: 0.5, max: 2 },
        duration: 600
      }
    };
    
    return configs[rank] || configs['B'];
  }
  
  createParticle(x, y, config) {
    const particle = document.createElement('div');
    particle.className = 'gacha-particle';
    
    // 랜덤 속성 설정
    const speed = config.speed.min + Math.random() * (config.speed.max - config.speed.min);
    const size = config.size.min + Math.random() * (config.size.max - config.size.min);
    const color = config.colors[Math.floor(Math.random() * config.colors.length)];
    
    // 파티클 스타일 설정
    particle.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
      box-shadow: 0 0 ${size * 2}px ${color};
      transform: translate(-50%, -50%);
    `;
    
    document.body.appendChild(particle);
    
    // Y축 애니메이션 (아래에서 위로만 올라감, X축은 고정)
    const deltaY = -speed * 120; // 위로만 올라감 (음수값)
    
    particle.animate([
      { 
        transform: 'translate(-50%, -50%) scale(1)',
        opacity: 1
      },
      { 
        transform: `translate(-50%, calc(-50% + ${deltaY}px)) scale(0)`,
        opacity: 0
      }
    ], {
      duration: config.duration,
      easing: 'ease-out'
    }).onfinish = () => {
      particle.remove();
    };
  }
  
  addGlowEffect(rank) {
    const cardWrapper = this.cardWrapper;
    const glowConfig = this.getGlowConfig(rank);
    
    // 기존 글로우 효과 제거
    cardWrapper.classList.remove('glow-sss', 'glow-ss', 'glow-s', 'glow-a', 'glow-b');
    
    // 새로운 글로우 효과 추가
    cardWrapper.classList.add(`glow-${rank.toLowerCase()}`);
    
    // 3초 후 글로우 효과 제거
    setTimeout(() => {
      cardWrapper.classList.remove(`glow-${rank.toLowerCase()}`);
    }, 3000);
  }
  
  getGlowConfig(rank) {
    const configs = {
      'SSS': { intensity: 3, duration: 3000, color: '#ff6b6b' },
      'SS': { intensity: 2.5, duration: 2500, color: '#ffa500' },
      'S': { intensity: 2, duration: 2000, color: '#9c27b0' },
      'A': { intensity: 1.5, duration: 1500, color: '#2196f3' },
      'B': { intensity: 1, duration: 1000, color: '#4caf50' }
    };
    
    return configs[rank] || configs['B'];
  }
  
  // 서버에서 컬렉션 데이터 로드
  async loadCollectionFromServer() {
    try {
      const response = await this.apiClient.getCollection();
      // 서버에서 받은 완전한 카드 데이터를 저장
      this.serverCollectionData = response.collection || [];
      console.log('서버에서 컬렉션 로드 완료:', this.serverCollectionData.length, '장');
      console.log('컬렉션 카드 데이터:', this.serverCollectionData);
    } catch (error) {
      console.error('컬렉션 로드 실패:', error);
      this.serverCollectionData = [];
    }
  }

  // 로컬 저장소 제거됨 - 서버 데이터만 사용
  
  addToCollection(cardId) {
    // 서버 데이터만 사용 - 로컬 배열 제거
    // 실제 카드 추가는 서버에서 처리됨
    // UI 업데이트는 호출하는 곳에서 필요에 따라 처리
  }
  
  
  initCollectionUI() {
    // 컬렉션 UI 초기화
    this.updateCollectionStats();
    this.renderCollectionCards();
  }
  
  async switchTab(tabName) {
    // 탭 전환
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // 티켓 시스템 표시/숨김 제어
    this.updateTicketVisibility(tabName);
    
    // 컬렉션 탭으로 전환 시 UI 업데이트
    if (tabName === 'collection') {
      this.updateCollectionUI();
    }
    
    // 조합 탭으로 전환 시 컬렉션 데이터 다시 로드 및 조합창 초기화
    if (tabName === 'fusion') {
      await this.loadCollectionFromServer();
      this.initFusionUI();
    }
    
  }
  
  setFilter(filter) {
    // 필터 설정
    this.currentFilter = filter;
    
    // 필터 버튼 활성화 상태 업데이트
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    // 컬렉션 카드 다시 렌더링
    this.renderCollectionCards();
  }

  setMobileFilter(filter) {
    // 모바일용 필터 설정
    this.currentFilter = filter;

    // 모바일 필터 버튼 활성화 상태 업데이트
    document.querySelectorAll('.mobile-filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.mobile-filter-btn[data-filter="${filter}"]`).classList.add('active');

    // 모바일 컬렉션 카드 다시 렌더링
    this.renderMobileCollectionCards();
  }

  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  }
  
  updateCollectionStats() {
    // 컬렉션 통계 업데이트
    const totalCards = this.gameData.cards.length;

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
  
  updateCollectionUI() {
    // 컬렉션 UI 전체 업데이트
    this.updateCollectionStats();
    this.renderCollectionCards();
    this.renderMobileCollectionCards();
  }
  
  renderCollectionCards() {
    // 컬렉션 카드들 렌더링
    const grid = document.getElementById('collectionGrid');
    if (!grid) return;

    grid.innerHTML = '';

    // 모든 카드 데이터 가져오기 (모인 카드 + 안 모인 카드)
    const allCards = this.gameData.cards || [];

    // 필터 적용
    let cardsToRender = allCards;
    if (this.currentFilter !== 'all') {
      cardsToRender = allCards.filter(card => card.rank === this.currentFilter);
    }

    // 카드 넘버순으로 정렬 (id 기준)
    cardsToRender.sort((a, b) => a.id.localeCompare(b.id));


    cardsToRender.forEach(card => {
      // 해당 카드를 소유하고 있는지 확인 (0장은 소유하지 않은 것으로 처리)
      const ownedCard = this.serverCollectionData ?
        this.serverCollectionData.find(c => c.id === card.id) : null;
      const cardCount = ownedCard ? ownedCard.count : 0;
      const isOwned = cardCount > 0;
      
      const cardElement = this.createCollectionCardElement(card, isOwned);
      grid.appendChild(cardElement);
    });
  }
  
  createCollectionCardElement(card, isOwned, overrideDuplicateCount = null) {
    // 컬렉션 카드 요소 생성 - 가챠 카드와 동일한 구조
    const cardDiv = document.createElement('div');
    cardDiv.className = `collection-card ${isOwned ? 'owned' : 'not-owned'}`;
    
    
    const rankInfo = this.gameData.ranks[card.rank];
    const typeIcon = this.gameData.typeIcons?.[card.type] || '🎨';

    
    // 중복 횟수 계산
    const ownedCard = this.serverCollectionData ?
      this.serverCollectionData.find(c => c.id === card.id) : null;
    const duplicateCount = overrideDuplicateCount !== null ? overrideDuplicateCount : (ownedCard ? ownedCard.count : 0);
    
    // 스킬 정보
    const skill = card.attacks && card.attacks[0];
    const skillName = skill ? skill.name : '창작 마법';
    const skillDescription = skill ? skill.description : '무한한 상상력으로 새로운 세계를 창조한다.';
    
    
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
      </div>
      
      <!-- 중복 횟수 원형 팝업 (2개 이상일 때만 표시) -->
      ${isOwned && duplicateCount > 1 ? `<div class="duplicate-count-popup">${duplicateCount}</div>` : ''}
    `;
    
    // 카드 클릭 이벤트 추가 - 소유한 카드만 상세 정보 표시 가능
    if (isOwned) {
      cardDiv.addEventListener('click', () => {
        this.showCardDetail(card, duplicateCount);
      });
    }
    
    return cardDiv;
  }

  // 모바일용 컬렉션 카드 렌더링
  renderMobileCollectionCards() {
    const mobileList = document.getElementById('mobileCollectionList');
    if (!mobileList) return;

    mobileList.innerHTML = '';

    // 모든 카드 데이터 가져오기
    const allCards = this.gameData.cards || [];

    // 필터 적용
    let cardsToRender = allCards;
    if (this.currentFilter !== 'all') {
      cardsToRender = allCards.filter(card => card.rank === this.currentFilter);
    }

    // 카드 넘버순으로 정렬
    cardsToRender.sort((a, b) => a.id.localeCompare(b.id));

    cardsToRender.forEach(card => {
      // 해당 카드를 소유하고 있는지 확인 (0장은 소유하지 않은 것으로 처리)
      const ownedCard = this.serverCollectionData ?
        this.serverCollectionData.find(c => c.id === card.id) : null;
      const cardCount = ownedCard ? ownedCard.count : 0;
      const isOwned = cardCount > 0;
      
      const cardElement = this.createMobileCollectionCardElement(card, isOwned, cardCount);
      mobileList.appendChild(cardElement);
    });
  }

  // 모바일용 컬렉션 카드 요소 생성 - 데스크톱과 동일한 구조 사용
  createMobileCollectionCardElement(card, isOwned, duplicateCount = 0) {
    const cardDiv = document.createElement('div');
    cardDiv.className = `mobile-collection-card ${isOwned ? 'owned' : 'not-owned'}`;
    
    const rankInfo = this.gameData.ranks[card.rank];
    const typeIcon = this.gameData.typeIcons?.[card.type] || '🎨';
    
    // 스킬 정보
    const skill = card.attacks && card.attacks[0];
    const skillName = skill ? skill.name : '창작 마법';
    const skillDescription = skill ? skill.description : '무한한 상상력으로 새로운 세계를 창조한다.';
    
    // 데스크톱과 동일한 HTML 구조 사용
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
      </div>
      
      <!-- 중복 횟수 원형 팝업 (2개 이상일 때만 표시) -->
      ${isOwned && duplicateCount > 1 ? `<div class="mobile-duplicate-count-popup">${duplicateCount}</div>` : ''}
    `;
    
    // 카드 클릭/터치 이벤트 추가 - 소유한 카드만 상세 정보 표시 가능
    if (isOwned) {
      cardDiv.addEventListener('click', () => {
        this.showCardDetail(card, cardCount);
      });

      // 모바일 터치 이벤트 추가
      cardDiv.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.showCardDetail(card, cardCount);
      });
    }
    
    return cardDiv;
  }
  
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

    const rankInfo = this.gameData.ranks[card.rank];
    const typeIcon = this.gameData.typeIcons?.[card.type] || '🎨';
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
        this.showNotification(`${card.name} 카드가 새 창에서 열렸습니다!`, 'success');
      } else {
        // 데스크톱: 직접 다운로드
        const link = document.createElement('a');
        link.download = `${card.name}_${card.id}.png`;
        link.href = dataURL;
        link.click();
        this.showNotification(`${card.name} 카드 이미지가 다운로드되었습니다!`, 'success');
      }

    } catch (error) {
      console.error('PNG 내보내기 오류:', error);
      this.showNotification('이미지 내보내기 중 오류가 발생했습니다.', 'error');
    } finally {
      // 버튼 상태 복원
      const exportButton = document.getElementById('exportPngButton');
      exportButton.textContent = originalText;
      exportButton.disabled = false;
    }
  }

  showNotification(message, type = 'info') {
    // 간단한 알림 표시
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      font-size: 14px;
      font-weight: 500;
      max-width: 300px;
      animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // 3초 후 제거
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  showUnownedCardInfo(card) {
    // 수집되지 않은 카드 정보 표시
    const rankInfo = this.gameData.ranks[card.rank];
    const skill = card.attacks && card.attacks[0];

    alert(`🔒 미수집 카드: ${card.name} (${card.rank})
타입: ${card.type}
HP: ${Math.floor((card.baseHp || 100) * (rankInfo?.hpMultiplier || 1))}
공격력: ${Math.floor((card.baseAttack || 100) * (rankInfo?.attackMultiplier || 1))}
스킬: ${skill ? skill.name : '없음'}
${skill ? skill.description : ''}

이 카드를 획득하려면 가챠를 돌려보세요!`);
  }
  
  // 조합 시스템 메서드들
  initFusionSystem() {
    // 조합 버튼 클릭 이벤트
    document.getElementById('fusionButton').addEventListener('click', () => {
      this.performFusion();
    });
    
    // 확인 버튼 클릭 이벤트
    document.getElementById('confirmButton').addEventListener('click', () => {
      this.hideFusionResult();
    });
    
    
    // 필터 버튼 이벤트
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setFusionFilter(e.target.dataset.filter);
      });
    });
    
    // 확률 정보 토글 이벤트
    document.getElementById('infoToggle').addEventListener('mouseenter', () => {
      this.showProbabilityTooltip();
    });
    
    document.getElementById('infoToggle').addEventListener('mouseleave', () => {
      this.hideProbabilityTooltip();
    });
    
    // 초기화
    this.currentFusionFilter = 'all';
    this.updateFusionSlots(); // 10개 고정 슬롯 생성
    this.renderFusionCards();
    this.updateFusionInfo();
  }
  
  // 조합 UI 초기화 (탭 전환 시 호출)
  initFusionUI() {
    // 조합 슬롯 초기화
    this.updateFusionSlots();
    
    // 카드 그리드 렌더링
    this.renderFusionCards();
    
    // 조합 정보 업데이트
    this.updateFusionInfo();
  }
  
  // 10개 고정 슬롯 시스템
  updateFusionSlots() {
    const container = document.getElementById('fusionSlots');
    if (!container) {
      console.error('fusionSlots container not found!');
      return;
    }
    
    container.innerHTML = '';
    
    // 10개 고정 슬롯 생성
    this.selectedFusionCards = new Array(10).fill(null);
    
    for (let i = 0; i < 10; i++) {
      const slot = document.createElement('div');
      slot.className = 'fusion-slot';
      slot.dataset.slot = i;
      slot.innerHTML = '<div class="slot-placeholder">카드 선택</div>';
      
      // 📱 데스크톱 + 모바일 터치 이벤트 지원
      const removeCard = () => {
        this.removeCardFromFusion(i);
      };

      slot.addEventListener('click', removeCard);
      slot.addEventListener('touchend', (e) => {
        e.preventDefault(); // 더블 탭 방지
        removeCard();
      });
      
      container.appendChild(slot);
    }
    
    this.updateFusionInfo();
  }
  
  // 카드 그리드 렌더링
  renderFusionCards() {
    const container = document.getElementById('fusionCardGrid');
    if (!container) return;

    const availableCards = this.getAvailableCardsForFusion();
    const filteredCards = this.filterCardsForFusion(availableCards);

    container.innerHTML = '';
    
    filteredCards.forEach(card => {
      const cardElement = this.createFusionCardElement(card);
      container.appendChild(cardElement);
    });
  }
  
  createFusionCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'fusion-card-item';
    cardDiv.dataset.cardId = card.id;
    
    // 해당 카드를 몇 장 가지고 있는지 계산
    const ownedCard = this.serverCollectionData ? 
      this.serverCollectionData.find(c => c.id === card.id) : null;
    const cardCount = ownedCard ? ownedCard.count : 0;
    
    // 조합탭에서는 0장인 카드는 렌더링되지 않으므로 disabled 체크 불필요
    
    cardDiv.innerHTML = `
      <img src="${card.image}" alt="${card.name}" class="fusion-card-image">
      <div class="fusion-card-name">${card.name}</div>
      <div class="fusion-card-rank">${card.rank}</div>
      <div class="fusion-card-count">${cardCount}장</div>
    `;
    
    // 📱 데스크톱 + 모바일 터치 이벤트 지원
    const selectCard = () => {
      // 첫 터치 시 오디오 언락
      if (!this.audioUnlocked) {
        this.unlockAudio();
      }
      this.selectCardForFusion(card);
    };

    cardDiv.addEventListener('click', selectCard);
    cardDiv.addEventListener('touchend', (e) => {
      e.preventDefault(); // 더블 탭 방지
      selectCard();
    });
    
    return cardDiv;
  }
  
  filterCardsForFusion(cards) {
    if (this.currentFusionFilter === 'all') {
      return cards;
    }
    return cards.filter(card => card.rank === this.currentFusionFilter);
  }
  
  setFusionFilter(filter) {
    this.currentFusionFilter = filter;
    
    // 필터 버튼 활성화 상태 업데이트
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    this.renderFusionCards();
  }
  
  selectCardForFusion(card) {

    if (!card || !card.id) {
      alert('유효하지 않은 카드입니다.');
      return;
    }

    // 서버 컬렉션 데이터에서만 개수 확인

    const ownedCard = this.serverCollectionData ?
      this.serverCollectionData.find(c => c.id === card.id) : null;
    const totalCardCount = ownedCard ? ownedCard.count : 0;


    if (totalCardCount <= 0) {
      alert('해당 카드를 보유하고 있지 않습니다!');
      return;
    }

    // 이미 선택된 해당 카드의 개수 확인

    const selectedCardCount = this.selectedFusionCards.filter(selectedCard =>
      selectedCard && selectedCard.id === card.id
    ).length;


    // 보유한 카드 수를 초과해서 선택하려고 하면 차단
    if (selectedCardCount >= totalCardCount) {
      alert(`해당 카드는 최대 ${totalCardCount}장까지만 선택할 수 있습니다!`);
      return;
    }

    // 좌측부터 빈 슬롯 찾기
    const emptySlotIndex = this.selectedFusionCards.findIndex(slot => slot === null);

    if (emptySlotIndex === -1) {
      alert('모든 슬롯이 가득 찼습니다! (최대 10장)');
      return;
    }

    // 카드 추가
    this.selectedFusionCards[emptySlotIndex] = card;

    try {
      this.updateFusionSlot(emptySlotIndex, card);
    } catch (slotError) {
    }

    try {
      this.updateFusionInfo();
    } catch (infoError) {
    }

    try {
      // 카드 그리드에서 선택된 카드 표시 및 개수 업데이트
      this.updateCardSelection();
      this.updateCardCounts();
    } catch (selectionError) {
    }

    try {
      // 🔄 조합 카드 목록 다시 렌더링 (0장 카드 숨김 처리)
      this.renderFusionCards();
    } catch (renderError) {
    }
  }
  
  updateCardSelection() {
    document.querySelectorAll('.fusion-card-item').forEach(item => {
      const cardId = item.dataset.cardId;
      const isSelected = this.selectedFusionCards.some(card => card && card.id === cardId);
      item.classList.toggle('selected', isSelected);
    });
  }
  
  updateCardCounts() {
    document.querySelectorAll('.fusion-card-item').forEach(item => {
      const cardId = item.dataset.cardId;
      
      // 서버 컬렉션 데이터에서만 개수 확인
      const ownedCard = this.serverCollectionData ? 
        this.serverCollectionData.find(card => card.id === cardId) : null;
      const totalCardCount = ownedCard ? ownedCard.count : 0;
      
      const selectedCardCount = this.selectedFusionCards.filter(selectedCard => 
        selectedCard && selectedCard.id === cardId
      ).length;
      
      const countElement = item.querySelector('.fusion-card-count');
      if (countElement) {
        countElement.textContent = `${totalCardCount}장`;
      }
      
      // 카드 개수에 따라 disabled 상태 업데이트
      if (totalCardCount <= 0) {
        item.classList.add('disabled');
      } else if (selectedCardCount >= totalCardCount) {
        // 최대 선택 가능한 개수에 도달했을 때도 disabled
        item.classList.add('disabled');
      } else {
        item.classList.remove('disabled');
      }
    });
  }
  
  removeCardFromFusion(slotIndex) {
    if (this.selectedFusionCards[slotIndex]) {
      this.selectedFusionCards[slotIndex] = null;
      this.updateFusionSlot(slotIndex, null);
      this.updateFusionInfo();
      this.updateCardSelection();
      this.updateCardCounts();

      // 🔄 조합 카드 목록 다시 렌더링 (사용 가능한 카드 다시 표시)
      this.renderFusionCards();
    }
  }
  
  updateFusionSlot(slotIndex, card) {
    const slot = document.querySelector(`[data-slot="${slotIndex}"]`);
    
    if (card) {
      slot.classList.add('filled');
      slot.innerHTML = `
        <div class="slot-card">
          <img src="${card.image}" alt="${card.name}" class="slot-card-image">
          <div class="slot-card-info">
            <div class="slot-card-name">${card.name}</div>
          </div>
          <div class="slot-card-rank">${card.rank}</div>
        </div>
      `;
    } else {
      slot.classList.remove('filled');
      slot.innerHTML = '<div class="slot-placeholder">카드 선택</div>';
    }
  }
  
  
  
  
  getAvailableCardsForFusion() {
    // 서버 컬렉션 데이터만 사용
    if (!this.serverCollectionData || this.serverCollectionData.length === 0) {
      return [];
    }

    // 🔒 1장 이상 보유한 카드만 조합에 사용 가능
    return this.serverCollectionData
      .filter(ownedCard => ownedCard.count > 0) // 0장인 카드 제외
      .map(ownedCard => {
        return this.gameData.cards.find(card => card.id === ownedCard.id);
      })
      .filter(card => card);
  }
  
  // 복잡한 수학적 확률 계산 함수 - 랭크 중심
  calculateFusionProbability(selectedCards) {
    if (selectedCards.length < this.minFusionCards) {
      return { success: false, message: `최소 ${this.minFusionCards}장의 카드가 필요합니다.` };
    }
    
    // 랭크별 기본 가중치 (낮은 확률로 시작)
    const baseWeights = {
      'B': 0.50,  // 50%
      'A': 0.30,  // 30%
      'S': 0.15,  // 15%
      'SS': 0.04, // 4%
      'SSS': 0.01 // 1%
    };
    
    // 랭크별 가중치 (높은 랭크일수록 더 강력한 영향)
    const rankWeights = {
      'B': 1.0,
      'A': 2.0,
      'S': 4.0,
      'SS': 8.0,
      'SSS': 16.0
    };
    
    // 랭크 분포 분석
    const rankDistribution = this.analyzeRankDistribution(selectedCards);
    
    // 복잡한 수학적 공식 - 랭크 중심
    const probabilities = {};
    
    for (const targetRank in baseWeights) {
      let probability = baseWeights[targetRank];
      
      // 1. 고급 랭크 카드의 영향력 계산 (지수적 증가)
      let advancedInfluence = 0;
      for (const [rank, count] of Object.entries(rankDistribution)) {
        const rankValue = rankWeights[rank] || 1;
        // 고급 랭크일수록 더 강력한 영향
        advancedInfluence += count * Math.pow(rankValue, 1.5);
      }
      
      // 2. 타겟 랭크와의 시너지 계산
      const targetRankValue = rankWeights[targetRank] || 1;
      const synergyBonus = this.calculateRankSynergy(rankDistribution, targetRank);
      
      // 3. 고급 랭크 보너스 (SS, SSS가 있으면 해당 랭크 확률 대폭 증가)
      let highRankBonus = 1.0;
      if (targetRank === 'SS' || targetRank === 'SSS') {
        const hasHighRankCards = selectedCards.some(card => 
          card.rank === 'SS' || card.rank === 'SSS'
        );
        if (hasHighRankCards) {
          // 고급 랭크 카드가 있으면 해당 랭크 확률 3배 증가
          highRankBonus = 3.0;
        }
      }
      
      // 4. 복합 계산
      probability *= (1 + advancedInfluence * 0.1); // 고급 랭크 영향
      probability *= (1 + synergyBonus * 0.2); // 시너지 보너스
      probability *= highRankBonus; // 고급 랭크 보너스
      
      // 6. 카드 수는 최소한의 영향만 (0.95 ~ 1.05)
      const cardCountFactor = 0.95 + (selectedCards.length / this.maxFusionCards) * 0.1;
      probability *= cardCountFactor;
      
      // 7. 랭크별 특별 계산
      if (targetRank === 'SSS') {
        // SSS는 매우 특별한 조건 필요
        const sssCards = rankDistribution['SSS'] || 0;
        const ssCards = rankDistribution['SS'] || 0;
        if (sssCards > 0) {
          probability *= 5.0; // SSS 카드가 있으면 SSS 확률 5배
        } else if (ssCards >= 2) {
          probability *= 2.0; // SS 카드 2장 이상이면 SSS 확률 2배
        }
      } else if (targetRank === 'SS') {
        // SS는 S나 SS 카드의 영향
        const ssCards = rankDistribution['SS'] || 0;
        const sCards = rankDistribution['S'] || 0;
        if (ssCards > 0) {
          probability *= 3.0; // SS 카드가 있으면 SS 확률 3배
        } else if (sCards >= 2) {
          probability *= 1.5; // S 카드 2장 이상이면 SS 확률 1.5배
        }
      }
      
      // 최종 확률 정규화
      probabilities[targetRank] = Math.min(probability, 0.90); // 최대 90%로 제한
    }
    
    // 정규화 (합이 100%가 되도록)
    const totalProbability = Object.values(probabilities).reduce((sum, prob) => sum + prob, 0);
    for (const rank in probabilities) {
      probabilities[rank] = (probabilities[rank] / totalProbability) * 100;
    }
    
    return {
      success: true,
      probabilities: probabilities,
      cardCount: selectedCards.length,
      rankDistribution: rankDistribution
    };
  }
  
  // 랭크 시너지 계산
  calculateRankSynergy(rankDistribution, targetRank) {
    const rankHierarchy = { 'B': 1, 'A': 2, 'S': 3, 'SS': 4, 'SSS': 5 };
    const targetLevel = rankHierarchy[targetRank] || 1;
    
    let synergy = 0;
    for (const [rank, count] of Object.entries(rankDistribution)) {
      const rankLevel = rankHierarchy[rank] || 1;
      // 같은 레벨이나 높은 레벨의 카드가 있으면 시너지 증가
      if (rankLevel >= targetLevel) {
        synergy += count * (rankLevel / targetLevel);
      }
    }
    
    return synergy;
  }
  
  
  analyzeRankDistribution(selectedCards) {
    const distribution = {};
    selectedCards.forEach(card => {
      distribution[card.rank] = (distribution[card.rank] || 0) + 1;
    });
    return distribution;
  }
  
  
  updateFusionInfo() {
    const filledSlots = this.selectedFusionCards.filter(card => card !== null);
    const fusionButton = document.getElementById('fusionButton');
    if (!fusionButton) return;

    const result = this.calculateFusionProbability(filledSlots);
    
    if (result.success) {
      const { probabilities, cardCount, rankDistribution } = result;
      
      // 확률 데이터 저장 (툴팁용)
      this.currentProbabilities = probabilities;
      this.currentRankDistribution = rankDistribution;
      
      fusionButton.disabled = false;
    } else {
      this.currentProbabilities = null;
      this.currentRankDistribution = null;
      fusionButton.disabled = true;
    }
  }
  
  showProbabilityTooltip() {
    if (!this.currentProbabilities) return;
    
    const tooltip = document.getElementById('probabilityTooltip');
    const rankOrder = ['B', 'A', 'S', 'SS', 'SSS'];
    
    let tooltipContent = '';
    rankOrder.forEach(rank => {
      if (this.currentProbabilities[rank]) {
        tooltipContent += `
          <div class="rank-probability-item">
            <span class="rank-name">${rank}</span>
            <span class="rank-probability">${this.currentProbabilities[rank].toFixed(1)}%</span>
          </div>
        `;
      }
    });
    
    tooltip.innerHTML = tooltipContent;
    tooltip.style.display = 'block';
  }
  
  hideProbabilityTooltip() {
    const tooltip = document.getElementById('probabilityTooltip');
    tooltip.style.display = 'none';
  }
  
  async performFusion() {

    // 🛡️ 중복 실행 방지
    if (this.isFusionInProgress) {
      return;
    }

    const filledSlots = this.selectedFusionCards.filter(card => card !== null);

    if (filledSlots.length < this.minFusionCards) {
      alert(`최소 ${this.minFusionCards}장의 카드를 선택해주세요!`);
      return;
    }

    // 🔒 조합 진행 상태 설정
    this.isFusionInProgress = true;
    this.updateFusionButtonState(true);

    try {
      // 서버에서 조합 실행
      const materialCardIds = filledSlots.map(card => card.id);

      const result = await this.apiClient.commitFusion(materialCardIds);

      // 조합 결과 처리 (서버에서 직접 데이터만 받아옴)
      if (result && typeof result.fusionSuccess === 'boolean') {
        console.log('✅ 조합 API 성공, 룰렛 표시');
        console.log('🔧 result.fusionSuccess:', result.fusionSuccess);
        console.log('🔧 result.resultCard:', result.resultCard);

        // 룰렛으로 결과 표시
        try {
          this.showRoulette(filledSlots, result.resultCard);
        } catch (rouletteError) {
        }

        // 조합 결과에 따른 효과음 재생
        try {
          if (result.fusionSuccess && result.resultCard) {
            this.playSound('fusion_success');
          } else {
            this.playSound('fusion_fail');
          }
        } catch (soundError) {
        }
      } else {
        if (result) {
        }
      }

      // 조합 결과에 관계없이 서버 컬렉션 데이터 업데이트
      try {
        await this.loadCollectionFromServer();
      } catch (collectionError) {
      }

      // 조합창도 업데이트 (사용된 카드들이 사라지도록)
      try {
        this.initFusionUI();
      } catch (uiError) {
      }
      
    } catch (error) {
      console.error('조합 실행 실패:', error);
      alert('조합 실행 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      // 🔓 조합 진행 상태 해제
      this.isFusionInProgress = false;
      this.updateFusionButtonState(false);
    }
  }

  // 조합 버튼 상태 업데이트 (로딩 스피너 포함)
  updateFusionButtonState(isLoading) {
    const executeButton = document.querySelector('.execute-fusion-btn');
    if (!executeButton) return;

    if (isLoading) {
      executeButton.disabled = true;
      executeButton.innerHTML = `
        <div class="fusion-loading">
          <div class="spinner"></div>
          조합 중...
        </div>
      `;
      executeButton.style.opacity = '0.6';
      executeButton.style.cursor = 'not-allowed';
    } else {
      executeButton.disabled = false;
      executeButton.innerHTML = '조합 실행';
      executeButton.style.opacity = '1';
      executeButton.style.cursor = 'pointer';
    }
  }

  showRoulette(selectedCards, resultCard) {
    console.log('🎰 showRoulette 시작');

    const rouletteModal = document.getElementById('rouletteModal');
    const rouletteWheel = document.getElementById('rouletteWheel');
    const rouletteResult = document.getElementById('rouletteResult');

    // DOM 요소 존재 확인
    if (!rouletteModal) {
      console.error('❌ rouletteModal 없음');
      return;
    }
    if (!rouletteWheel) {
      console.error('❌ rouletteWheel 없음');
      return;
    }
    if (!rouletteResult) {
      console.error('❌ rouletteResult 없음');
      return;
    }

    console.log('✅ 룰렛 DOM 요소들 확인 완료');

    // 룰렛에 표시할 카드들 생성 (결과 카드 포함)
    let rouletteCards;
    try {
      rouletteCards = this.createRouletteCards(selectedCards, resultCard);
      console.log('✅ 룰렛 카드 생성 완료:', rouletteCards?.length);
    } catch (createError) {
      console.error('❌ 룰렛 카드 생성 에러:', createError);
      return;
    }
    
    // 룰렛 초기화
    rouletteWheel.innerHTML = '';
    rouletteResult.innerHTML = '';
    rouletteResult.classList.remove('show');
    
    // 룰렛 카드들 배치
    rouletteCards.forEach((card, index) => {
      const cardElement = this.createRouletteCardElement(card, index, rouletteCards.length);
      rouletteWheel.appendChild(cardElement);
    });
    
    // 룰렛 모달 표시
    rouletteModal.style.display = 'flex';
    
    // 룰렛 애니메이션 시작
    setTimeout(() => {
      this.startRouletteAnimation(rouletteWheel, resultCard, selectedCards);
    }, 500);
  }
  
  createRouletteCards(selectedCards, resultCard) {
    // 모든 가능한 카드 후보들
    const allCards = [...this.gameData.cards];

    // 서버에서 받은 결과 카드가 클라이언트 데이터에 없을 경우 추가
    if (resultCard && !allCards.some(card => card.id === resultCard.id)) {
      console.warn('서버에서 받은 결과 카드가 클라이언트 데이터에 없음:', resultCard);
      allCards.push(resultCard);
    }

    const rouletteCards = [];

    // 🎯 애니메이션이 멈출 위치 (35-40번째 사이)
    const stopIndex = 35 + Math.floor(Math.random() * 5); // 35~39 중 랜덤

    // 🎭 짜릿한 연출을 위한 "아슬아슬" 카드 배치
    const getTeaseCard = () => {
      // 높은 등급의 카드들로 유혹
      const highRankCards = allCards.filter(card => ['SSS', 'SS', 'S'].includes(card.rank));
      return highRankCards.length > 0 ?
        highRankCards[Math.floor(Math.random() * highRankCards.length)] :
        allCards[Math.floor(Math.random() * allCards.length)];
    };

    // 50장의 카드 생성
    for (let i = 0; i < 50; i++) {
      if (i === stopIndex) {
        if (resultCard) {
          // 조합 성공: 결과 카드를 배치
          rouletteCards.push(resultCard);
        } else {
          // 조합 실패: 재료 카드 중 하나를 배치 (자연스러운 연출)
          const randomMaterial = selectedCards[Math.floor(Math.random() * selectedCards.length)];
          rouletteCards.push(randomMaterial);
        }
      } else if (Math.abs(i - stopIndex) <= 2 && Math.abs(i - stopIndex) > 0) {
        // 🎭 결과 카드 주변(±1~2칸)에 좋은 카드들 배치 → "아슬아슬" 연출
        rouletteCards.push(getTeaseCard());
      } else {
        // 나머지는 랜덤 카드
        const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
        rouletteCards.push(randomCard);
      }
    }

    return rouletteCards;
  }
  
  createRouletteCardElement(card, index, totalCards) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'roulette-card';
    cardDiv.dataset.cardId = card.id;
    
    cardDiv.innerHTML = `
      <img src="${card.image}" alt="${card.name}">
      <div class="card-name">${card.name}</div>
      <div class="card-rank">${card.rank}</div>
    `;
    
    return cardDiv;
  }
  
  startRouletteAnimation(rouletteWheel, resultCard, selectedCards) {
    const cards = rouletteWheel.children;
    const cardWidth = 108; // 카드 너비 + 마진 (100px + 8px)
    const containerWidth = 500;

    // 멈출 카드의 인덱스 찾기
    let stopIndex = -1;
    const targetCardId = resultCard ? resultCard.id : selectedCards[Math.floor(Math.random() * selectedCards.length)].id;

    for (let i = 0; i < cards.length; i++) {
      if (cards[i].dataset.cardId === targetCardId) {
        stopIndex = i;
        break;
      }
    }

    // 🎯 멈출 카드가 중앙에 정확히 오도록 계산
    const finalPosition = -(stopIndex * cardWidth) + (containerWidth / 2) - (cardWidth / 2);
    
    // 🎭 짜릿한 애니메이션을 위한 다단계 회전
    const extraSpins = 6 + Math.random() * 3; // 6-9바퀴
    const extraDistance = extraSpins * cards.length * cardWidth;
    const totalDistance = finalPosition - extraDistance;

    // 애니메이션 시작
    rouletteWheel.style.transition = 'none';
    rouletteWheel.style.transform = 'translateX(0px)';

    // 룰렛 효과음 재생
    this.playRouletteSound();

    // 🎪 3단계 애니메이션으로 극적 효과 연출
    requestAnimationFrame(() => {
      // 1단계: 빠른 회전 (2초)
      rouletteWheel.style.transition = 'transform 2s ease-out';
      rouletteWheel.style.transform = `translateX(${totalDistance + cardWidth * 3}px)`;

      setTimeout(() => {
        // 2단계: 망설이며 느린 회전 (1.5초)
        rouletteWheel.style.transition = 'transform 1.5s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        rouletteWheel.style.transform = `translateX(${totalDistance + cardWidth * 1}px)`;

        setTimeout(() => {
          // 3단계: 마지막 미세 조정 (1초) - 결과 위치에 정확히 멈춤
          rouletteWheel.style.transition = 'transform 1s cubic-bezier(0.23, 1, 0.32, 1)';
          rouletteWheel.style.transform = `translateX(${totalDistance}px)`;

          // 최종 결과 표시
          setTimeout(() => {
            this.showRouletteResult(resultCard, selectedCards);
          }, 1000);
        }, 1500);
      }, 2000);
    });
  }
  
  playRouletteSound() {
    // 🎵 룰렛 회전 효과음 시뮬레이션
    const playTick = (interval) => {
      const audio = new Audio('sounds/card_flip.wav');
      audio.volume = 0.2;
      audio.playbackRate = 1.5; // 조금 더 높은 음조
      audio.play().catch(e => console.log('Audio play failed:', e));
    };

    // 점진적으로 느려지는 틱 사운드
    let tickInterval = 50; // 시작 간격 (빠름)
    let tickCount = 0;
    const maxTicks = 60; // 총 틱 횟수

    const tickTimer = setInterval(() => {
      playTick();
      tickCount++;

      // 점점 느려지게
      tickInterval += 8;

      if (tickCount >= maxTicks || tickInterval > 400) {
        clearInterval(tickTimer);
      } else {
        clearInterval(tickTimer);
        setTimeout(() => {
          if (tickCount < maxTicks) {
            const newTimer = setInterval(() => {
              playTick();
              tickCount++;
              tickInterval += 8;
              if (tickCount >= maxTicks || tickInterval > 400) {
                clearInterval(newTimer);
              }
            }, tickInterval);
          }
        }, tickInterval);
      }
    }, tickInterval);
  }
  
  showRouletteResult(resultCard, selectedCards) {
    const rouletteResult = document.getElementById('rouletteResult');
    
    if (resultCard) {
      // 성공 결과
      rouletteResult.innerHTML = `
        <div class="roulette-result-card">
          <img src="${resultCard.image}" alt="${resultCard.name}">
          <div class="card-name">${resultCard.name}</div>
          <div class="card-rank">${resultCard.rank}</div>
        </div>
        <p style="color: #4CAF50; font-size: 1.2rem; font-weight: 700;">조합 성공!</p>
      `;
      
      // 컬렉션에 추가 (로그만 기록)
      this.addToCollection(resultCard.id);

      // 컬렉션 UI 즉시 업데이트 (서버 동기화 후)
      this.updateCollectionUI();
    } else {
      // 실패 결과
      rouletteResult.innerHTML = `
        <div style="color: #f44336; font-size: 1.2rem; font-weight: 700;">
          조합 실패...
        </div>
      `;
    }
    
    rouletteResult.classList.add('show');
    
    // 사용된 카드들 제거
    selectedCards.forEach(card => {
      // 서버 데이터만 사용 - 로컬 배열 제거됨
      console.log('카드 제거됨 (서버에서 처리):', card.id);
    });
    
    // 로컬 저장소 제거됨 - 서버 데이터만 사용
    
    // 3초 후 룰렛 닫기
    setTimeout(() => {
      this.closeRoulette();
    }, 3000);
  }
  
  closeRoulette() {
    const rouletteModal = document.getElementById('rouletteModal');
    rouletteModal.style.display = 'none';
    
    // 조합 슬롯 초기화
    this.selectedFusionCards = new Array(this.selectedFusionCards.length).fill(null);
    this.updateFusionSlots();
    
    // 컬렉션 UI 강제 업데이트
    this.updateCollectionStats();
    this.renderCollectionCards();
    
    // 조합 카드 개수 업데이트
    this.updateCardCounts();
  }
  
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // 서버에서 티켓 시스템 초기화
  async initTicketSystemFromServer() {
    try {
      const ticketInfo = await this.apiClient.getTicketInfo();
      this.tickets = ticketInfo.current;
      this.maxTickets = ticketInfo.max;
      this.nextRefillAt = ticketInfo.nextRefillAt;
      
      this.updateTicketDisplay();
      this.startTicketTimer();
    } catch (error) {
      console.error('티켓 정보 로드 실패:', error);
      // 폴백: 로컬 티켓 시스템 사용
      this.initTicketSystem();
    }
  }

  // 기존 티켓 시스템 (폴백용)
  initTicketSystem() {
    this.loadTicketData();
    this.updateTicketDisplay();
    this.startTicketTimer();
  }

  // 티켓 데이터 로드
  loadTicketData() {
    if (this.isAdminMode) {
      this.tickets = 999; // 관리자 모드에서는 무한 티켓
      this.maxTickets = 999;
      return;
    }

    // maxTickets가 설정되지 않았다면 기본값 설정
    if (!this.maxTickets) {
      this.maxTickets = 10;
    }

    const savedTickets = localStorage.getItem('minqui_tickets');
    const lastReset = localStorage.getItem('minqui_last_ticket_reset');
    
    if (savedTickets !== null && lastReset !== null) {
      this.tickets = parseInt(savedTickets);
      this.checkTicketReset(lastReset);
    } else {
      // 첫 방문자에게 10장 지급
      this.tickets = this.maxTickets;
      this.saveTicketData();
      console.log('첫 방문자에게 티켓 10장 지급');
    }
  }

  // 티켓 리셋 확인
  checkTicketReset(lastReset) {
    const now = new Date();
    const lastResetDate = new Date(lastReset);
    
    // 한국시간으로 12시가 지났는지 확인
    const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const lastResetKorean = new Date(lastResetDate.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    
    // 날짜가 바뀌었거나 12시간이 지났으면 리셋
    if (koreanTime.getDate() !== lastResetKorean.getDate() || 
        (koreanTime.getTime() - lastResetKorean.getTime()) >= 12 * 60 * 60 * 1000) {
      this.tickets = this.maxTickets;
      this.saveTicketData();
    }
  }

  // 티켓 데이터 저장
  saveTicketData() {
    if (!this.isAdminMode) {
      localStorage.setItem('minqui_tickets', this.tickets.toString());
      localStorage.setItem('minqui_last_ticket_reset', new Date().toISOString());
    }
  }

  // 티켓 사용
  useTicket() {
    if (this.isAdminMode || this.isSecretMode) {
      return true; // 관리자 모드 또는 시크릿 모드에서는 항상 사용 가능
    }
    
    if (this.tickets > 0) {
      this.tickets--;
      this.saveTicketData();
      this.updateTicketDisplay();
      return true;
    }
    return false;
  }

  // 티켓 표시 업데이트
  updateTicketDisplay() {
    const ticketCountElement = document.getElementById('ticketCount');
    const ticketTimerElement = document.getElementById('ticketTimer');
    
    if (ticketCountElement) {
      ticketCountElement.textContent = this.tickets;
      
      // 티켓이 0일 때 시각적 피드백
      if (this.tickets <= 0 && !this.isAdminMode && !this.isSecretMode) {
        ticketCountElement.style.color = '#ff6b6b';
        ticketCountElement.style.textShadow = '0 0 10px rgba(255, 107, 107, 0.5)';
      } else {
        ticketCountElement.style.color = '#ffd700';
        ticketCountElement.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
      }
    }
    
    if (ticketTimerElement && !this.isAdminMode) {
      this.updateTicketTimer();
    }
    
    // 카드 클릭 가능 여부 업데이트
    this.updateCardClickability();
  }

  // 카드 클릭 가능 여부 업데이트
  updateCardClickability() {
    const cardWrapper = this.cardWrapper;
    
    // 관리자 모드 또는 시크릿 모드에서는 항상 활성화
    if (this.isAdminMode || this.isSecretMode) {
      cardWrapper.classList.remove('disabled');
      cardWrapper.style.cursor = 'pointer';
      return;
    }
    
    // 일반 모드에서는 항상 클릭 가능 (티켓이 없어도 카드 앞면은 볼 수 있음)
    cardWrapper.classList.remove('disabled');
    cardWrapper.style.cursor = 'pointer';
  }

  // 티켓 시스템 표시/숨김 제어
  updateTicketVisibility(tabName) {
    const ticketSystem = document.querySelector('.ticket-system');
    if (ticketSystem) {
      if (tabName === 'gacha') {
        ticketSystem.style.display = 'block';
      } else {
        ticketSystem.style.display = 'none';
      }
    }
  }

  // 티켓 타이머 시작
  startTicketTimer() {
    if (this.isAdminMode) {
      const ticketTimerElement = document.getElementById('ticketTimer');
      if (ticketTimerElement) {
        ticketTimerElement.textContent = '관리자 모드 - 무한 티켓';
      }
      return;
    }
    
    if (this.isSecretMode) {
      const ticketTimerElement = document.getElementById('ticketTimer');
      if (ticketTimerElement) {
        ticketTimerElement.textContent = '시크릿 모드 - 무한 가챠';
      }
      return;
    }

    this.ticketTimer = setInterval(() => {
      this.updateTicketTimer();
    }, 1000);
  }

  // 티켓 타이머 업데이트
  updateTicketTimer() {
    const ticketTimerElement = document.getElementById('ticketTimer');
    if (!ticketTimerElement) return;

    if (this.tickets >= this.maxTickets) {
      ticketTimerElement.textContent = '티켓이 가득 찼습니다!';
      return;
    }

    const now = new Date();
    const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    
    // 다음 12시까지의 시간 계산
    const nextReset = new Date(koreanTime);
    nextReset.setHours(12, 0, 0, 0);
    
    // 이미 12시가 지났으면 다음날 12시로 설정
    if (koreanTime.getHours() >= 12) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    
    const timeDiff = nextReset.getTime() - koreanTime.getTime();
    
    if (timeDiff <= 0) {
      // 12시가 되었으면 티켓 리셋
      this.tickets = this.maxTickets;
      this.saveTicketData();
      this.updateTicketDisplay();
      return;
    }
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    ticketTimerElement.textContent = `다음 충전까지: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  selectRankByProbability(probabilities) {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const [rank, probability] of Object.entries(probabilities)) {
      cumulative += probability;
      if (random <= cumulative) {
        return rank;
      }
    }
    
    // 폴백: 가장 높은 확률의 랭크
    return Object.keys(probabilities).reduce((a, b) => 
      probabilities[a] > probabilities[b] ? a : b
    );
  }
  
  generateRandomCard(rank) {
    // 해당 랭크의 카드 중에서 랜덤 선택
    const cardsOfRank = this.gameData.cards.filter(card => card.rank === rank);
    if (cardsOfRank.length === 0) {
      return this.gameData.cards[0]; // 폴백
    }
    const randomIndex = Math.floor(Math.random() * cardsOfRank.length);
    return cardsOfRank[randomIndex];
  }
  
  showFusionResult(card, success) {
    const modal = document.getElementById('fusionResultModal');
    const resultCardDiv = document.getElementById('resultCardDisplay');
    const resultMessage = document.getElementById('resultMessage');

    if (!modal || !resultCardDiv || !resultMessage) return;

    if (success && card) {
      resultCardDiv.innerHTML = `
        <div class="collection-card owned">
          <div class="collection-card-front">
            <div class="collection-card-background-illustration">
              <img src="${card.image}" alt="${card.name} 배경 일러스트" class="collection-background-illust">
            </div>
            <div class="collection-card-info-box">
              <div class="collection-card-number-box">
                <div class="collection-card-number">#${card.id}</div>
              </div>
              <div class="collection-card-name">${card.name}</div>
            </div>
            <div class="collection-card-rank">
              <img src="illust/${card.rank}.png" alt="${card.rank} 랭크" class="collection-rank-image">
            </div>
            <div class="collection-card-character">
              <img src="${card.image.replace('.png', '_2.png')}" alt="${card.name} 캐릭터" class="collection-character-illust">
            </div>
            <div class="owned-badge">획득</div>
          </div>
        </div>
      `;
      resultMessage.textContent = '조합 결과 해당 카드가 나왔습니다.';
    } else {
      resultCardDiv.innerHTML = `
        <div class="fusion-failure" style="color: #ff6b6b; font-size: 1.2rem; font-weight: 700;">
          <div style="font-size: 3rem; margin-bottom: 10px;">❌</div>
          <div>조합 실패!</div>
        </div>
      `;
      resultMessage.textContent = '카드가 소모되었지만 조합에 실패했습니다.';
    }
    
    modal.style.display = 'flex';
  }
  
  hideFusionResult() {
    const modal = document.getElementById('fusionResultModal');
    modal.style.display = 'none';
  }

  // 시크릿 코드 초기화
  initSecretCode() {
    // keyup 이벤트로 한글 입력 감지 (조합 완료 후)
    document.addEventListener('keyup', (event) => {
      this.handleSecretCodeKeyup(event);
    });
    
    // keydown 이벤트로 백스페이스 감지
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace') {
        this.enteredCode = this.enteredCode.slice(0, -1);
        console.log('백스페이스 - 현재 입력된 코드:', this.enteredCode);
      }
    });
  }

  // keyup 이벤트로 영어 입력 처리
  handleSecretCodeKeyup(event) {
    // 영어 문자만 처리
    if (event.key && event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
      this.enteredCode += event.key.toLowerCase();
      console.log('영어 입력 감지:', event.key, '현재 코드:', this.enteredCode);
      
      // 시크릿 코드 확인
      if (this.enteredCode === this.secretCode) {
        console.log('시크릿 코드 일치!');
        this.activateSecretMode();
      }
      
      // 코드가 너무 길어지면 앞에서부터 자르기
      if (this.enteredCode.length > this.secretCode.length) {
        this.enteredCode = this.enteredCode.slice(-this.secretCode.length);
      }
    }
  }

  // 시크릿 코드 처리 (기존 keydown 방식)
  handleSecretCode(event) {
    // 디버깅을 위한 로그
    console.log('키 입력:', event.key, '코드:', event.code);
    
    // 백스페이스 처리
    if (event.key === 'Backspace') {
      this.enteredCode = this.enteredCode.slice(0, -1);
      console.log('현재 입력된 코드:', this.enteredCode);
      return;
    }
    
    // 모든 문자 처리 (한글, 영문, 숫자 등)
    if (event.key && event.key.length === 1) {
      this.enteredCode += event.key;
      console.log('현재 입력된 코드:', this.enteredCode);
      
      // 시크릿 코드 확인
      if (this.enteredCode === this.secretCode) {
        console.log('시크릿 코드 일치!');
        this.activateSecretMode();
      }
      
      // 코드가 너무 길어지면 앞에서부터 자르기
      if (this.enteredCode.length > this.secretCode.length) {
        this.enteredCode = this.enteredCode.slice(-this.secretCode.length);
      }
    }
  }

  // 시크릿 모드 활성화
  activateSecretMode() {
    this.isSecretMode = true;
    this.enteredCode = ''; // 코드 초기화
    
    // 시각적 피드백
    this.showSecretModeNotification();
    
    // 카드 클릭 가능 여부 업데이트
    this.updateCardClickability();
    
    // 티켓 표시 업데이트
    this.updateTicketDisplay();
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


  
}

// 페이지 로드 시 게임 시작
document.addEventListener('DOMContentLoaded', () => {
  new MinquiCardGacha();
});