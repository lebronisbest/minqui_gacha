// Feature Flag 관리 시스템
class FeatureFlagManager {
  constructor() {
    this.flags = new Map();
    this.loadFlags();
  }

  /**
   * 환경변수에서 플래그 로드
   */
  loadFlags() {
    // 조합 엔진 v2.0 플래그
    this.flags.set('FUSION_ENGINE_V2', {
      enabled: process.env.FUSION_ENGINE_V2 === 'true',
      rollout: parseInt(process.env.FUSION_ENGINE_V2_ROLLOUT) || 0, // 0-100%
      description: '조합 엔진 v2.0 활성화',
      version: '2.0.0'
    });

    // 보안 기능 플래그
    this.flags.set('ENHANCED_SECURITY', {
      enabled: process.env.ENHANCED_SECURITY === 'true',
      rollout: 100,
      description: '향상된 보안 기능',
      version: '1.0.0'
    });

    // 피티 시스템 플래그
    this.flags.set('PITY_SYSTEM', {
      enabled: process.env.PITY_SYSTEM === 'true',
      rollout: 100,
      description: '피티 시스템 활성화',
      version: '1.0.0'
    });

    // 레이트리밋 플래그
    this.flags.set('RATE_LIMITING', {
      enabled: process.env.RATE_LIMITING === 'true',
      rollout: 100,
      description: '레이트리밋 활성화',
      version: '1.0.0'
    });
  }

  /**
   * 플래그 상태 확인
   * @param {string} flagName - 플래그 이름
   * @param {string} userId - 사용자 ID (롤아웃 계산용)
   * @returns {boolean} 플래그 활성화 여부
   */
  isEnabled(flagName, userId = null) {
    const flag = this.flags.get(flagName);
    if (!flag) return false;
    
    if (!flag.enabled) return false;
    
    // 롤아웃 체크
    if (flag.rollout < 100 && userId) {
      const userHash = this.hashUserId(userId);
      return userHash < flag.rollout;
    }
    
    return flag.rollout === 100;
  }

  /**
   * 사용자 ID 해시 (일관된 롤아웃을 위해)
   * @param {string} userId - 사용자 ID
   * @returns {number} 0-99 범위의 해시값
   */
  hashUserId(userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    return Math.abs(hash) % 100;
  }

  /**
   * 모든 플래그 상태 조회
   * @param {string} userId - 사용자 ID
   * @returns {Object} 플래그 상태 맵
   */
  getAllFlags(userId = null) {
    const result = {};
    for (const [name, flag] of this.flags) {
      result[name] = {
        enabled: this.isEnabled(name, userId),
        rollout: flag.rollout,
        description: flag.description,
        version: flag.version
      };
    }
    return result;
  }

  /**
   * 플래그 동적 업데이트 (런타임)
   * @param {string} flagName - 플래그 이름
   * @param {Object} updates - 업데이트할 속성들
   */
  updateFlag(flagName, updates) {
    const flag = this.flags.get(flagName);
    if (flag) {
      Object.assign(flag, updates);
      console.log(`플래그 업데이트: ${flagName}`, updates);
    }
  }

  /**
   * 플래그 롤아웃 증가
   * @param {string} flagName - 플래그 이름
   * @param {number} increment - 증가량 (기본 25%)
   */
  increaseRollout(flagName, increment = 25) {
    const flag = this.flags.get(flagName);
    if (flag) {
      const newRollout = Math.min(100, flag.rollout + increment);
      this.updateFlag(flagName, { rollout: newRollout });
      console.log(`롤아웃 증가: ${flagName} ${flag.rollout}% → ${newRollout}%`);
    }
  }

  /**
   * 플래그 비활성화 (긴급 롤백)
   * @param {string} flagName - 플래그 이름
   */
  disableFlag(flagName) {
    this.updateFlag(flagName, { enabled: false, rollout: 0 });
    console.log(`긴급 비활성화: ${flagName}`);
  }
}

