// 민킈 카드 가챠게임 - 조합 확률 관련 함수들
class FusionProbabilitySystem {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  // 조합 확률 계산
  calculateFusionProbability(selectedCards) {
    if (!selectedCards || selectedCards.length === 0) {
      return null;
    }

    // 카드 등급별 가중치
    const rankWeights = {
      'SSS': 100,
      'SS': 80,
      'S': 60,
      'A': 40,
      'B': 20
    };

    // 선택된 카드들의 총 가중치 계산
    const totalWeight = selectedCards.reduce((sum, card) => {
      return sum + (rankWeights[card.rank] || 0);
    }, 0);

    // 평균 가중치
    const averageWeight = totalWeight / selectedCards.length;

    // 확률 계산 (간단한 공식)
    const baseProbability = Math.min(averageWeight / 100, 1);
    const cardCountBonus = Math.min(selectedCards.length * 0.05, 0.3); // 최대 30% 보너스
    const finalProbability = Math.min(baseProbability + cardCountBonus, 0.95); // 최대 95%

    // 등급별 확률 분포
    const probabilities = {
      'SSS': finalProbability * 0.05, // 5%
      'SS': finalProbability * 0.15,  // 15%
      'S': finalProbability * 0.30,   // 30%
      'A': finalProbability * 0.35,   // 35%
      'B': finalProbability * 0.15    // 15%
    };

    return {
      total: finalProbability,
      byRank: probabilities,
      averageWeight: averageWeight,
      cardCount: selectedCards.length
    };
  }

  // 조합 정보 업데이트
  updateFusionInfo() {
    const selectedCards = this.game.fusionSystem.selectedFusionCards.filter(card => card !== null);
    const probability = this.calculateFusionProbability(selectedCards);
    
    const infoElement = document.querySelector('.fusion-info');
    if (!infoElement) return;

    if (probability) {
      const sssProb = Math.round(probability.byRank.SSS * 100);
      const ssProb = Math.round(probability.byRank.SS * 100);
      const sProb = Math.round(probability.byRank.S * 100);
      const aProb = Math.round(probability.byRank.A * 100);
      const bProb = Math.round(probability.byRank.B * 100);
      const totalProb = Math.round(probability.total * 100);

      infoElement.innerHTML = `
        <div class="fusion-probability">
          <h3>조합 확률</h3>
          <div class="probability-list">
            <div class="prob-item rank-sss">SSS: ${sssProb}%</div>
            <div class="prob-item rank-ss">SS: ${ssProb}%</div>
            <div class="prob-item rank-s">S: ${sProb}%</div>
            <div class="prob-item rank-a">A: ${aProb}%</div>
            <div class="prob-item rank-b">B: ${bProb}%</div>
          </div>
          <div class="total-probability">총 확률: ${totalProb}%</div>
          <div class="card-count">선택된 카드: ${probability.cardCount}개</div>
        </div>
      `;

      // 확률 툴팁 이벤트 추가
      this.addProbabilityTooltips();
    } else {
      infoElement.innerHTML = `
        <div class="fusion-probability">
          <h3>조합 확률</h3>
          <p>카드를 선택하면 확률이 표시됩니다.</p>
        </div>
      `;
    }
  }

  // 확률 툴팁 추가
  addProbabilityTooltips() {
    const probItems = document.querySelectorAll('.prob-item');
    probItems.forEach(item => {
      item.addEventListener('mouseenter', (e) => {
        this.showProbabilityTooltip(e.target, e.target.textContent);
      });
      
      item.addEventListener('mouseleave', () => {
        this.hideProbabilityTooltip();
      });
    });
  }

  // 확률 툴팁 표시
  showProbabilityTooltip(element, text) {
    // 기존 툴팁 제거
    this.hideProbabilityTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'probability-tooltip';
    tooltip.textContent = text;
    tooltip.style.position = 'absolute';
    tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '8px 12px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '14px';
    tooltip.style.zIndex = '1000';
    tooltip.style.pointerEvents = 'none';

    document.body.appendChild(tooltip);

    // 툴팁 위치 설정
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;

    // 애니메이션
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateY(10px)';
    
    requestAnimationFrame(() => {
      tooltip.style.transition = 'all 0.2s ease';
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
    });
  }

  // 확률 툴팁 숨기기
  hideProbabilityTooltip() {
    const tooltip = document.querySelector('.probability-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }
}

// 전역 함수로 생성
window.createFusionProbabilitySystem = function(gameInstance) {
  return new FusionProbabilitySystem(gameInstance);
};
