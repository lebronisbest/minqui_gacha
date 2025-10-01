// 민킈 카드 가챠게임 - 공지사항 Vercel Function
const express = require('express');
const cors = require('cors');
const { pool } = require('./lib/database');

const app = express();

// CORS 설정
app.use(cors());
app.use(express.json());

// 데이터베이스 연결 테스트 및 테이블 생성 엔드포인트
app.get('/test', async (req, res) => {
  let client;
  try {
    console.log('Testing database connection...');
    console.log('Pool exists:', !!pool);
    console.log('POSTGRES_URL exists:', !!process.env.POSTGRES_URL);
    
    if (!pool) {
      return res.status(500).json({
        success: false,
        message: 'Database pool not initialized',
        details: {
          poolExists: false,
          postgresUrlExists: !!process.env.POSTGRES_URL
        }
      });
    }

    client = await pool.connect();
    
    // notices 테이블이 존재하는지 확인
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
    
    const result = await client.query('SELECT NOW() as current_time');
    client.release();

    res.json({
      success: true,
      message: 'Database connection successful',
      data: {
        currentTime: result.rows[0].current_time,
        poolExists: true,
        postgresUrlExists: !!process.env.POSTGRES_URL,
        noticesTableExists: tableExists,
        tableCreated: !tableExists
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    if (client) {
      client.release();
    }
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      details: {
        poolExists: !!pool,
        postgresUrlExists: !!process.env.POSTGRES_URL
      }
    });
  }
});

// 공지사항 목록 조회
app.get('/', async (req, res) => {
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
    
    // 활성화된 공지사항만 조회
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

    res.json({
      success: true,
      data: {
        notices: result.rows
      }
    });
  } catch (error) {
    console.error('공지사항 조회 오류:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: '공지사항을 불러올 수 없습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// 공지사항 생성
app.post('/', async (req, res) => {
  try {
    const { title, content, priority = 'normal' } = req.body;

    // 입력 검증
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: '제목과 내용은 필수입니다.'
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

    const client = await pool.connect();
    
    try {
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

      res.json({
        success: true,
        data: {
          notice: newNotice
        },
        message: '공지사항이 생성되었습니다.'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('공지사항 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '공지사항 생성에 실패했습니다.'
    });
  }
});

// 공지사항 수정
app.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, priority } = req.body;

    const client = await pool.connect();
    
    try {
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

      res.json({
        success: true,
        data: {
          notice: result.rows[0]
        },
        message: '공지사항이 수정되었습니다.'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('공지사항 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '공지사항 수정에 실패했습니다.'
    });
  }
});

// 공지사항 삭제
app.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    
    try {
      // 공지사항 존재 확인 및 삭제
      const result = await client.query('DELETE FROM notices WHERE id = $1 RETURNING id', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '공지사항을 찾을 수 없습니다.'
        });
      }

      res.json({
        success: true,
        message: '공지사항이 삭제되었습니다.'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('공지사항 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '공지사항 삭제에 실패했습니다.'
    });
  }
});

// 특정 공지사항 조회
app.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT id, title, content, priority, created_at, created_by
        FROM notices 
        WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '공지사항을 찾을 수 없습니다.'
        });
      }

      res.json({
        success: true,
        data: {
          notice: result.rows[0]
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('공지사항 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '공지사항을 불러올 수 없습니다.'
    });
  }
});

module.exports = app;
