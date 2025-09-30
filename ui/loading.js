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

    // 로딩 화면 생성 - 완전한 검은 배경
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loadingScreen';
    loadingScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      opacity: 1;
    `;

    loadingScreen.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
        <div style="width: 300px; height: 8px; background: #333333; border-radius: 4px; overflow: hidden;">
          <div id="loadingProgress" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); transition: width 0.3s ease;"></div>
        </div>
        <div id="loadingPercentage" style="color: #888888; font-size: 14px;">0%</div>
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
