// 민킈 카드 가챠게임 - 공지사항 API
const express = require('express');
const router = express.Router();
const { pool } = require('../lib/database');

// 공지사항 목록 조회
router.get('/', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
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

// 공지사항 생성
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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

// 공지사항 삭제 (소프트 삭제 - is_active를 false로 설정)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    
    try {
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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT id, title, content, priority, created_at, created_by
        FROM notices 
        WHERE id = $1 AND is_active = true
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

module.exports = router;