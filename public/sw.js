// Service Worker - 오프라인 지원 및 캐싱
const CACHE_NAME = 'minqui-gacha-v1.0.0';
const STATIC_CACHE = 'minqui-static-v1.0.0';
const DYNAMIC_CACHE = 'minqui-dynamic-v1.0.0';

// 캐시할 정적 파일들
const STATIC_FILES = [
  '/',
  '/index.html',
  '/script.js',
  '/styles.css',
  '/api-client.js',
  '/manifest.json',
  // 이미지 파일들
  '/illust/000.png',
  '/illust/001.png',
  '/illust/002.png',
  '/illust/003.png',
  '/illust/004.png',
  '/illust/005.png',
  '/illust/010.png',
  '/illust/A.png',
  '/illust/B.png',
  '/illust/S.png',
  '/illust/SS.png',
  '/illust/SSS.png',
  // 사운드 파일들
  '/sounds/card_flip.wav',
  '/sounds/particle.wav',
  '/sounds/holo.wav',
  '/sounds/a_obtain.wav',
  '/sounds/b_obtain.wav',
  '/sounds/s_obtain.wav',
  '/sounds/ss_obtain.wav',
  '/sounds/sss_obtain.wav'
];

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('Service Worker 설치 중...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('정적 파일 캐싱 중...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker 설치 완료');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker 설치 실패:', error);
      })
  );
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('Service Worker 활성화 중...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('오래된 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker 활성화 완료');
        return self.clients.claim();
      })
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // API 요청은 네트워크 우선
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // GET 요청만 캐시에 저장
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 캐시에서 응답
          return caches.match(request);
        })
    );
    return;
  }
  
  // 정적 파일은 캐시 우선
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            // 정적 파일을 동적 캐시에 저장
            if (response.ok && response.status !== 206) {
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            // 오프라인 페이지 반환
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// 백그라운드 동기화
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('백그라운드 동기화 실행');
    event.waitUntil(
      // 오프라인에서 저장된 데이터를 서버에 동기화
      syncOfflineData()
    );
  }
});

// 푸시 알림
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: '게임하기',
          icon: '/icons/icon-96x96.png'
        },
        {
          action: 'close',
          title: '닫기',
          icon: '/icons/close.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 오프라인 데이터 동기화 함수
async function syncOfflineData() {
  try {
    // IndexedDB에서 오프라인 데이터 가져오기
    const offlineData = await getOfflineData();
    
    if (offlineData.length > 0) {
      // 서버에 동기화
      for (const data of offlineData) {
        await syncToServer(data);
      }
      
      // 동기화 완료 후 오프라인 데이터 삭제
      await clearOfflineData();
    }
  } catch (error) {
    console.error('오프라인 데이터 동기화 실패:', error);
  }
}

// IndexedDB에서 오프라인 데이터 가져오기
async function getOfflineData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MinquiGachaOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

// 서버에 동기화
async function syncToServer(data) {
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('동기화 실패');
    }
  } catch (error) {
    console.error('서버 동기화 실패:', error);
    throw error;
  }
}

// 오프라인 데이터 삭제
async function clearOfflineData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MinquiGachaOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
}

console.log('Service Worker 로드됨');
