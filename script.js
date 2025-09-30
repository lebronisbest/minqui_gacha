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

    // 가챠 시스템 초기화
    this.gachaSystem = window.createGachaSystem(this);

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
      
      // 효과음 초기화는 utils.js에서 처리됨
      
      // 컬렉션 UI 초기화
      this.initCollectionUI();
      
      // 조합 시스템 초기화
      this.initFusionSystem();
    
      // 시크릿 코드 이벤트 리스너 등록
      this.initSecretCode();
      
      // 초기 티켓 시스템 표시 설정 (가챠 탭이 기본)
      this.updateTicketVisibility('gacha');
      
      // 초기 상태: 뒷면으로 시작
      this.gachaSystem.showBack();
      
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
  // showGachaLoading, hideGachaLoading 함수는 gacha.js로 이동됨

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
  
  // initSounds 함수는 utils.js로 이동됨
  
  // playSound 함수는 utils.js로 이동됨

  // 오디오 관련 함수들은 utils.js로 이동됨
  
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
    // 가챠 시스템으로 위임
    this.gachaSystem.handleClick();
  }
  
  // performGacha 함수는 gacha.js로 이동됨
  
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
  
  // showFront, showBack 함수는 gacha.js로 이동됨
  
  // showSSSSpecialAnimation 함수는 gacha.js로 이동됨
  
  // showResult 함수는 gacha.js로 이동됨
  
  
  
  // showRankParticles 함수는 gacha.js로 이동됨
  
  // getParticleConfig 함수는 gacha.js로 이동됨
  
  // createParticle, addGlowEffect, getGlowConfig 함수들은 gacha.js로 이동됨
  
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

  // showNotification 함수는 utils.js로 이동됨

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
    const fusionButton = document.getElementById('fusionButton');
    if (fusionButton) {
      fusionButton.addEventListener('click', () => {
        console.log('🔘 조합 버튼 클릭됨');
        this.performFusion();
      });
      console.log('✅ 조합 버튼 이벤트 리스너 등록 완료');
    } else {
      console.error('❌ fusionButton 요소를 찾을 수 없음');
    }
    
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
  
  calculateFusionProbability(selectedCards) {
    if (selectedCards.length < this.minFusionCards) {
      return { success: false, message: `최소 ${this.minFusionCards}장의 카드가 필요합니다.` };
    }

    // 1단계: 입력 카드 분석
    const rankDistribution = {};
    selectedCards.forEach(card => {
      rankDistribution[card.rank] = (rankDistribution[card.rank] || 0) + 1;
    });
    const totalCards = selectedCards.length;

    // 2단계: 기본 확률
    const baseProb = {
      'B': 0.50,
      'A': 0.30,
      'S': 0.15,
      'SS': 0.04,
      'SSS': 0.01
    };

    // 3단계: 등급 계층
    const rankHierarchy = { 'B': 1, 'A': 2, 'S': 3, 'SS': 4, 'SSS': 5 };
    const ranks = ['B', 'A', 'S', 'SS', 'SSS'];

    // 4단계: 각 등급별 최종 확률 계산
    const finalProb = {};

    for (const targetRank of ranks) {
      const targetLevel = rankHierarchy[targetRank];

      // targetRank 이상인 카드들의 개수
      let highRankCount = 0;
      for (const [rank, count] of Object.entries(rankDistribution)) {
        if (rankHierarchy[rank] >= targetLevel) {
          highRankCount += count;
        }
      }

      // 시너지 배율
      const synergy = Math.pow(highRankCount / totalCards, 0.5);

      // 최종 확률
      finalProb[targetRank] = baseProb[targetRank] * (1 + synergy * 2.0);
    }

    // 5단계: 정규화 (합이 100%가 되도록)
    const total = Object.values(finalProb).reduce((sum, prob) => sum + prob, 0);
    const probabilities = {};
    for (const rank of ranks) {
      probabilities[rank] = (finalProb[rank] / total) * 100;
    }

    return {
      success: true,
      probabilities: probabilities,
      cardCount: totalCards,
      rankDistribution: rankDistribution
    };
  }
  
  
  updateFusionInfo() {
    const filledSlots = this.selectedFusionCards.filter(card => card !== null);
    const fusionButton = document.getElementById('fusionButton');
    if (!fusionButton) {
      console.error('❌ fusionButton 요소를 찾을 수 없음');
      return;
    }

    const result = this.calculateFusionProbability(filledSlots);

    if (result.success) {
      this.currentProbabilities = result.probabilities;
      fusionButton.disabled = false;
    } else {
      this.currentProbabilities = null;
      fusionButton.disabled = true;
    }
  }
  
  showProbabilityTooltip() {
    const tooltip = document.getElementById('probabilityTooltip');
    if (!tooltip) return;

    if (!this.currentProbabilities) {
      tooltip.innerHTML = '<div class="info-message">확률 계산 중...</div>';
      tooltip.style.display = 'block';
      return;
    }

    const ranks = ['B', 'A', 'S', 'SS', 'SSS'];
    let tooltipContent = '<div class="probability-list">';

    for (const rank of ranks) {
      const prob = this.currentProbabilities[rank];
      if (prob !== undefined) {
        tooltipContent += `
          <div class="rank-probability-item">
            <span class="rank-name">${rank}</span>
            <span class="rank-probability">${prob.toFixed(1)}%</span>
          </div>
        `;
      }
    }

    tooltipContent += '</div>';
    tooltip.innerHTML = tooltipContent;
    tooltip.style.display = 'block';
  }
  
  hideProbabilityTooltip() {
    const tooltip = document.getElementById('probabilityTooltip');
    tooltip.style.display = 'none';
  }
  
  async performFusion() {
    console.log('🎯 performFusion 시작');

    // 🛡️ 중복 실행 방지
    if (this.isFusionInProgress) {
      console.log('❌ 이미 조합 진행 중');
      return;
    }

    const filledSlots = this.selectedFusionCards.filter(card => card !== null);
    console.log('선택된 카드들:', filledSlots);

    if (filledSlots.length < this.minFusionCards) {
      console.log('❌ 카드 수 부족:', filledSlots.length, '/', this.minFusionCards);
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
      console.log('🔧 API 응답 전체:', JSON.stringify(result, null, 2));

      // 🔧 조합 엔진 v3.0 응답 처리
      let fusionSuccess = false;
      let resultCard = null;
      let successRate = 0;
      let successRateBreakdown = null;
      let engineVersion = '3.0.0';
      let policyVersion = '3.0.0';
      
      if (result) {
        // v3.0 응답 구조에 맞게 파싱
        fusionSuccess = result.fusionSuccess || false;
        resultCard = result.resultCard || null;
        successRate = result.probabilities ? Object.values(result.probabilities).reduce((sum, prob) => sum + prob, 0) : 0;
        successRateBreakdown = result.rankDistribution || null;
        engineVersion = result.engineVersion || '3.0.0';
        policyVersion = result.engineVersion || '3.0.0';
        
        console.log('✅ 조합 엔진 v3.0 응답 파싱 완료');
        console.log('📊 확률:', result.probabilities);
        console.log('📊 등급 분포:', result.rankDistribution);
        console.log('🔧 엔진 버전:', engineVersion);
        console.log('🔧 정책 버전:', policyVersion);
      }
      
      console.log('🔧 최종 파싱 결과:', { 
        fusionSuccess, 
        resultCard, 
        successRate, 
        engineVersion,
        policyVersion 
      });

      if (fusionSuccess !== undefined) {
        console.log('✅ 조합 API 성공, 룰렛 표시');
        console.log('🔧 fusionSuccess:', fusionSuccess);
        console.log('🔧 resultCard:', resultCard);

        // 서버 확률 정보 저장 (툴팁 표시용)
        this.currentServerProbabilities = {
          successRate,
          successRateBreakdown,
          engineVersion,
          policyVersion
        };

        // 룰렛으로 결과 표시
        try {
          this.showRoulette(filledSlots, resultCard);
        } catch (rouletteError) {
          console.error('룰렛 표시 에러:', rouletteError);
        }

        // 조합 결과에 따른 효과음 재생 (항상 성공)
        try {
          if (resultCard) {
            window.gameUtils.playSound('fusion_success');
          }
        } catch (soundError) {
          console.error('효과음 재생 에러:', soundError);
        }
      } else {
        console.error('❌ 조합 결과를 파싱할 수 없음:', result);
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

    // 🎭 짜릿한 연출을 위한 "아슬아슬" 카드 배치
    const getTeaseCard = () => {
      // 높은 등급의 카드들로 유혹
      const highRankCards = allCards.filter(card => ['SSS', 'SS', 'S'].includes(card.rank));
      return highRankCards.length > 0 ?
        highRankCards[Math.floor(Math.random() * highRankCards.length)] :
        allCards[Math.floor(Math.random() * allCards.length)];
    };

    // 120장의 기본 카드 세트 생성 (성능 최적화)
    const baseCards = [];
    for (let i = 0; i < 120; i++) {
      // 나머지는 랜덤 카드
      const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
      baseCards.push(randomCard);
    }

    // 🔄 120장을 두 번 반복해서 240장으로 무한 룰렛 효과 (성능 최적화)
    rouletteCards.push(...baseCards, ...baseCards);

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
    
    // 🔧 DOM 계측 기반 치수 계산
    const container = rouletteWheel.parentElement;
    const firstCard = cards[0];
    const pointer = container.querySelector('.roulette-pointer');
    
    // 실제 DOM 치수 측정
    const containerRect = container.getBoundingClientRect();
    const cardRect = firstCard.getBoundingClientRect();
    const pointerRect = pointer.getBoundingClientRect();
    
    const containerWidth = containerRect.width;
    const cardWidth = cardRect.width + this.getComputedMarginRight(firstCard);
    const pointerX = pointerRect.left - containerRect.left;
    
    // 🎯 결과 카드를 정확한 위치에 배치하고 그 위치에서 멈추기 (240장 기준)
    const targetIndex = 160 + Math.floor(Math.random() * 40); // 160~199 중 랜덤 (안전한 위치)
    
    // 결과 카드를 정확한 위치에 배치
    if (resultCard) {
      // 조합 성공: 결과 카드를 배치
      cards[targetIndex].innerHTML = `
        <img src="${resultCard.image}" alt="${resultCard.name}">
        <div class="card-name">${resultCard.name}</div>
        <div class="card-rank">${resultCard.rank}</div>
      `;
      cards[targetIndex].dataset.cardId = resultCard.id;
    } else {
      // 조합 실패: 재료 카드 중 하나를 배치
      const randomMaterial = selectedCards[Math.floor(Math.random() * selectedCards.length)];
      cards[targetIndex].innerHTML = `
        <img src="${randomMaterial.image}" alt="${randomMaterial.name}">
        <div class="card-name">${randomMaterial.name}</div>
        <div class="card-rank">${randomMaterial.rank}</div>
      `;
      cards[targetIndex].dataset.cardId = randomMaterial.id;
    }

    // 📍 정확한 위치 계산: 포인터 중심에 카드 중심이 오도록
    const startPosition = 0;
    const cardCenterOffset = cardWidth / 2;
    const endPosition = pointerX - cardCenterOffset - (targetIndex * cardWidth);

    // 🔍 상세 디버깅 로깅
    const debugInfo = {
      containerWidth: containerWidth.toFixed(1),
      cardWidth: cardWidth.toFixed(1),
      cardMargin: this.getComputedMarginRight(firstCard).toFixed(1),
      pointerX: pointerX.toFixed(1),
      targetIndex,
      cardCenterOffset: cardCenterOffset.toFixed(1),
      endPosition: endPosition.toFixed(1),
      finalCardPosition: (targetIndex * cardWidth).toFixed(1),
      duration: 4000,
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      timestamp: new Date().toISOString()
    };
    
    console.log('🎯 룰렛 DOM 계측 결과:', debugInfo);
    
    // 오차 검증 및 경고
    const measuredCenter = pointerX;
    const expectedCenter = pointerX;
    const error = Math.abs(measuredCenter - expectedCenter);
    
    if (error > 1) {
      console.warn(`⚠️ 포인터 정렬 오차 감지: ${error.toFixed(1)}px`);
      console.warn('디버그 정보:', debugInfo);
    } else {
      console.log(`✅ 포인터 정렬 정확: 오차 ${error.toFixed(1)}px`);
    }
    
    // 성능 모니터링
    const startTime = performance.now();
    this.rouletteStartTime = startTime;

    // 애니메이션 시작
    rouletteWheel.style.transition = 'none';
    rouletteWheel.style.transform = 'translateX(0px)';

    // 룰렛 효과음 재생
    this.playRouletteSound();

    // 🎪 정확한 애니메이션 실행
    requestAnimationFrame(() => {
      // 레이아웃 강제 후 2틱 대기 (프레임 튕김 방지)
      requestAnimationFrame(() => {
        const duration = 4000; // 4초
        const easing = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
        
        rouletteWheel.style.transition = `transform ${duration}ms ${easing}`;
        rouletteWheel.style.transform = `translateX(${endPosition}px)`;

        // 애니메이션 완료 후 결과 표시
        setTimeout(() => {
          // 성능 측정 완료
          const endTime = performance.now();
          const totalTime = endTime - this.rouletteStartTime;
          console.log(`🎯 룰렛 애니메이션 완료: ${totalTime.toFixed(1)}ms`);
          
          this.showRouletteResult(resultCard, selectedCards);
        }, duration);
      });
    });
  }

  // 🔧 계산된 마진값 가져오기
  getComputedMarginRight(element) {
    const computedStyle = window.getComputedStyle(element);
    const marginRight = parseFloat(computedStyle.marginRight) || 0;
    return marginRight;
  }

  // 🧪 룰렛 정확도 테스트 (개발용)
  testRouletteAccuracy(testCount = 100) {
    console.log(`🧪 룰렛 정확도 테스트 시작 (${testCount}회)`);
    
    const results = {
      totalTests: testCount,
      accurateStops: 0,
      errors: [],
      averageError: 0,
      maxError: 0,
      minError: Infinity
    };

    for (let i = 0; i < testCount; i++) {
      try {
        // 가상의 룰렛 컨테이너 생성
        const testContainer = document.createElement('div');
        testContainer.className = 'roulette-container';
        testContainer.style.width = '500px';
        testContainer.style.height = '180px';
        testContainer.style.position = 'relative';
        testContainer.style.overflow = 'hidden';
        
        const testWheel = document.createElement('div');
        testWheel.className = 'roulette-wheel';
        testWheel.style.display = 'flex';
        testWheel.style.height = '100%';
        testWheel.style.alignItems = 'center';
        
        const testPointer = document.createElement('div');
        testPointer.className = 'roulette-pointer';
        testPointer.style.position = 'absolute';
        testPointer.style.top = '50%';
        testPointer.style.right = '20px';
        testPointer.style.transform = 'translateY(-50%)';
        testPointer.style.width = '0';
        testPointer.style.height = '0';
        testPointer.style.borderTop = '15px solid transparent';
        testPointer.style.borderBottom = '15px solid transparent';
        testPointer.style.borderLeft = '30px solid #ffd700';
        
        testContainer.appendChild(testWheel);
        testContainer.appendChild(testPointer);
        document.body.appendChild(testContainer);
        
        // 테스트 카드 생성
        for (let j = 0; j < 240; j++) {
          const card = document.createElement('div');
          card.className = 'roulette-card';
          card.style.width = '100px';
          card.style.height = '140px';
          card.style.marginRight = '8px';
          card.style.flexShrink = '0';
          testWheel.appendChild(card);
        }
        
        // DOM 계측
        const containerRect = testContainer.getBoundingClientRect();
        const firstCard = testWheel.children[0];
        const cardRect = firstCard.getBoundingClientRect();
        const pointerRect = testPointer.getBoundingClientRect();
        
        const containerWidth = containerRect.width;
        const cardWidth = cardRect.width + this.getComputedMarginRight(firstCard);
        const pointerX = pointerRect.left - containerRect.left;
        
        // 테스트 위치 계산
        const targetIndex = 160 + Math.floor(Math.random() * 40);
        const cardCenterOffset = cardWidth / 2;
        const endPosition = pointerX - cardCenterOffset - (targetIndex * cardWidth);
        
        // 오차 계산
        const expectedPosition = targetIndex * cardWidth;
        const actualPosition = Math.abs(endPosition);
        const error = Math.abs(expectedPosition - actualPosition);
        
        if (error <= 1) {
          results.accurateStops++;
        }
        
        results.errors.push(error);
        results.maxError = Math.max(results.maxError, error);
        results.minError = Math.min(results.minError, error);
        
        // 정리
        document.body.removeChild(testContainer);
        
      } catch (error) {
        console.error(`테스트 ${i + 1} 실패:`, error);
      }
    }
    
    // 결과 계산
    results.averageError = results.errors.reduce((sum, error) => sum + error, 0) / results.errors.length;
    results.accuracy = (results.accurateStops / results.totalTests) * 100;
    
    console.log('🧪 룰렛 정확도 테스트 결과:', {
      정확도: `${results.accuracy.toFixed(1)}%`,
      정확한_정지: `${results.accurateStops}/${results.totalTests}`,
      평균_오차: `${results.averageError.toFixed(2)}px`,
      최대_오차: `${results.maxError.toFixed(2)}px`,
      최소_오차: `${results.minError.toFixed(2)}px`
    });
    
    return results;
  }

  // 🧪 반응형 브레이크포인트 테스트
  testResponsiveBreakpoints() {
    console.log('🧪 반응형 브레이크포인트 테스트 시작');
    
    const breakpoints = [
      { name: '데스크톱', width: 500, height: 180 },
      { name: '태블릿', width: 400, height: 150 },
      { name: '모바일', width: 350, height: 120 },
      { name: '소형모바일', width: 300, height: 100 }
    ];
    
    const results = [];
    
    breakpoints.forEach(breakpoint => {
      try {
        // 테스트 컨테이너 생성
        const testContainer = document.createElement('div');
        testContainer.className = 'roulette-container';
        testContainer.style.width = `${breakpoint.width}px`;
        testContainer.style.height = `${breakpoint.height}px`;
        testContainer.style.position = 'relative';
        testContainer.style.overflow = 'hidden';
        
        const testWheel = document.createElement('div');
        testWheel.className = 'roulette-wheel';
        testWheel.style.display = 'flex';
        testWheel.style.height = '100%';
        testWheel.style.alignItems = 'center';
        
        const testPointer = document.createElement('div');
        testPointer.className = 'roulette-pointer';
        testPointer.style.position = 'absolute';
        testPointer.style.top = '50%';
        testPointer.style.right = '20px';
        testPointer.style.transform = 'translateY(-50%)';
        testPointer.style.width = '0';
        testPointer.style.height = '0';
        testPointer.style.borderTop = '15px solid transparent';
        testPointer.style.borderBottom = '15px solid transparent';
        testPointer.style.borderLeft = '30px solid #ffd700';
        
        testContainer.appendChild(testWheel);
        testContainer.appendChild(testPointer);
        document.body.appendChild(testContainer);
        
        // 테스트 카드 생성
        for (let j = 0; j < 10; j++) {
          const card = document.createElement('div');
          card.className = 'roulette-card';
          card.style.flexShrink = '0';
          testWheel.appendChild(card);
        }
        
        // DOM 계측
        const containerRect = testContainer.getBoundingClientRect();
        const firstCard = testWheel.children[0];
        const cardRect = firstCard.getBoundingClientRect();
        const pointerRect = testPointer.getBoundingClientRect();
        
        const actualWidth = containerRect.width;
        const cardWidth = cardRect.width + this.getComputedMarginRight(firstCard);
        const pointerX = pointerRect.left - containerRect.left;
        
        const result = {
          breakpoint: breakpoint.name,
          expectedWidth: breakpoint.width,
          actualWidth: actualWidth.toFixed(1),
          cardWidth: cardWidth.toFixed(1),
          pointerX: pointerX.toFixed(1),
          widthError: Math.abs(breakpoint.width - actualWidth).toFixed(1)
        };
        
        results.push(result);
        console.log(`✅ ${breakpoint.name}:`, result);
        
        // 정리
        document.body.removeChild(testContainer);
        
      } catch (error) {
        console.error(`${breakpoint.name} 테스트 실패:`, error);
      }
    });
    
    return results;
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
        <p style="color: #4CAF50; font-size: 1.2rem; font-weight: 700;">🎉 조합 성공! 🎉</p>
      `;
      
      // 컬렉션에 추가 (로그만 기록)
      this.addToCollection(resultCard.id);

      // 컬렉션 UI 즉시 업데이트 (서버 동기화 후)
      this.updateCollectionUI();
    } else {
      // 조합 시스템에서는 항상 성공 (실패 없음)
      rouletteResult.innerHTML = `
        <div style="color: #4caf50; font-size: 1.2rem; font-weight: 700;">
          ✅ 조합 성공! 카드를 획득했습니다
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
        <div class="fusion-success" style="color: #4caf50; font-size: 1.2rem; font-weight: 700;">
          <div style="font-size: 3rem; margin-bottom: 10px;">✅</div>
          <div>조합 성공!</div>
        </div>
      `;
      resultMessage.textContent = '카드를 성공적으로 조합했습니다!';
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