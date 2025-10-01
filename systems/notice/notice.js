// 민킈 카드 가챠게임 - 공지사항 시스템
class NoticeSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.notices = [];
    this.isModalOpen = false;
    this.isAdminMode = false;
    
    this.init();
  }

  // 공지사항 시스템 초기화
  init() {
    this.checkAdminMode();
    this.createNoticeToggle();
    this.createNoticeModal();
    this.loadNotices();
  }

  // 관리자 모드 확인
  checkAdminMode() {
    const urlParams = new URLSearchParams(window.location.search);
    this.isAdminMode = urlParams.get('admin') === 'true';
    
    if (this.isAdminMode) {
      this.createAdminInterface();
    }
  }

  // 공지사항 토글 버튼 생성
  createNoticeToggle() {
    const toggleButton = document.createElement('div');
    toggleButton.id = 'notice-toggle';
    toggleButton.className = 'notice-toggle';
    toggleButton.innerHTML = `
      <div class="notice-toggle-icon">📢</div>
      <div class="notice-toggle-text">공지사항</div>
    `;
    
    toggleButton.addEventListener('click', () => {
      this.toggleNoticeModal();
    });
    
    document.body.appendChild(toggleButton);
  }

  // 공지사항 모달 생성
  createNoticeModal() {
    const modal = document.createElement('div');
    modal.id = 'notice-modal';
    modal.className = 'notice-modal';
    modal.innerHTML = `
      <div class="notice-modal-content">
        <div class="notice-modal-header">
          <h2>📢 공지사항</h2>
          <button class="notice-close-btn">&times;</button>
        </div>
        <div class="notice-modal-body">
          <div class="notice-list" id="notice-list">
            <div class="notice-loading">공지사항을 불러오는 중...</div>
          </div>
        </div>
        <div class="notice-modal-footer">
          <button class="notice-refresh-btn">새로고침</button>
          <button class="notice-close-footer-btn">닫기</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 이벤트 리스너 추가
    modal.querySelector('.notice-close-btn').addEventListener('click', () => {
      this.closeNoticeModal();
    });
    
    modal.querySelector('.notice-close-footer-btn').addEventListener('click', () => {
      this.closeNoticeModal();
    });
    
    modal.querySelector('.notice-refresh-btn').addEventListener('click', () => {
      this.loadNotices();
    });
    
    // 모달 배경 클릭 시 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeNoticeModal();
      }
    });
  }

  // 관리자 인터페이스 생성
  createAdminInterface() {
    const adminPanel = document.createElement('div');
    adminPanel.id = 'notice-admin-panel';
    adminPanel.className = 'notice-admin-panel';
    adminPanel.innerHTML = `
      <div class="admin-panel-header">
        <h3>📝 공지사항 관리</h3>
        <button class="admin-close-btn">&times;</button>
      </div>
      <div class="admin-panel-body">
        <form id="notice-form" class="notice-form">
          <div class="form-group">
            <label for="notice-title">제목</label>
            <input type="text" id="notice-title" name="title" required>
          </div>
          <div class="form-group">
            <label for="notice-content">내용</label>
            <textarea id="notice-content" name="content" rows="5" required></textarea>
          </div>
          <div class="form-group">
            <label for="notice-priority">우선순위</label>
            <select id="notice-priority" name="priority">
              <option value="normal">일반</option>
              <option value="high">높음</option>
              <option value="urgent">긴급</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="submit" class="notice-save-btn">공지사항 저장</button>
            <button type="button" class="notice-clear-btn">초기화</button>
          </div>
        </form>
        <div class="admin-notice-list">
          <h4>기존 공지사항</h4>
          <div id="admin-notice-list" class="admin-notice-items">
            <div class="admin-loading">공지사항을 불러오는 중...</div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(adminPanel);
    
    // 이벤트 리스너 추가
    adminPanel.querySelector('.admin-close-btn').addEventListener('click', () => {
      adminPanel.style.display = 'none';
    });
    
    document.getElementById('notice-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveNotice();
    });
    
    document.querySelector('.notice-clear-btn').addEventListener('click', () => {
      this.clearNoticeForm();
    });
    
    this.loadAdminNotices();
  }

  // 공지사항 모달 토글
  toggleNoticeModal() {
    const modal = document.getElementById('notice-modal');
    if (this.isModalOpen) {
      this.closeNoticeModal();
    } else {
      this.openNoticeModal();
    }
  }

  // 공지사항 모달 열기
  openNoticeModal() {
    const modal = document.getElementById('notice-modal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    this.isModalOpen = true;
    this.loadNotices();
  }

  // 공지사항 모달 닫기
  closeNoticeModal() {
    const modal = document.getElementById('notice-modal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    this.isModalOpen = false;
  }

  // 공지사항 로드
  async loadNotices() {
    try {
      const response = await this.game.apiClient.request('/notices');
      if (response && response.success) {
        this.notices = response.data.notices || [];
        this.renderNotices();
      } else {
        this.renderNoticesError();
      }
    } catch (error) {
      console.error('공지사항 로드 실패:', error);
      this.renderNoticesError();
    }
  }

  // 관리자용 공지사항 로드
  async loadAdminNotices() {
    try {
      const response = await this.game.apiClient.request('/notices');
      if (response && response.success) {
        this.renderAdminNotices(response.data.notices || []);
      } else {
        this.renderAdminNoticesError();
      }
    } catch (error) {
      console.error('관리자 공지사항 로드 실패:', error);
      this.renderAdminNoticesError();
    }
  }

  // 공지사항 렌더링
  renderNotices() {
    const noticeList = document.getElementById('notice-list');
    
    if (this.notices.length === 0) {
      noticeList.innerHTML = '<div class="notice-empty">📢 아직 등록된 공지사항이 없습니다.<br>관리자가 새로운 공지사항을 작성하면 여기에 표시됩니다.</div>';
      return;
    }
    
    const noticesHtml = this.notices
      .sort((a, b) => {
        // 우선순위별 정렬 (긴급 > 높음 > 일반)
        const priorityOrder = { urgent: 3, high: 2, normal: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .map(notice => `
        <div class="notice-item ${notice.priority}">
          <div class="notice-item-header">
            <div class="notice-priority-badge ${notice.priority}">
              ${this.getPriorityText(notice.priority)}
            </div>
            <div class="notice-date">${this.formatDate(notice.createdAt)}</div>
          </div>
          <div class="notice-title">${notice.title}</div>
          <div class="notice-content">${notice.content}</div>
        </div>
      `).join('');
    
    noticeList.innerHTML = noticesHtml;
  }

  // 관리자용 공지사항 렌더링
  renderAdminNotices(notices) {
    const adminNoticeList = document.getElementById('admin-notice-list');
    
    if (notices.length === 0) {
      adminNoticeList.innerHTML = '<div class="admin-empty">📝 아직 등록된 공지사항이 없습니다.<br>위의 폼을 사용하여 첫 번째 공지사항을 작성해보세요!</div>';
      return;
    }
    
    const noticesHtml = notices.map(notice => `
      <div class="admin-notice-item">
        <div class="admin-notice-info">
          <div class="admin-notice-title">${notice.title}</div>
          <div class="admin-notice-meta">
            <span class="admin-notice-priority ${notice.priority}">${this.getPriorityText(notice.priority)}</span>
            <span class="admin-notice-date">${this.formatDate(notice.createdAt)}</span>
          </div>
        </div>
        <div class="admin-notice-actions">
          <button class="admin-edit-btn" onclick="noticeSystem.editNotice('${notice.id}')">수정</button>
          <button class="admin-delete-btn" onclick="noticeSystem.deleteNotice('${notice.id}')">삭제</button>
        </div>
      </div>
    `).join('');
    
    adminNoticeList.innerHTML = noticesHtml;
  }

  // 공지사항 저장
  async saveNotice() {
    const form = document.getElementById('notice-form');
    const formData = new FormData(form);
    
    const noticeData = {
      title: formData.get('title'),
      content: formData.get('content'),
      priority: formData.get('priority')
    };
    
    try {
      const response = await this.game.apiClient.request('/notices', {
        method: 'POST',
        body: JSON.stringify(noticeData)
      });
      
      if (response && response.success) {
        alert('공지사항이 저장되었습니다.');
        this.clearNoticeForm();
        this.loadAdminNotices();
        this.loadNotices();
      } else {
        alert('공지사항 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('공지사항 저장 실패:', error);
      alert('공지사항 저장 중 오류가 발생했습니다.');
    }
  }

  // 공지사항 수정
  editNotice(noticeId) {
    const notice = this.notices.find(n => n.id === noticeId);
    if (!notice) return;
    
    document.getElementById('notice-title').value = notice.title;
    document.getElementById('notice-content').value = notice.content;
    document.getElementById('notice-priority').value = notice.priority;
  }

  // 공지사항 삭제
  async deleteNotice(noticeId) {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) return;
    
    try {
      const response = await this.game.apiClient.request(`/notices/${noticeId}`, {
        method: 'DELETE'
      });
      
      if (response && response.success) {
        alert('공지사항이 삭제되었습니다.');
        this.loadAdminNotices();
        this.loadNotices();
      } else {
        alert('공지사항 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('공지사항 삭제 실패:', error);
      alert('공지사항 삭제 중 오류가 발생했습니다.');
    }
  }

  // 공지사항 폼 초기화
  clearNoticeForm() {
    document.getElementById('notice-form').reset();
  }


  // 우선순위 텍스트 가져오기
  getPriorityText(priority) {
    const priorityTexts = {
      normal: '일반',
      high: '높음',
      urgent: '긴급'
    };
    return priorityTexts[priority] || '일반';
  }

  // 날짜 포맷팅
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 에러 렌더링
  renderNoticesError() {
    const noticeList = document.getElementById('notice-list');
    noticeList.innerHTML = '<div class="notice-error">공지사항을 불러올 수 없습니다.</div>';
  }

  renderAdminNoticesError() {
    const adminNoticeList = document.getElementById('admin-notice-list');
    adminNoticeList.innerHTML = '<div class="admin-error">공지사항을 불러올 수 없습니다.</div>';
  }
}

// 전역 함수로 생성
window.createNoticeSystem = function(gameInstance) {
  return new NoticeSystem(gameInstance);
};

// 전역 변수로 설정 (관리자 기능에서 사용)
window.noticeSystem = null;
