# Vercel 배포 스크립트 (PowerShell)

Write-Host "🚀 민킈 가챠 게임 Vercel 배포 시작..." -ForegroundColor Green

# Vercel CLI 설치 확인
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI가 설치되지 않았습니다." -ForegroundColor Red
    Write-Host "다음 명령어로 설치하세요: npm i -g vercel" -ForegroundColor Yellow
    exit 1
}

# Vercel 로그인 확인
Write-Host "🔐 Vercel 로그인 확인 중..." -ForegroundColor Yellow
try {
    $userInfo = vercel whoami 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Vercel에 로그인되지 않았습니다." -ForegroundColor Red
        Write-Host "다음 명령어로 로그인하세요: vercel login" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Vercel 로그인됨: $userInfo" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel 로그인 확인 실패" -ForegroundColor Red
    exit 1
}

# 환경 변수 설정 확인
Write-Host "🔧 환경 변수 설정 확인 중..." -ForegroundColor Yellow

$requiredEnvVars = @(
    "POSTGRES_URL",
    "REDIS_URL", 
    "JWT_SECRET",
    "MAX_TICKETS",
    "TICKET_REFILL_HOURS"
)

$missingVars = @()
foreach ($var in $requiredEnvVars) {
    $value = vercel env ls | Select-String $var
    if (-not $value) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ 다음 환경 변수가 설정되지 않았습니다:" -ForegroundColor Red
    $missingVars | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "Vercel 대시보드에서 환경 변수를 설정하세요." -ForegroundColor Yellow
    Write-Host "또는 다음 명령어로 설정하세요:" -ForegroundColor Yellow
    $missingVars | ForEach-Object { Write-Host "  vercel env add $_" -ForegroundColor Cyan }
    exit 1
}

Write-Host "✅ 모든 환경 변수 설정됨" -ForegroundColor Green

# 프로젝트 배포
Write-Host "🚀 프로젝트 배포 중..." -ForegroundColor Yellow
try {
    # 개발 환경 배포
    Write-Host "📦 개발 환경 배포 중..." -ForegroundColor Yellow
    vercel --yes
    
    # 프로덕션 환경 배포
    Write-Host "🌐 프로덕션 환경 배포 중..." -ForegroundColor Yellow
    vercel --prod --yes
    
    Write-Host "✅ 배포 완료!" -ForegroundColor Green
} catch {
    Write-Host "❌ 배포 실패: $_" -ForegroundColor Red
    exit 1
}

# 배포 URL 확인
Write-Host "🔍 배포 URL 확인 중..." -ForegroundColor Yellow
try {
    $deploymentUrl = vercel ls --json | ConvertFrom-Json | Select-Object -First 1 | Select-Object -ExpandProperty url
    Write-Host "✅ 배포 URL: https://$deploymentUrl" -ForegroundColor Green
} catch {
    Write-Host "⚠️ 배포 URL을 자동으로 가져올 수 없습니다." -ForegroundColor Yellow
    Write-Host "Vercel 대시보드에서 확인하세요." -ForegroundColor Yellow
}

# 데이터베이스 초기화
Write-Host "📊 데이터베이스 초기화 중..." -ForegroundColor Yellow
try {
    $seedUrl = "https://$deploymentUrl/api/seed"
    $response = Invoke-WebRequest -Uri $seedUrl -Method POST -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 데이터베이스 초기화 완료" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 데이터베이스 초기화 실패 (수동으로 시도하세요)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ 데이터베이스 초기화 실패: $_" -ForegroundColor Yellow
    Write-Host "수동으로 다음 URL에 POST 요청을 보내세요: https://$deploymentUrl/api/seed" -ForegroundColor Yellow
}

# 헬스체크
Write-Host "🏥 헬스체크 실행 중..." -ForegroundColor Yellow
try {
    $healthUrl = "https://$deploymentUrl/api/health"
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 헬스체크 통과" -ForegroundColor Green
    } else {
        Write-Host "❌ 헬스체크 실패" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 헬스체크 실패: $_" -ForegroundColor Red
}

Write-Host "🎉 Vercel 배포 완료!" -ForegroundColor Green
Write-Host "📱 게임 접속: https://$deploymentUrl" -ForegroundColor Cyan
Write-Host "🔧 API 문서: https://$deploymentUrl/api/health" -ForegroundColor Cyan
Write-Host "📊 Vercel 대시보드: https://vercel.com/dashboard" -ForegroundColor Cyan

# 다음 단계 안내
Write-Host "`n📋 다음 단계:" -ForegroundColor Yellow
Write-Host "1. Vercel 대시보드에서 도메인 설정" -ForegroundColor White
Write-Host "2. 환경 변수 확인 및 조정" -ForegroundColor White
Write-Host "3. 모니터링 설정" -ForegroundColor White
Write-Host "4. SSL 인증서 확인" -ForegroundColor White
