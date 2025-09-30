// 민킈 카드 가챠게임 - 로딩 관련 함수들
class LoadingSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
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
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">민킈 가챠 게임 로딩 중...</div>
        <div class="loading-progress-container">
          <div class="loading-progress-bar">
            <div id="loadingProgress" class="loading-progress-fill"></div>
          </div>
          <div id="loadingPercentage" class="loading-percentage">0%</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(loadingScreen);
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
        setTimeout(updateProgress, 100 + Math.random() * 200);
      }
    };
    
    updateProgress();
  }
}

// 전역 로딩 시스템 인스턴스 생성 함수
window.createLoadingSystem = function(gameInstance) {
  return new LoadingSystem(gameInstance);
};
