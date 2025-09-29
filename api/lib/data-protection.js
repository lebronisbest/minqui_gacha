// ====================================
// 데이터 보호 안전장치 모듈
// ====================================
//
// ⚠️  중요: 이 모듈은 사용자 데이터 보호를 위한 안전장치입니다.
//
// 절대로 다음 테이블의 데이터를 삭제하지 마세요:
// - users (사용자 정보)
// - user_inventory (사용자 카드 컬렉션)
// - gacha_logs (가챠 기록)
// - fusion_logs (조합 기록)
// - audit_logs (감사 로그)
//
// 안전하게 삭제 가능한 테이블:
// - cards (카드 카탈로그 - 재생성 가능)
//
// ====================================

const { pool } = require('./database');

// 보호된 테이블 목록 (사용자 데이터 포함)
const PROTECTED_TABLES = [
  'users',
  'user_inventory',
  'gacha_logs',
  'fusion_logs',
  'audit_logs'
];

// 안전하게 삭제 가능한 테이블 (카탈로그 데이터)
const SAFE_TO_DELETE_TABLES = [
  'cards'
];

// 환경별 보호 설정
const PROTECTION_LEVELS = {
  'production': 'STRICT',    // 프로덕션: 최고 보호
  'staging': 'MODERATE',     // 스테이징: 중간 보호
  'development': 'RELAXED'   // 개발: 완화된 보호
};

/**
 * 현재 환경의 보호 레벨 확인
 */
function getProtectionLevel() {
  const env = process.env.NODE_ENV || 'production';
  return PROTECTION_LEVELS[env] || 'STRICT';
}

/**
 * 테이블이 보호되어야 하는지 확인
 * @param {string} tableName - 테이블 이름
 * @returns {boolean} - 보호 대상 여부
 */
function isProtectedTable(tableName) {
  return PROTECTED_TABLES.includes(tableName.toLowerCase());
}

/**
 * 테이블이 안전하게 삭제 가능한지 확인
 * @param {string} tableName - 테이블 이름
 * @returns {boolean} - 안전한 삭제 가능 여부
 */
function isSafeToDelete(tableName) {
  return SAFE_TO_DELETE_TABLES.includes(tableName.toLowerCase());
}

/**
 * 사용자 데이터 존재 여부 확인
 * @returns {Promise<Object>} - 각 테이블별 데이터 수
 */
async function checkUserDataExists() {
  const client = await pool.connect();
  const dataStatus = {};

  try {
    for (const table of PROTECTED_TABLES) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        dataStatus[table] = parseInt(result.rows[0].count);
      } catch (error) {
        // 테이블이 존재하지 않으면 0으로 처리
        dataStatus[table] = 0;
      }
    }

    return dataStatus;
  } finally {
    client.release();
  }
}

/**
 * 보호된 테이블 삭제 시도 시 안전장치 발동
 * @param {string} tableName - 삭제하려는 테이블 이름
 * @param {string} operation - 수행하려는 작업 (예: 'DELETE', 'DROP', 'TRUNCATE')
 * @throws {Error} - 보호된 테이블 접근 시 에러 발생
 */
