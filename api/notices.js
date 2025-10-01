// 공지사항 API
const { pool } = require('./lib/database');

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Id, X-Session-Id, X-Request-Id');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 요청 본문 파싱 (Vercel Functions에서는 자동 파싱이 안됨)
  let requestBody = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      requestBody = JSON.parse(req.body || '{}');
    } catch (error) {
      console.error('JSON parsing error:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON in request body'
      });
    }
  }

  // 요청 로깅
  console.log('Notices API called:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    parsedBody: requestBody
  });

  let client;
  try {
    // 데이터베이스 연결 확인
    if (!pool) {
      console.error('Database pool not initialized');
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    client = await pool.connect();
    
    // notices 테이블이 존재하는지 확인하고 없으면 생성
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notices'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('Creating notices table...');
      // notices 테이블 생성
      await client.query(`
        CREATE TABLE IF NOT EXISTS notices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(255) DEFAULT 'admin'
        )
      `);
      
      // 인덱스 생성
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_notices_priority ON notices(priority);
        CREATE INDEX IF NOT EXISTS idx_notices_created_at ON notices(created_at);
        CREATE INDEX IF NOT EXISTS idx_notices_is_active ON notices(is_active);
      `);
      
      console.log('Notices table created successfully');
    }

    // GET: 공지사항 목록 조회
    if (req.method === 'GET') {
      const result = await client.query(`
        SELECT id, title, content, priority, created_at, created_by
        FROM notices 
        WHERE is_active = true
        ORDER BY 
          CASE priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'normal' THEN 3 
          END,
          created_at DESC
      `);

      return res.json({
        success: true,
        data: {
          notices: result.rows
        }
      });
    }

    // POST: 공지사항 생성
    if (req.method === 'POST') {
      console.log('POST request received, parsed body:', requestBody);
      
      const { title, content, priority = 'normal' } = requestBody;

      console.log('Parsed data:', { title, content, priority });

      // 입력 검증
      if (!title || !content) {
        console.log('Validation failed: missing title or content');
        return res.status(400).json({
          success: false,
          message: '제목과 내용은 필수입니다.',
          received: { title, content, priority }
        });
      }

      // 우선순위 검증
      const validPriorities = ['normal', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: '유효하지 않은 우선순위입니다.'
        });
      }

      // 새 공지사항 생성
      const result = await client.query(`
        INSERT INTO notices (title, content, priority, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, content, priority, created_at, created_by
      `, [
        title.trim(),
        content.trim(),
        priority,
        'admin'
      ]);

      const newNotice = result.rows[0];

      return res.json({
        success: true,
        data: {
          notice: newNotice
        },
        message: '공지사항이 생성되었습니다.'
      });
    }

    // PUT: 공지사항 수정
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { title, content, priority } = requestBody;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '공지사항 ID가 필요합니다.'
        });
      }

      // 공지사항 존재 확인
      const checkResult = await client.query('SELECT id FROM notices WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '공지사항을 찾을 수 없습니다.'
        });
      }

      // 우선순위 검증
      if (priority) {
        const validPriorities = ['normal', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
          return res.status(400).json({
            success: false,
            message: '유효하지 않은 우선순위입니다.'
          });
        }
      }

      // 업데이트할 필드들 구성
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (title) {
        updateFields.push(`title = $${paramCount++}`);
        updateValues.push(title.trim());
      }
      if (content) {
        updateFields.push(`content = $${paramCount++}`);
        updateValues.push(content.trim());
      }
      if (priority) {
        updateFields.push(`priority = $${paramCount++}`);
        updateValues.push(priority);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: '수정할 내용이 없습니다.'
        });
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      // 공지사항 수정
      const result = await client.query(`
        UPDATE notices 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, title, content, priority, created_at, created_by
      `, updateValues);

      return res.json({
        success: true,
        data: {
          notice: result.rows[0]
        },
        message: '공지사항이 수정되었습니다.'
      });
    }

    // DELETE: 공지사항 삭제 (소프트 삭제)
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '공지사항 ID가 필요합니다.'
        });
      }

      // 공지사항 존재 확인 및 비활성화
      const result = await client.query(`
        UPDATE notices 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING id
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '공지사항을 찾을 수 없습니다.'
        });
      }

      return res.json({
        success: true,
        message: '공지사항이 삭제되었습니다.'
      });
    }

    // 지원하지 않는 메서드
    res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('공지사항 API 오류:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};