// 로컬에서 API 테스트
const fetch = require('node-fetch').default;

async function testLocalAPI() {
  console.log('로컬 API 테스트 시작...');
  
  try {
    // 1. 초기화 테스트
    console.log('\n1. 초기화 API 테스트...');
    const initResponse = await fetch('http://localhost:3000/api/init');
    const initData = await initResponse.json();
    console.log('초기화 결과:', initData);
    
    if (initData.success) {
      // 2. 시드 테스트
      console.log('\n2. 시드 API 테스트...');
      const seedResponse = await fetch('http://localhost:3000/api/seed', {
        method: 'POST'
      });
      const seedData = await seedResponse.json();
      console.log('시드 결과:', seedData);
      
      if (seedData.success) {
        // 3. 카탈로그 테스트
        console.log('\n3. 카탈로그 API 테스트...');
        const catalogResponse = await fetch('http://localhost:3000/api/catalog');
        const catalogData = await catalogResponse.json();
        console.log('카탈로그 결과:', catalogData);
      }
    }
    
  } catch (error) {
    console.error('테스트 실패:', error.message);
  }
}

testLocalAPI();