async function validateTableOperation(tableName, operation = 'DELETE') {
  const protectionLevel = getProtectionLevel();

  console.log(`🛡️  데이터 보호 검사: ${tableName} 테이블에 ${operation} 작업 시도`);
  console.log(`🔒 현재 보호 레벨: ${protectionLevel}`);

  // 보호된 테이블인지 확인
  if (isProtectedTable(tableName)) {
    const dataStatus = await checkUserDataExists();
    const hasData = dataStatus[tableName] > 0;

    console.log(`❌ 경고: ${tableName}은 사용자 데이터 보호 테이블입니다!`);
    console.log(`📊 현재 ${tableName} 테이블 데이터 수: ${dataStatus[tableName]}`);

    // 프로덕션에서는 무조건 차단
    if (protectionLevel === 'STRICT') {
      throw new Error(`
🚨 데이터 보호 안전장치 발동! 🚨

테이블: ${tableName}
작업: ${operation}
보호 레벨: ${protectionLevel}

❌ ${tableName} 테이블은 사용자 데이터를 포함하고 있어 삭제할 수 없습니다.

안전하게 삭제 가능한 테이블: ${SAFE_TO_DELETE_TABLES.join(', ')}

개발자 참고사항:
- 카드 카탈로그 업데이트만 필요한 경우 'cards' 테이블만 삭제하세요
- 사용자 데이터는 절대 삭제하지 마세요
- 테스트가 필요한 경우 별도의 개발 데이터베이스를 사용하세요

이 에러가 발생한 이유:
1. 실수로 사용자 데이터 테이블에 접근하려 했거나
2. 잘못된 삭제 쿼리를 실행하려 했습니다

해결 방법:
1. 코드를 검토하여 올바른 테이블을 대상으로 하는지 확인
2. data-protection.js의 SAFE_TO_DELETE_TABLES 목록 참조
3. 정말 필요한 경우 환경 변수 BYPASS_DATA_PROTECTION=true 설정
      `);
    }

    // 데이터가 있는 경우 추가 경고
    if (hasData) {
      console.log(`⚠️  ${tableName} 테이블에 ${dataStatus[tableName]}개의 데이터가 있습니다!`);
    }
  }

  // 안전한 테이블인 경우 허용
  if (isSafeToDelete(tableName)) {
    console.log(`✅ ${tableName} 테이블은 안전하게 삭제 가능합니다`);
    return true;
  }

  console.log(`✅ ${tableName} 테이블 ${operation} 작업이 허용됩니다`);
  return true;
}

/**
 * 긴급 우회 키 확인 (개발/테스트 환경용)
 * @returns {boolean} - 우회 허용 여부
 */
function checkBypassKey() {
  const bypass = process.env.BYPASS_DATA_PROTECTION;
  const env = process.env.NODE_ENV || 'production';

  // 프로덕션에서는 우회 불가
  if (env === 'production') {
    return false;
  }

  return bypass === 'true' || bypass === '1';
}

/**
 * 안전한 카드 데이터 재시드
 * @returns {Promise<void>}
 */
async function safeCardReseed() {
  console.log('🔄 안전한 카드 데이터 재시드 시작...');

  // 사용자 데이터 현황 확인
  const dataStatus = await checkUserDataExists();
  const totalUsers = dataStatus.users || 0;
  const totalCollections = dataStatus.user_inventory || 0;

  console.log(`👥 보호할 사용자 수: ${totalUsers}`);
  console.log(`📦 보호할 수집 데이터: ${totalCollections}`);

  // 우회 키 확인
  const canBypass = checkBypassKey();
  if (canBypass) {
    console.log('⚠️  개발 환경 우회 키 감지됨');
  }

  // cards 테이블만 안전하게 삭제
  await validateTableOperation('cards', 'DELETE');

  const client = await pool.connect();
  try {
    console.log('🗑️  cards 테이블만 안전하게 삭제 중...');
    await client.query('DELETE FROM cards');
    console.log('✅ cards 테이블 삭제 완료 (사용자 데이터는 보존됨)');

    return true;
  } finally {
    client.release();
  }
}

/**
 * 데이터베이스 상태 리포트 생성
 * @returns {Promise<Object>} - 데이터베이스 상태 정보
 */
async function generateDataStatusReport() {
  const dataStatus = await checkUserDataExists();
  const protectionLevel = getProtectionLevel();
  const canBypass = checkBypassKey();

  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    protectionLevel,
    bypassEnabled: canBypass,
    tables: {
      protected: dataStatus,
      safeToDelete: SAFE_TO_DELETE_TABLES
    },
    totalUsers: dataStatus.users || 0,
    totalCollections: dataStatus.user_inventory || 0,
    totalGachaLogs: dataStatus.gacha_logs || 0,
    totalFusionLogs: dataStatus.fusion_logs || 0
  };
}

module.exports = {
  PROTECTED_TABLES,
  SAFE_TO_DELETE_TABLES,
  isProtectedTable,
  isSafeToDelete,
  validateTableOperation,
  checkUserDataExists,
  safeCardReseed,
  generateDataStatusReport,
  getProtectionLevel,
  checkBypassKey
};