# 🏆 민킈 가챠 업적 시스템 구현 계획

## 📋 목차
1. [업적 카테고리](#업적-카테고리)
2. [기술 구조](#기술-구조)
3. [데이터베이스 설계](#데이터베이스-설계)
4. [클라이언트 구현](#클라이언트-구현)
5. [서버 구현](#서버-구현)
6. [UI/UX 설계](#uiux-설계)
7. [구현 순서](#구현-순서)

---

## 🎯 업적 카테고리

### 📦 **컬렉션 업적**
- 첫 번째 카드 (`first_card`) - 첫 가챠 뽑기
- 카드 수집가 (`collector_10/50/100`) - 10/50/100장 수집
- 등급 마스터 (`rank_master_s/ss/sss`) - S/SS/SSS급 카드 수집
- 완전체 (`completionist`) - 모든 카드 수집 (현재 30장)

### 🎰 **가챠 업적**
- 행운아 (`lucky_one`) - SSS급 카드 첫 획득
- 가챠왕 (`gacha_king_100/500/1000`) - 100/500/1000번 가챠
- 연속 성공 (`streak_5/10`) - 연속 5/10번 A급 이상 획득
- 대박 (`jackpot`) - 한 번에 SSS급 카드 획득

### ⚗️ **조합 업적**
- 연금술사 (`alchemist`) - 첫 조합 성공
- 조합 마스터 (`fusion_master_10/50/100`) - 10/50/100번 조합 성공
- 실패도 경험 (`failure_teacher`) - 조합 50번 실패
- 효율적 조합 (`efficient_fusion`) - 3장으로 조합 성공

### 🏅 **특별 업적**
- 수집광 (`collector_freak`) - 같은 카드 10장 수집
- 티켓 절약가 (`ticket_saver`) - 티켓 10장 모으기
- 속도광 (`speed_demon`) - 1분 내 5번 가챠
- 민킈 팬 (`minqui_fan`) - 민킈 관련 카드 모든 등급 수집

---

## 🏗️ 기술 구조

### **아키텍처 패턴**
```
클라이언트 ←→ API ←→ 업적 서비스 ←→ 데이터베이스
    ↓           ↓           ↓              ↓
  UI 표시    이벤트 전송  업적 확인    진행도 저장
```

### **이벤트 기반 시스템**
- 가챠 뽑기 → `gacha_drawn` 이벤트 발생
- 조합 실행 → `fusion_attempted` 이벤트 발생
- 카드 획득 → `card_acquired` 이벤트 발생

---

## 🗄️ 데이터베이스 설계

### **achievements 테이블**
```sql
CREATE TABLE achievements (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(20) NOT NULL, -- collection, gacha, fusion, special
  icon VARCHAR(50),
  requirement_type VARCHAR(20), -- count, collect, streak
  requirement_value INTEGER,
  requirement_data JSONB, -- 추가 조건 (카드 ID 등)
  reward_type VARCHAR(20), -- none, ticket, title
  reward_value INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **user_achievements 테이블**
```sql
CREATE TABLE user_achievements (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id VARCHAR(50) NOT NULL,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id),
  UNIQUE(user_id, achievement_id)
);
```

### **achievement_events 테이블** (진행도 추적)
```sql
CREATE TABLE achievement_events (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 💻 클라이언트 구현

### **업적 매니저 클래스**
```javascript
class AchievementManager {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.achievements = [];
    this.userAchievements = {};
    this.newAchievements = []; // 새로 달성한 업적
  }

  // 업적 목록 로드
  async loadAchievements()

  // 이벤트 전송
  async trackEvent(eventType, eventData)

  // 업적 달성 팝업 표시
  showAchievementPopup(achievement)

  // 업적 탭 UI 업데이트
  updateAchievementUI()
}
```

### **이벤트 추적 지점**
- 가챠 실행 후: `trackEvent('gacha_drawn', { cardId, rank })`
- 조합 실행 후: `trackEvent('fusion_attempted', { success, materials, result })`
- 카드 획득 시: `trackEvent('card_acquired', { cardId, method })`

---

## 🔧 서버 구현

### **업적 서비스 (`/api/achievements/`)**
```javascript
// GET /achievements - 전체 업적 목록
// GET /achievements/user - 사용자 업적 진행상황
// POST /achievements/track - 이벤트 추적
// POST /achievements/claim - 업적 보상 수령
```

### **업적 확인 로직**
```javascript
class AchievementService {
  // 이벤트 처리
  async handleEvent(userId, eventType, eventData)

  // 업적 진행도 확인 및 업데이트
  async checkAndUpdateProgress(userId, achievementId, increment)

  // 업적 완료 처리
  async completeAchievement(userId, achievementId)
}
```

---

## 🎨 UI/UX 설계

### **업적 탭 구성**
```
┌─────────────────────────────────┐
│ 🏆 업적 (진행: 5/20)            │
├─────────────────────────────────┤
│ [컬렉션] [가챠] [조합] [특별]   │
├─────────────────────────────────┤
│ ✅ 첫 번째 카드                  │
│    첫 가챠를 뽑아보세요         │
│    보상: 없음                   │
├─────────────────────────────────┤
│ 🔄 카드 수집가 (15/50)          │
│    50장의 카드를 수집하세요     │
│    보상: 티켓 3장               │
├─────────────────────────────────┤
│ ⏳ 등급 마스터                   │
│    S급 카드를 획득하세요        │
│    진행도: 0/1                  │
└─────────────────────────────────┘
```

### **업적 달성 팝업**
```
┌─────────────────┐
│ 🎉 업적 달성!   │
│                 │
│ 🏆 카드 수집가   │
│ 50장 수집 완료!  │
│                 │
│ 🎁 보상: 티켓 3장 │
│                 │
│ [    확인    ]  │
└─────────────────┘
```

---

## 📝 구현 순서

### **Phase 1: 기초 구조**
1. 데이터베이스 테이블 생성
2. 기본 업적 데이터 삽입
3. API 엔드포인트 생성
4. 클라이언트 AchievementManager 구현

### **Phase 2: 기본 업적**
1. 가챠 관련 업적 (첫 가챠, 횟수)
2. 컬렉션 관련 업적 (수집 개수)
3. 이벤트 추적 시스템 구현

### **Phase 3: UI 구현**
1. 업적 탭 추가
2. 업적 목록 표시
3. 진행도 바 구현
4. 달성 팝업 구현

### **Phase 4: 고급 기능**
1. 조합 관련 업적
2. 특별 업적 (연속, 조건부)
3. 보상 시스템 (티켓 지급)
4. 업적 알림 시스템

---

## 🎯 예상 업적 목록

### **컬렉션 (8개)**
- 🎴 첫 번째 카드
- 📚 카드 수집가 I/II/III (10/50/100장)
- 🏅 등급 마스터 S/SS/SSS
- 👑 완전체 (모든 카드 수집)

### **가챠 (6개)**
- 🍀 행운아 (첫 SSS)
- 🎰 가챠왕 I/II/III (100/500/1000번)
- 🔥 연속 성공 (5/10번 연속)
- 💎 대박 (SSS 한 방)

### **조합 (5개)**
- ⚗️ 연금술사 (첫 조합 성공)
- 🧪 조합 마스터 I/II/III (10/50/100번 성공)
- 📖 실패도 경험 (50번 실패)

### **특별 (6개)**
- 💰 수집광 (같은 카드 10장)
- 🎫 티켓 절약가 (10장 보유)
- ⚡ 속도광 (1분 내 5번 가챠)
- 💖 민킈 팬 (민킈 카드 올 등급)

**총 25개 업적**으로 충분한 도전 과제 제공!

---

## 🚀 확장 가능성

### **시즌 업적**
- 기간 한정 업적
- 이벤트 연동 업적

### **소셜 기능**
- 친구와 업적 비교
- 리더보드 시스템

### **프리미엄 업적**
- 특별한 보상을 주는 고급 업적
- 타이틀 시스템 연동

---

이 계획을 바탕으로 단계별로 구현해나갈 수 있을 것 같습니다! 어떤 부분부터 시작하고 싶으신가요?