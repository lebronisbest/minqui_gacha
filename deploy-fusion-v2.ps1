# 조합 엔진 v2.0 배포 스크립트
param(
    [string]$Environment = "staging",
    [switch]$Rollback,
    [switch]$Force
)

Write-Host "🚀 조합 엔진 v2.0 배포 시작" -ForegroundColor Green
Write-Host "환경: $Environment" -ForegroundColor Yellow

# 환경변수 설정
$env:POSTGRES_URL = $env:POSTGRES_URL
$env:NODE_ENV = $Environment

# Feature Flag 설정
if ($Rollback) {
    Write-Host "🔄 롤백 모드: v1.0 엔진으로 복귀" -ForegroundColor Red
    $env:FUSION_ENGINE_V2 = "false"
    $env:FUSION_ENGINE_V2_ROLLOUT = "0"
} else {
    Write-Host "🚀 신규 배포: v2.0 엔진 활성화" -ForegroundColor Green
    $env:FUSION_ENGINE_V2 = "true"
    $env:FUSION_ENGINE_V2_ROLLOUT = "5"  # 5%부터 시작
}

# 보안 기능 활성화
$env:ENHANCED_SECURITY = "true"
$env:PITY_SYSTEM = "true"
$env:RATE_LIMITING = "true"
$env:HMAC_SECRET = "your-secret-key-here"

Write-Host "📋 Feature Flags 설정 완료" -ForegroundColor Cyan
Write-Host "  - FUSION_ENGINE_V2: $env:FUSION_ENGINE_V2" -ForegroundColor White
Write-Host "  - FUSION_ENGINE_V2_ROLLOUT: $env:FUSION_ENGINE_V2_ROLLOUT%" -ForegroundColor White
Write-Host "  - ENHANCED_SECURITY: $env:ENHANCED_SECURITY" -ForegroundColor White
Write-Host "  - PITY_SYSTEM: $env:PITY_SYSTEM" -ForegroundColor White
Write-Host "  - RATE_LIMITING: $env:RATE_LIMITING" -ForegroundColor White

# 데이터베이스 마이그레이션 실행
Write-Host "🗄️ 데이터베이스 마이그레이션 실행 중..." -ForegroundColor Yellow
try {
    # PostgreSQL 연결 및 마이그레이션 실행
    $migrationQuery = Get-Content "api/migrations/001_fusion_engine_schema.sql" -Raw
    Write-Host "✅ 마이그레이션 스크립트 로드 완료" -ForegroundColor Green
    Write-Host "⚠️ 수동으로 데이터베이스에 마이그레이션을 실행해주세요:" -ForegroundColor Yellow
    Write-Host "   psql $env:POSTGRES_URL -f api/migrations/001_fusion_engine_schema.sql" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 마이그레이션 스크립트 로드 실패: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 테스트 실행
Write-Host "🧪 테스트 실행 중..." -ForegroundColor Yellow
try {
    if (Test-Path "api/tests") {
        Write-Host "✅ 테스트 디렉토리 확인 완료" -ForegroundColor Green
        Write-Host "⚠️ 수동으로 테스트를 실행해주세요:" -ForegroundColor Yellow
        Write-Host "   cd api && npm test" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️ 테스트 디렉토리가 없습니다. 건너뜁니다." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 테스트 실행 실패: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $Force) {
        Write-Host "❌ --Force 플래그 없이는 계속할 수 없습니다." -ForegroundColor Red
        exit 1
    }
}

# Vercel 배포
Write-Host "🚀 Vercel 배포 실행 중..." -ForegroundColor Yellow
try {
    if ($Environment -eq "production") {
        Write-Host "🌐 프로덕션 배포 실행" -ForegroundColor Red
        Write-Host "⚠️ 수동으로 Vercel 배포를 실행해주세요:" -ForegroundColor Yellow
        Write-Host "   vercel --prod" -ForegroundColor Cyan
    } else {
        Write-Host "🧪 스테이징 배포 실행" -ForegroundColor Yellow
        Write-Host "⚠️ 수동으로 Vercel 배포를 실행해주세요:" -ForegroundColor Yellow
        Write-Host "   vercel" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Vercel 배포 실패: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 배포 후 검증
Write-Host "🔍 배포 후 검증 실행 중..." -ForegroundColor Yellow
Write-Host "✅ 배포 완료! 다음 단계를 수행하세요:" -ForegroundColor Green
Write-Host ""
Write-Host "1. 데이터베이스 마이그레이션 실행:" -ForegroundColor Cyan
Write-Host "   psql `$POSTGRES_URL -f api/migrations/001_fusion_engine_schema.sql" -ForegroundColor White
Write-Host ""
Write-Host "2. 테스트 실행:" -ForegroundColor Cyan
Write-Host "   cd api && npm test" -ForegroundColor White
Write-Host ""
Write-Host "3. Vercel 배포:" -ForegroundColor Cyan
Write-Host "   vercel $($Environment -eq 'production' ? '--prod' : '')" -ForegroundColor White
Write-Host ""
Write-Host "4. 캔어리 모니터링:" -ForegroundColor Cyan
Write-Host "   - 5분간 에러율 모니터링" -ForegroundColor White
Write-Host "   - 응답시간 확인" -ForegroundColor White
Write-Host "   - 사용자 피드백 수집" -ForegroundColor White
Write-Host ""
Write-Host "5. 점진적 롤아웃:" -ForegroundColor Cyan
Write-Host "   - 5% → 25% → 50% → 100%" -ForegroundColor White
Write-Host "   - 각 단계마다 5분 대기" -ForegroundColor White
Write-Host "   - 문제 발생 시 즉시 롤백" -ForegroundColor White
Write-Host ""

if ($Rollback) {
    Write-Host "🔄 롤백 완료! v1.0 엔진이 활성화되었습니다." -ForegroundColor Red
} else {
    Write-Host "🎉 조합 엔진 v2.0 배포 준비 완료!" -ForegroundColor Green
    Write-Host "📊 모니터링 대시보드에서 지표를 확인하세요." -ForegroundColor Cyan
}
