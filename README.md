# 민킈 카드 가챠 게임 - 서버 기반 SaaS 아키텍처

## 🎯 개요

민킈 카드 가챠 게임을 클라이언트 사이드에서 서버 기반 SaaS 아키텍처로 전환한 프로젝트입니다. 확률 조작 방지와 IP 보호를 위해 모든 핵심 로직을 서버에서 처리합니다.

## 🏗️ 아키텍처

### 서버 기반 결정 로직
- **가챠 시스템**: 확률 계산, 카드 선택, 티켓 관리
- **조합 시스템**: 복잡한 수학적 확률 계산, 재료 검증
- **인벤토리 관리**: 카드 보유 현황, 획득 기록
- **티켓 시스템**: 충전 시간, 사용량 추적

### 클라이언트 역할
- **UI/UX**: 카드 플립, 애니메이션, 효과음
- **로컬 캐시**: 빠른 렌더링을 위한 데이터 캐싱
- **API 통신**: 서버와의 안전한 데이터 교환

## 🚀 빠른 시작

### 1. 개발 환경 설정

```bash
# 백엔드 의존성 설치
cd backend
npm install

# 환경 변수 설정
cp env.example .env
# .env 파일을 편집하여 데이터베이스 정보 설정

# 데이터베이스 마이그레이션
npm run migrate

# 개발 서버 시작
npm run dev
```

### 2. 프로덕션 배포

#### Docker Compose 사용 (권장)

```bash
# Windows PowerShell
.\deploy.ps1

# Linux/macOS
./deploy.sh
```

#### 수동 배포

```bash
# 1. 데이터베이스 및 Redis 시작
docker-compose up -d postgres redis

# 2. 백엔드 빌드 및 시작
cd backend
npm run build
npm start

# 3. 프론트엔드 서빙 (Nginx 또는 다른 웹서버)
# 정적 파일을 웹서버에 배포
```

## 📁 프로젝트 구조

```
minqui_gacha/
├── backend/                 # 백엔드 API 서버
│   ├── src/
│   │   ├── controllers/     # API 컨트롤러
│   │   ├── services/        # 비즈니스 로직
│   │   ├── middleware/      # 보안 및 인증 미들웨어
│   │   ├── config/          # 데이터베이스 설정
│   │   └── types/           # TypeScript 타입 정의
│   ├── Dockerfile
│   └── package.json
├── frontend/                # 프론트엔드 (기존 파일들)
│   ├── index.html
│   ├── script.js           # 서버 API 연동
│   ├── styles.css
│   └── api-client.js       # API 클라이언트
├── docker-compose.yml      # 컨테이너 오케스트레이션
├── nginx.conf              # 리버스 프록시 설정
└── deploy.ps1              # 배포 스크립트
```

## 🔧 API 엔드포인트

### 인증
- `POST /api/auth/guest` - 게스트 로그인
- `POST /api/auth/validate` - 세션 검증
- `POST /api/auth/logout` - 로그아웃

### 카탈로그
- `GET /api/catalog` - 카드 목록 조회
- `GET /api/catalog/:cardId` - 카드 상세 정보

### 가챠
- `POST /api/gacha/draw` - 가챠 실행
- `GET /api/gacha/tickets` - 티켓 정보 조회

### 조합
- `POST /api/fusion/commit` - 조합 실행

### 컬렉션
- `GET /api/collection` - 컬렉션 조회
- `GET /api/collection/stats` - 컬렉션 통계

## 🛡️ 보안 기능

### 서버 측 보안
- **서버 난수 생성**: `crypto.randomBytes()` 사용
- **속도 제한**: IP/사용자별 요청 제한
- **감사 로그**: 모든 가챠/조합 기록
- **세션 관리**: JWT 기반 인증

### 클라이언트 측 보안
- **API 클라이언트**: 중앙화된 통신 관리
- **로컬 캐시**: IndexedDB 사용
- **오류 처리**: 서버 연결 실패 시 폴백

## 📊 데이터베이스 스키마

### 주요 테이블
- `users` - 사용자 세션 정보
- `cards` - 카드 메타데이터
- `user_inventory` - 사용자 인벤토리
- `gacha_logs` - 가챠 기록
- `fusion_logs` - 조합 기록
- `audit_logs` - 감사 로그

## 🔄 마이그레이션 가이드

### 기존 클라이언트 사이드에서 서버 기반으로 전환

1. **백엔드 서버 구축**
   ```bash
   cd backend
   npm install
   npm run migrate
   npm start
   ```

2. **프론트엔드 수정**
   - `api-client.js` 추가
   - `script.js`의 결정 로직을 API 호출로 변경
   - 로컬 저장소를 캐시로만 사용

3. **데이터 마이그레이션**
   - 기존 `cards.json`을 데이터베이스에 시드
   - 사용자 데이터는 새로 시작

## 🚀 배포 및 운영

### 환경 변수
```env
DATABASE_URL=postgresql://user:password@localhost:5432/minqui_gacha
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
NODE_ENV=production
```

### 모니터링
- **헬스체크**: `GET /api/health`
- **로그**: 구조화된 JSON 로그
- **메트릭**: 요청 수, 응답 시간, 에러율

### 확장성
- **수평 확장**: 여러 백엔드 인스턴스
- **캐싱**: Redis를 통한 세션 및 데이터 캐싱
- **CDN**: 정적 파일 배포

## 🐛 문제 해결

### 일반적인 문제
1. **서버 연결 실패**: 백엔드 서버가 실행 중인지 확인
2. **데이터베이스 연결 오류**: PostgreSQL 서비스 상태 확인
3. **Redis 연결 오류**: Redis 서비스 상태 확인

### 로그 확인
```bash
# 백엔드 로그
docker-compose logs backend

# 데이터베이스 로그
docker-compose logs postgres

# Redis 로그
docker-compose logs redis
```

## 📈 성능 최적화

### 서버 측
- **연결 풀링**: PostgreSQL 연결 풀 사용
- **캐싱**: Redis를 통한 자주 사용되는 데이터 캐싱
- **인덱싱**: 데이터베이스 쿼리 최적화

### 클라이언트 측
- **로컬 캐시**: IndexedDB를 통한 데이터 캐싱
- **지연 로딩**: 필요한 데이터만 로드
- **압축**: Gzip을 통한 네트워크 최적화

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 지원

문제가 발생하거나 질문이 있으시면 이슈를 생성해주세요.

---

**민킈 카드 가챠 게임** - 서버 기반 SaaS 아키텍처로 안전하고 확장 가능한 게임을 만들어보세요! 🎮✨
