// 민킈 카드 가챠게임
class MinquiCardGacha {
  constructor() {
    this.cardWrapper = document.getElementById('cardWrapper');
    this.isFlipped = false;
    this.cardData = null;
    this.sounds = {};
    
    this.init();
  }
  
  async init() {
    // 이벤트 리스너 등록
    this.bindEvents();
    
    // 카드 데이터 로드
    await this.loadCardData();
    
    // 효과음 초기화
    this.initSounds();
    
    // 개발용 패널 초기화
    this.initDevPanel();
    
    // 초기 상태: 뒷면으로 시작
    this.showBack();
    
    // 뒷면 이미지 설정
    this.setBackImage();
  }
  
  async loadCardData() {
    try {
      // JSON 파일에서 데이터 로드
      const response = await fetch('cards.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.gameData = await response.json();
      
      // 기본 카드 데이터 설정
      this.cardData = { ...this.gameData.cards[0] };
    } catch (error) {
      console.error('카드 데이터 로드 실패:', error);
      
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
            color: "#ff6b6b",
            emoji: "👑"
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
    // 효과음 파일들 로드
    this.sounds = {
      cardFlip: new Audio('sounds/card_flip.mp3'),
      cardDraw: new Audio('sounds/card_draw.mp3'),
      sssObtain: new Audio('sounds/sss_obtain.mp3'),
      ssObtain: new Audio('sounds/ss_obtain.mp3'),
      sObtain: new Audio('sounds/s_obtain.mp3'),
      aObtain: new Audio('sounds/a_obtain.mp3'),
      bObtain: new Audio('sounds/b_obtain.mp3'),
      particle: new Audio('sounds/particle.mp3'),
      holo: new Audio('sounds/holo.mp3')
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
      sound.play().catch(e => {
        console.log('효과음 재생 실패:', e);
      });
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
        this.playSound('cardDraw');
    }
  }
  
  bindEvents() {
    this.cardWrapper.addEventListener('click', () => {
      this.handleClick();
    });
    
    // 터치 이벤트 추가 (모바일)
    this.cardWrapper.addEventListener('touchstart', (e) => {
      e.preventDefault();
    });
    
    this.cardWrapper.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handleClick();
    });
    
    // 3D 마우스 인터랙션 - 카드 래퍼에 적용
    this.cardWrapper.addEventListener('mousemove', (e) => {
      this.handleMouseMove(e);
    });
    
    this.cardWrapper.addEventListener('mouseleave', () => {
      this.resetTilt();
    });
    
    // 모바일 터치 인터랙션
    this.cardWrapper.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
      }
    });
    
    this.cardWrapper.addEventListener('touchend', () => {
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
    
    this.cardWrapper.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
    
    // 개발용 카드 선택 버튼
    document.getElementById('selectCardBtn').addEventListener('click', () => {
      this.selectSpecificCard();
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
    if (!this.isFlipped) {
      // 뒷면에서 앞면으로 - 가챠 실행
      this.playSound('cardDraw');
      this.performGacha();
    } else {
      // 앞면에서 뒷면으로 - 다시 뽑기
      this.playSound('cardFlip');
      this.showBack();
    }
  }
  
  performGacha() {
    // 랜덤 랭크 선택 (가중치 적용)
    const selectedRank = this.selectRandomRank();
    
    // 선택된 랭크의 카드 중에서 랜덤 선택
    const selectedCard = this.selectRandomCard(selectedRank);
    
    // 선택된 카드와 랭크로 데이터 업데이트
    this.updateCardData(selectedCard, selectedRank);
    
    // 카드 정보 업데이트
    this.updateCardInfo();
    
    // 앞면으로 뒤집기
    this.showFront();
    
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
    // 가중치 기반 랭크 선택 (현실적인 가챠 확률)
    const weights = {
      'SSS': 1,    // 1% 확률 (매우 희귀)
      'SS': 4,     // 4% 확률 (희귀)
      'S': 15,     // 15% 확률 (보통)
      'A': 30,     // 30% 확률 (자주)
      'B': 50      // 50% 확률 (매우 자주)
    };
    
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    // 가중치를 누적하면서 비교
    let cumulativeWeight = 0;
    for (const [rank, weight] of Object.entries(weights)) {
      cumulativeWeight += weight;
      if (random <= cumulativeWeight) {
        return rank;
      }
    }
    
    return 'B'; // 기본값
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
            
            // 홀로그램 패턴 업데이트
            this.updateHoloPattern();
            
            // 하단 통계 정보 업데이트
            document.getElementById('cardHp').textContent = this.cardData.hp || 300;
            document.getElementById('cardAttack').textContent = this.cardData.attack || 240;
            
            // 타입 정보 업데이트 (이모지)
            const typeIcon = this.gameData.typeIcons[this.cardData.type] || '🎨';
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
            
            if (cardBackground) {
                cardBackground.src = this.cardData.image;
                cardBackground.alt = `${this.cardData.name} 배경 일러스트`;
            }
            
            if (cardCharacter) {
                cardCharacter.src = this.cardData.image.replace('.png', '_2.png');
                cardCharacter.alt = `${this.cardData.name} 캐릭터`;
            }
            
            // 랭크 표시 업데이트
            this.updateRankDisplay();
        }
        
        updateHoloPattern() {
            const holoElement = document.querySelector('.card__holo');
            if (!holoElement || !this.cardData) {
                console.log('홀로그램 요소 또는 카드 데이터가 없습니다');
                return;
            }
            
            // 기존 패턴 클래스 제거
            holoElement.classList.remove('pattern-crown', 'pattern-stars', 'pattern-waves', 'pattern-circuits', 'pattern-sparkles');
            
            // 새로운 패턴 클래스 추가
            const pattern = this.cardData.holoPattern || 'crown';
            console.log('적용할 패턴:', pattern, '카드 데이터:', this.cardData);
            holoElement.classList.add(`pattern-${pattern}`);
            
            // 홀로그램 색상 업데이트
            if (this.cardData.holoColor) {
                holoElement.style.setProperty('--holo-color', this.cardData.holoColor);
            }
            
            // 클래스가 제대로 적용되었는지 확인
            console.log('홀로그램 요소 클래스:', holoElement.className);
        }
  
  
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
  
  initDevPanel() {
    if (!this.gameData) return;
    
    const cardSelector = document.getElementById('cardSelector');
    cardSelector.innerHTML = '<option value="">카드 선택</option>';
    
    // 각 카드별로 옵션 추가
    this.gameData.cards.forEach(card => {
      const option = document.createElement('option');
      option.value = card.id;
      option.textContent = `${card.name} (${card.rank})`;
      cardSelector.appendChild(option);
    });
  }
  
  selectSpecificCard() {
    const cardSelector = document.getElementById('cardSelector');
    const selectedCardId = cardSelector.value;
    
    if (!selectedCardId) {
      // 카드가 선택되지 않음
      return;
    }
    
    // 특정 카드 선택
    const selectedCard = this.gameData.cards.find(card => card.id === selectedCardId);
    if (!selectedCard) return;
    
    // 선택된 카드와 랭크로 데이터 업데이트
    this.updateCardData(selectedCard, selectedCard.rank);
    
    // 카드 정보 업데이트
    this.updateCardInfo();
    
    // 앞면으로 뒤집기
    this.showFront();
    
    // 가챠 결과 알림
    this.showResult();
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
  
}

// 페이지 로드 시 게임 시작
document.addEventListener('DOMContentLoaded', () => {
  new MinquiCardGacha();
});