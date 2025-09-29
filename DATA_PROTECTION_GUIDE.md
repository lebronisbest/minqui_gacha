# 🛡️ 데이터 보호 가이드

> **⚠️ 중요: 이 문서를 반드시 읽고 숙지하세요!**
>
> 배포 시 사용자 데이터 손실을 방지하기 위한 안전장치가 적용되어 있습니다.

## 🔒 보호되는 데이터 (절대 삭제 금지)

다음 테이블들은 사용자의 중요한 데이터를 포함하고 있어 **절대로 삭제하면 안 됩니다**:

### 📊 사용자 핵심 데이터
- **`users`** - 사용자 계정 정보
- **`user_inventory`** - 사용자가 수집한 카드 데이터 ⭐
- **`gacha_logs`** - 가챠 뽑기 기록
- **`fusion_logs`** - 카드 조합 기록
- **`audit_logs`** - 시스템 감사 로그

## ✅ 안전하게 재생성 가능한 데이터

다음 테이블은 언제든지 안전하게 삭제하고 재생성할 수 있습니다:

- **`cards`** - 카드 카탈로그 (게임 콘텐츠)

## 🛡️ 자동 보호 시스템

### 1. 데이터 보호 모듈
- **파일**: `api/lib/data-protection.js`
- **기능**:
  - 보호된 테이블 삭제 시도 시 에러 발생
  - 환경별 보호 레벨 설정
  - 실시간 데이터 현황 모니터링

### 2. 안전한 Seed 스크립트
- **파일**: `api/seed/index.js`
- **기능**:
  - 사용자 데이터 현황 사전 체크
  - 카드 카탈로그만 안전하게 업데이트
  - 작업 전후 데이터 변경 사항 검증

### 3. 환경 변수 검증
- **필수 환경 변수**:
  - `POSTGRES_URL` - PostgreSQL 연결 문자열
  - `NODE_ENV` - 실행 환경 설정

## 🚨 에러 발생 시 대응 방법

### "데이터 보호 안전장치 발동" 에러
```
🚨 데이터 보호 안전장치 발동! 🚨
테이블: user_inventory
작업: DELETE
보호 레벨: STRICT
```

**해결 방법:**
1. 코드를 검토하여 올바른 테이블을 대상으로 하는지 확인
2. `SAFE_TO_DELETE_TABLES` 목록 참조 (`cards` 테이블만 삭제 가능)
3. 개발/테스트 환경에서만 `BYPASS_DATA_PROTECTION=true` 사용 가능

### 환경 변수 누락 에러
```
🚨 배포 실패: 필수 환경 변수 누락
```

**해결 방법:**
1. Vercel 대시보드 → 프로젝트 설정 → Environment Variables
2. `POSTGRES_URL` 설정 (Vercel Postgres 연결 문자열)
3. 필요시 `NODE_ENV` 설정

## 📋 배포 전 체크리스트

### ✅ 환경 설정
- [ ] `POSTGRES_URL` 환경 변수 설정됨
- [ ] Vercel Postgres 데이터베이스 연결 확인
- [ ] 기존 사용자 데이터 백업 완료

### ✅ 코드 검토
- [ ] 사용자 데이터 테이블에 대한 `DELETE`, `DROP`, `TRUNCATE` 쿼리 없음
- [ ] `cards` 테이블 외 다른 테이블 삭제 코드 없음
- [ ] 데이터 보호 모듈 import 확인

### ✅ 테스트
- [ ] `/api/seed` 엔드포인트로 카드 데이터 업데이트 테스트
- [ ] 사용자 수집 데이터 보존 확인
- [ ] 가챠/조합 기능 정상 작동 확인

## 🔧 개발자 도구

### 데이터 현황 확인
```javascript
const { generateDataStatusReport } = require('./api/lib/data-protection');

// 현재 데이터베이스 상태 확인
const report = await generateDataStatusReport();
console.log(report);
```

### 안전한 카드 업데이트
```javascript
const { safeCardReseed } = require('./api/lib/data-protection');

// 카드 데이터만 안전하게 재시드
await safeCardReseed();
```

### 테이블 작업 검증
```javascript
const { validateTableOperation } = require('./api/lib/data-protection');

// 테이블 작업 전 안전성 검증
await validateTableOperation('cards', 'DELETE'); // ✅ 허용
await validateTableOperation('users', 'DELETE'); // ❌ 에러 발생
```

## 🌍 환경별 보호 레벨

| 환경 | 보호 레벨 | 설명 |
|------|-----------|------|
| **Production** | `STRICT` | 최고 수준 보호 - 사용자 데이터 절대 삭제 불가 |
| **Staging** | `MODERATE` | 중간 수준 보호 - 경고 메시지 표시 |
| **Development** | `RELAXED` | 완화된 보호 - 우회 키로 개발 테스트 가능 |

## 🆘 긴급 상황 대응

### 개발/테스트 환경에서만 사용 가능한 우회 방법
```bash
# 환경 변수 설정 (프로덕션에서는 무시됨)
BYPASS_DATA_PROTECTION=true
```

**⚠️ 주의사항:**
- 프로덕션 환경에서는 우회 불가능
- 개발 환경에서만 제한적으로 사용
- 사용 후 반드시 환경 변수 제거

## 📞 문제 발생 시 연락처

1. **데이터 복구가 필요한 경우**
   - 즉시 Vercel Postgres 백업에서 데이터 복원
   - 시스템 관리자에게 연락

2. **안전장치 관련 문의**
   - `api/lib/data-protection.js` 파일 참조
   - 이 문서의 가이드라인 확인

---

**💡 기억하세요:**
- 사용자 데이터는 게임의 핵심 자산입니다
- 한 번 잃어버리면 복구가 어렵거나 불가능할 수 있습니다
- 의심스러운 작업은 항상 테스트 환경에서 먼저 시도하세요
- 안전장치는 여러분과 사용자를 보호하기 위해 존재합니다

**🔒 안전한 배포를 위해 이 가이드를 숙지하고 준수해 주세요!**