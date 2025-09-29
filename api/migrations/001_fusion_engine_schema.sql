-- 조합 엔진 v2.0 스키마 마이그레이션
-- 실행일: 2024-01-XX
-- 목적: fusion_logs 테이블 확장 및 엔진 버전 관리

-- 1. fusion_logs 테이블에 새 컬럼 추가
ALTER TABLE fusion_logs 
ADD COLUMN IF NOT EXISTS engine_version VARCHAR(10) DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS policy_version VARCHAR(10) DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS success_rate DECIMAL(5,4) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS success_rate_breakdown JSONB,
ADD COLUMN IF NOT EXISTS recipe_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS inventory_hash_before VARCHAR(64),
ADD COLUMN IF NOT EXISTS inventory_hash_after VARCHAR(64),
ADD COLUMN IF NOT EXISTS candidates JSONB,
ADD COLUMN IF NOT EXISTS selected_outcome JSONB,
ADD COLUMN IF NOT EXISTS hmac_signature VARCHAR(64),
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER DEFAULT 0;

-- 2. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_fusion_logs_engine_version ON fusion_logs(engine_version);
CREATE INDEX IF NOT EXISTS idx_fusion_logs_success_rate ON fusion_logs(success_rate);
CREATE INDEX IF NOT EXISTS idx_fusion_logs_timestamp ON fusion_logs(created_at);

-- 3. fusion_recipes 테이블 생성 (레시피 관리)
CREATE TABLE IF NOT EXISTS fusion_recipes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    recipe_version VARCHAR(10) NOT NULL DEFAULT '1.0.0',
    bonus_rate DECIMAL(5,4) DEFAULT 0.0,
    required_materials JSONB NOT NULL,
    active_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active_through TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. fusion_recipes 인덱스
CREATE INDEX IF NOT EXISTS idx_fusion_recipes_active ON fusion_recipes(active_from, active_through);
CREATE INDEX IF NOT EXISTS idx_fusion_recipes_version ON fusion_recipes(recipe_version);

-- 5. user_pity 테이블 생성 (피티 시스템)
CREATE TABLE IF NOT EXISTS user_pity (
    user_id VARCHAR(50) PRIMARY KEY,
    fusion_pity_count INTEGER DEFAULT 0,
    gacha_pity_count INTEGER DEFAULT 0,
    last_fusion_at TIMESTAMP WITH TIME ZONE,
    last_gacha_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. user_tiers 테이블 생성 (사용자 등급)
CREATE TABLE IF NOT EXISTS user_tiers (
    user_id VARCHAR(50) PRIMARY KEY,
    tier VARCHAR(20) DEFAULT 'bronze',
    experience_points INTEGER DEFAULT 0,
    last_tier_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 기본 레시피 데이터 삽입
INSERT INTO fusion_recipes (id, name, description, recipe_version, bonus_rate, required_materials) VALUES
('basic_3card', '기본 3장 조합', '3장의 카드로 기본 조합', '1.0.0', 0.0, '[]'),
('advanced_5card', '고급 5장 조합', '5장의 카드로 고급 조합', '1.0.0', 0.05, '[]'),
('premium_7card', '프리미엄 7장 조합', '7장의 카드로 프리미엄 조합', '1.0.0', 0.10, '[]')
ON CONFLICT (id) DO NOTHING;

-- 8. 기존 fusion_logs 데이터 마이그레이션 (기본값 설정)
UPDATE fusion_logs 
SET 
    engine_version = '1.0.0',
    policy_version = '1.0.0',
    success_rate = CASE WHEN success THEN 0.6 ELSE 0.4 END,
    success_rate_breakdown = jsonb_build_object(
        'base', 0.6,
        'card_bonus', 0.0,
        'pity_bonus', 0.0,
        'tier_bonus', 0.0,
        'recipe_bonus', 0.0,
        'material_count', jsonb_array_length(materials_used::jsonb),
        'pity_count', 0
    )
WHERE engine_version IS NULL;

-- 9. 뷰 생성 (조합 통계)
CREATE OR REPLACE VIEW fusion_statistics AS
SELECT 
    engine_version,
    policy_version,
    DATE(created_at) as fusion_date,
    COUNT(*) as total_fusions,
    COUNT(*) FILTER (WHERE success = true) as successful_fusions,
    ROUND(AVG(success_rate) * 100, 2) as avg_success_rate,
    ROUND(COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*), 2) as actual_success_rate
FROM fusion_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY engine_version, policy_version, DATE(created_at)
ORDER BY fusion_date DESC;

-- 10. 함수 생성 (인벤토리 해시 계산)
CREATE OR REPLACE FUNCTION calculate_inventory_hash(user_id_param VARCHAR(50))
RETURNS VARCHAR(64) AS $$
DECLARE
    inventory_data TEXT;
    hash_result VARCHAR(64);
BEGIN
    SELECT string_agg(card_id || ':' || count::text, '|' ORDER BY card_id)
    INTO inventory_data
    FROM user_inventory
    WHERE user_id = user_id_param;
    
    SELECT encode(digest(inventory_data, 'sha256'), 'hex')
    INTO hash_result;
    
    RETURN hash_result;
END;
$$ LANGUAGE plpgsql;

-- 11. 트리거 생성 (자동 업데이트)
CREATE OR REPLACE FUNCTION update_fusion_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fusion_logs_updated_at
    BEFORE UPDATE ON fusion_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_fusion_logs_updated_at();

-- 12. 마이그레이션 완료 로그
INSERT INTO fusion_logs (user_id, fusion_id, materials_used, success, engine_version, policy_version, success_rate, success_rate_breakdown)
VALUES ('system', 'migration_001', '["migration"]', true, '2.0.0', '1.0.0', 1.0, '{"migration": "fusion_engine_v2_schema_upgrade"}');
