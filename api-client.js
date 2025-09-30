// API 클라이언트 - 서버와의 통신을 담당
class ApiClient {
  constructor() {
    // Vercel 배포 시 자동으로 현재 도메인 사용
    this.baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001/api' 
      : '/api';
    this.userId = null;
    this.sessionId = null;
    this.requestId = 0;
  }

  // 요청 ID 생성
  generateRequestId() {
    return `req_${Date.now()}_${++this.requestId}`;
  }

  // 공통 요청 헤더
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'X-Request-Id': this.generateRequestId()
    };

    if (this.userId && this.sessionId) {
      headers['X-User-Id'] = this.userId;
      headers['X-Session-Id'] = this.sessionId;
    }

    return headers;
  }

  // API 요청 공통 메서드
  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config = {
        method: 'GET',
        headers: this.getHeaders(),
        ...options
      };

      if (options.body) {
        config.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // 게스트 로그인
  async guestLogin() {
    try {
      const response = await this.request('/auth/guest', { method: 'POST' });
      
      if (response.success) {
        this.userId = response.data.userId;
        this.sessionId = response.data.sessionId;
        
        // 세션 정보를 localStorage에 저장
        localStorage.setItem('minqui_user_id', this.userId);
        localStorage.setItem('minqui_session_id', this.sessionId);
        
        console.log('Guest login successful:', response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Guest login failed:', error);
      throw error;
    }
  }

  // 세션 복원
  async restoreSession() {
    const userId = localStorage.getItem('minqui_user_id');
    const sessionId = localStorage.getItem('minqui_session_id');

    if (!userId || !sessionId) {
      return false;
    }

    this.userId = userId;
    this.sessionId = sessionId;

    try {
      const response = await this.request('/auth/validate', { method: 'POST' });
      return response.success;
    } catch (error) {
      console.error('Session validation failed:', error);
      // 세션 정보 삭제
      localStorage.removeItem('minqui_user_id');
      localStorage.removeItem('minqui_session_id');
      this.userId = null;
      this.sessionId = null;
      return false;
    }
  }

  // 데이터베이스 초기화 (제거된 엔드포인트 - 자동 초기화로 대체)
  async initializeDatabase() {
    console.warn('Database initialization endpoint removed - using automatic initialization');
    return { message: 'Database initialization handled automatically' };
  }

  // 카드 데이터 시드 (제거된 엔드포인트 - 자동 시드로 대체)
  async seedCards() {
    console.warn('Card seeding endpoint removed - using automatic seeding');
    return { message: 'Card seeding handled automatically' };
  }

  // 카탈로그 조회
  async getCatalog() {
    try {
      const response = await this.request('/catalog');
      return response.data;
    } catch (error) {
      console.error('Failed to get catalog:', error);
      throw error;
    }
  }

  // 티켓 정보 조회
  async getTicketInfo() {
    try {
      const response = await this.request('/gacha/tickets');
      return response.data;
    } catch (error) {
      console.error('Failed to get ticket info:', error);
      throw error;
    }
  }

  // 가챠 실행
  async drawGacha() {
    try {
      const response = await this.request('/gacha/draw', { method: 'POST' });
      return response;
    } catch (error) {
      console.error('Gacha draw failed:', error);
      throw error;
    }
  }

  // 조합 실행
  async commitFusion(materialCardIds) {
    try {
      console.log('=== FUSION COMMIT REQUEST ===');
      console.log('Material Card IDs:', materialCardIds);
      console.log('User ID:', this.userId);
      console.log('Session ID:', this.sessionId);
      console.log('===============================');
      
      const response = await this.request('/fusion/commit', {
        method: 'POST',
        body: { materialCardIds }
      });
      
      console.log('Fusion commit response:', response);
      
      if (!response.success) {
        throw new Error(response.error || 'Fusion failed');
      }
      
      console.log('🔧 반환할 데이터:', response.data);
      return response.data;
    } catch (error) {
      console.error('=== FUSION COMMIT ERROR ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('============================');
      throw error;
    }
  }

  // 컬렉션 조회
  async getCollection() {
    try {
      const response = await this.request('/collection');
      return response.data;
    } catch (error) {
      console.error('Failed to get collection:', error);
      throw error;
    }
  }

  // 컬렉션 통계 조회
  async getCollectionStats() {
    try {
      const response = await this.request('/collection/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get collection stats:', error);
      throw error;
    }
  }

  // 로그아웃
  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // 로컬 세션 정보 삭제
      localStorage.removeItem('minqui_user_id');
      localStorage.removeItem('minqui_session_id');
      this.userId = null;
      this.sessionId = null;
    }
  }
}

// 전역 API 클라이언트 인스턴스
window.apiClient = new ApiClient();
