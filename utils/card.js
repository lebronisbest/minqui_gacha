// 민킈 카드 가챠게임 - 카드 관련 함수들
class CardSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 특정 랭크의 카드들 중에서 랜덤 선택
  selectRandomCard(rank) {
    const cardsOfRank = this.game.gameData.cards.filter(card => card.rank === rank);
    if (cardsOfRank.length === 0) {
      // 해당 랭크의 카드가 없으면 첫 번째 카드 반환
      return this.game.gameData.cards[0];
    }
    const randomIndex = Math.floor(Math.random() * cardsOfRank.length);
    return cardsOfRank[randomIndex];
  }

  // 서버에서 받은 확률 사용
  selectRandomRank() {
    if (!this.game.gameData.ranks) {
      console.error('확률 데이터가 없습니다!');
      return 'B'; // 폴백
    }
    
    const probabilities = {};
    for (const [rank, data] of Object.entries(this.game.gameData.ranks)) {
      probabilities[rank] = data.probability;
    }
    
    console.log('사용할 확률:', probabilities);
    return this.selectRankByProbability(probabilities);
  }

  // 확률 기반 랭크 선택
  selectRankByProbability(probabilities) {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const [rank, probability] of Object.entries(probabilities)) {
      cumulative += probability;
      if (random <= cumulative) {
        return rank;
      }
    }
    
    return 'B'; // 폴백
  }

  // 해당 랭크의 카드 중에서 랜덤 선택
  generateRandomCard(rank) {
    const cardsOfRank = this.game.gameData.cards.filter(card => card.rank === rank);
    if (cardsOfRank.length === 0) {
      return this.game.gameData.cards[0]; // 폴백
    }
    const randomIndex = Math.floor(Math.random() * cardsOfRank.length);
    return cardsOfRank[randomIndex];
  }

  // 여러 방법으로 뒷면 이미지 요소 찾기
  setBackImage() {
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
      backIllust.src = 'illust/000.png';
      
      // 이미지 로드 실패 시 폴백
      backIllust.onerror = () => {
        backIllust.src = 'illust/000.png';
      };
      
      // 이미지 로드 시도 (load() 메서드는 존재하지 않음)
      // 이미지가 자동으로 로드됨
    }
  }

  // 카드 데이터 업데이트
  updateCardData(selectedCard, selectedRank) {
    if (!this.game.gameData || !this.game.gameData.ranks[selectedRank]) {
      console.error('랭크 데이터를 찾을 수 없습니다:', selectedRank);
      return;
    }

    const rankInfo = this.game.gameData.ranks[selectedRank];
    this.game.cardData = { ...selectedCard };

    // 이미지 경로가 없으면 기본값 설정
    if (!this.game.cardData.image) {
      console.warn('카드 이미지 경로가 없습니다:', selectedCard);
      this.game.cardData.image = 'illust/001.png'; // 기본 이미지
    }

    // 홀로그램 패턴이 없으면 기본값 설정
    if (!this.game.cardData.holoPattern) {
      this.game.cardData.holoPattern = 'sparkles'; // 기본 홀로그램 패턴
    }

    // 랭크에 따른 스탯 조정
    this.game.cardData.rank = selectedRank;
    this.game.cardData.hp = Math.floor(selectedCard.baseHp * rankInfo.hpMultiplier);
    this.game.cardData.attack = Math.floor(selectedCard.baseAttack * rankInfo.attackMultiplier);
    this.game.cardData.color = rankInfo.color;
  }

  // 카드 정보 업데이트
  updateCardInfo() {
    if (!this.game.cardData) return;

    // 카드 이름 업데이트
    const cardNameElement = document.getElementById('cardName');
    if (cardNameElement) {
      cardNameElement.textContent = this.game.cardData.name;
    }

    // 카드 번호 업데이트
    const cardNumberElement = document.getElementById('cardNumber');
    if (cardNumberElement) {
      cardNumberElement.textContent = `#${this.game.cardData.id}`;
    }

    // HP와 공격력 업데이트
    const hpElement = document.getElementById('hp');
    const attackElement = document.getElementById('attack');
    if (hpElement) {
      hpElement.textContent = this.game.cardData.hp || 100;
    }
    if (attackElement) {
      attackElement.textContent = this.game.cardData.attack || 100;
    }

    // 스킬 정보 업데이트
    const skill = this.game.cardData.attacks && this.game.cardData.attacks[0];
    if (skill) {
      document.getElementById('skillName').textContent = skill.name || '창작 마법';
      document.getElementById('skillDescription').textContent = skill.description || '무한한 상상력으로 새로운 세계를 창조한다.';
    } else {
      // 스킬 데이터가 없을 때 기본값 설정
      document.getElementById('skillName').textContent = '창작 마법';
      document.getElementById('skillDescription').textContent = '무한한 상상력으로 새로운 세계를 창조한다.';
    }
    
    // 배경 이미지와 캐릭터 이미지 업데이트
    const cardBackground = document.querySelector('.card-background-illustration img');
    const cardCharacter = document.querySelector('.card-character img');
    const cardBackgroundIllustration = document.querySelector('.card-background-illustration');
    
    if (cardBackground) {
      cardBackground.src = this.game.cardData.image;
      cardBackground.alt = `${this.game.cardData.name} 배경 일러스트`;
    }
    
    // 홀로그램 패턴 적용
    if (cardBackgroundIllustration && this.game.cardData.holoPattern) {
      cardBackgroundIllustration.setAttribute('data-pattern', this.game.cardData.holoPattern);
    }
    
    if (cardCharacter) {
      cardCharacter.src = this.game.cardData.image.replace('.png', '_2.png');
      cardCharacter.alt = `${this.game.cardData.name} 캐릭터`;
    }
    
    // 랭크 표시 업데이트
    this.updateRankDisplay();
  }

  // 랭크 표시 업데이트
  updateRankDisplay() {
    const rankImage = document.getElementById('rankImage');
    
    if (!rankImage) {
      return;
    }
    
    const rank = this.game.cardData.rank;
    
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

  // 랭크 스타일 적용
  applyRankStyle(rank) {
    const cardFront = this.game.cardWrapper.querySelector('.card-front');
    
    if (cardFront) {
      // 기존 랭크 클래스 제거
      cardFront.classList.remove('rank-s', 'rank-a', 'rank-b', 'rank-c', 'rank-d', 'rank-sss');
      
      // 새로운 랭크 클래스 추가
      cardFront.classList.add(`rank-${rank.toLowerCase()}`);
    }
  }
}

// 전역 카드 시스템 인스턴스 생성 함수
window.createCardSystem = function(gameInstance) {
  return new CardSystem(gameInstance);
};