// 캔어리 지표 관리
class CanaryMetrics {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      errorRate: 0.05,      // 5% 이상 에러율
      responseTime: 2000,   // 2초 이상 응답시간
      successRate: 0.7,     // 70% 이하 성공률
      userComplaints: 10    // 10건 이상 고객문의
    };
  }

  /**
   * 지표 기록
   * @param {string} metricName - 지표 이름
   * @param {number} value - 지표 값
   * @param {Object} metadata - 메타데이터
   */
  recordMetric(metricName, value, metadata = {}) {
    const timestamp = Date.now();
    const metric = {
      name: metricName,
      value,
      timestamp,
      metadata
    };

    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    this.metrics.get(metricName).push(metric);

    // 최근 100개만 유지
    const metrics = this.metrics.get(metricName);
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }

    console.log(`지표 기록: ${metricName} = ${value}`, metadata);
  }

  /**
   * 지표 조회
   * @param {string} metricName - 지표 이름
   * @param {number} timeWindow - 시간 윈도우 (밀리초, 기본 5분)
   * @returns {Array} 지표 배열
   */
  getMetrics(metricName, timeWindow = 300000) {
    const metrics = this.metrics.get(metricName) || [];
    const cutoff = Date.now() - timeWindow;
    return metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * 평균값 계산
   * @param {string} metricName - 지표 이름
   * @param {number} timeWindow - 시간 윈도우
   * @returns {number} 평균값
   */
  getAverage(metricName, timeWindow = 300000) {
    const metrics = this.getMetrics(metricName, timeWindow);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * 캔어리 상태 체크
   * @returns {Object} 캔어리 상태
   */
  checkCanaryHealth() {
    const health = {
      status: 'healthy',
      issues: [],
      metrics: {}
    };

    // 에러율 체크
    const errorRate = this.getAverage('error_rate', 300000);
    health.metrics.errorRate = errorRate;
    if (errorRate > this.thresholds.errorRate) {
      health.status = 'unhealthy';
      health.issues.push(`높은 에러율: ${(errorRate * 100).toFixed(1)}%`);
    }

    // 응답시간 체크
    const responseTime = this.getAverage('response_time', 300000);
    health.metrics.responseTime = responseTime;
    if (responseTime > this.thresholds.responseTime) {
      health.status = 'unhealthy';
      health.issues.push(`느린 응답시간: ${responseTime}ms`);
    }

    // 성공률 체크
    const successRate = this.getAverage('fusion_success_rate', 300000);
    health.metrics.successRate = successRate;
    if (successRate < this.thresholds.successRate) {
      health.status = 'unhealthy';
      health.issues.push(`낮은 성공률: ${(successRate * 100).toFixed(1)}%`);
    }

    // 고객문의 체크
    const complaints = this.getMetrics('user_complaints', 300000).length;
    health.metrics.complaints = complaints;
    if (complaints > this.thresholds.userComplaints) {
      health.status = 'unhealthy';
      health.issues.push(`높은 고객문의: ${complaints}건`);
    }

    return health;
  }
}

// 배포 관리자
class DeploymentManager {
  constructor() {
    this.featureFlags = new FeatureFlagManager();
    this.metrics = new CanaryMetrics();
    this.deploymentHistory = [];
  }

  /**
   * 점진적 배포 실행
   * @param {string} flagName - 플래그 이름
   * @param {Array} stages - 배포 단계 [5, 25, 50, 100]
   */
  async executeGradualDeployment(flagName, stages = [5, 25, 50, 100]) {
    console.log(`점진적 배포 시작: ${flagName}`);
    
    for (const stage of stages) {
      console.log(`배포 단계: ${stage}%`);
      
      // 플래그 활성화
      this.featureFlags.updateFlag(flagName, { 
        enabled: true, 
        rollout: stage 
      });
      
      // 5분 대기 (캔어리 관찰)
      await this.wait(300000);
      
      // 캔어리 상태 체크
      const health = this.metrics.checkCanaryHealth();
      console.log(`캔어리 상태 (${stage}%):`, health);
      
      if (health.status === 'unhealthy') {
        console.error('캔어리 실패, 롤백 실행');
        this.rollback(flagName);
        return false;
      }
    }
    
    console.log(`배포 완료: ${flagName} 100%`);
    return true;
  }

  /**
   * 긴급 롤백
   * @param {string} flagName - 플래그 이름
   */
  rollback(flagName) {
    console.log(`긴급 롤백 실행: ${flagName}`);
    this.featureFlags.disableFlag(flagName);
    
    // 롤백 기록
    this.deploymentHistory.push({
      action: 'rollback',
      flagName,
      timestamp: new Date().toISOString(),
      reason: 'canary_failure'
    });
  }

  /**
   * 대기 함수
   * @param {number} ms - 밀리초
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 배포 상태 조회
   * @returns {Object} 배포 상태
   */
  getDeploymentStatus() {
    return {
      flags: this.featureFlags.getAllFlags(),
      canaryHealth: this.metrics.checkCanaryHealth(),
      deploymentHistory: this.deploymentHistory.slice(-10) // 최근 10개
    };
  }
}

module.exports = {
  FeatureFlagManager,
  CanaryMetrics,
  DeploymentManager
};
