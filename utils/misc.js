// 민킈 카드 가챠게임 - 기타 유틸리티 함수들
class MiscSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 배열 셔플
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // 미수집 카드 정보 표시
  showUnownedCardInfo(card) {
    // 수집되지 않은 카드 정보 표시
    const rankInfo = this.game.gameData.ranks[card.rank];
    const skill = card.attacks && card.attacks[0];
    const skillName = skill ? skill.name : '창작 마법';
    const skillDescription = skill ? skill.description : '무한한 상상력으로 새로운 세계를 창조한다.';
    
    const notification = document.createElement('div');
    notification.className = 'unowned-card-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #666, #888);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        font-size: 16px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        max-width: 300px;
        animation: unownedCardPulse 0.5s ease-out;
      ">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
          ${card.name}
        </div>
        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 15px;">
          ${rankInfo ? rankInfo.emoji : '⭐'} ${card.rank} 등급
        </div>
        <div style="font-size: 12px; opacity: 0.8; margin-bottom: 10px;">
          <strong>${skillName}</strong><br>
          ${skillDescription}
        </div>
        <div style="font-size: 11px; opacity: 0.7;">
          이 카드를 수집하려면 가챠를 진행하세요!
        </div>
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

// 전역 기타 시스템 인스턴스 생성 함수
window.createMiscSystem = function(gameInstance) {
  return new MiscSystem(gameInstance);
};
