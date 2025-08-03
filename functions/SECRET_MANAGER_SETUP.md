# 🔐 Google Secret Manager 설정 가이드

## 1. Secret Manager 활성화

```bash
# Secret Manager API 활성화
gcloud services enable secretmanager.googleapis.com

# 프로젝트 확인
gcloud config get-value project
```

## 2. 시크릿 생성

```bash
# 암호화 키 생성 및 저장
echo -n "your-super-secret-encryption-key-here" | gcloud secrets create encryption-key --data-file=-

# Google OAuth 클라이언트 시크릿
echo -n "your-google-client-secret" | gcloud secrets create google-client-secret --data-file=-

# 기타 민감한 정보들
echo -n "your-apple-app-password" | gcloud secrets create apple-app-password --data-file=-
```

## 3. Firebase Functions에 권한 부여

```bash
# Functions 서비스 계정 찾기
gcloud projects get-iam-policy YOUR_PROJECT_ID

# Secret Manager 접근 권한 부여
gcloud secrets add-iam-policy-binding encryption-key \
  --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding google-client-secret \
  --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 4. Functions 코드 업데이트

### functions/secretManager.js
```javascript
const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');

class SecretManager {
  constructor() {
    this.client = new SecretManagerServiceClient();
    this.projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    this.cache = new Map();
  }

  async getSecret(secretName) {
    // Check cache first
    if (this.cache.has(secretName)) {
      return this.cache.get(secretName);
    }

    try {
      const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await this.client.accessSecretVersion({name});
      const payload = version.payload.data.toString('utf8');
      
      // Cache for 1 hour
      this.cache.set(secretName, payload);
      setTimeout(() => this.cache.delete(secretName), 3600000);
      
      return payload;
    } catch (error) {
      console.error(`Failed to access secret ${secretName}:`, error);
      // Fallback to environment variable
      return process.env[secretName.toUpperCase().replace(/-/g, '_')];
    }
  }
}

module.exports = new SecretManager();
```

### functions/index.js 업데이트
```javascript
const secretManager = require('./secretManager');

// 암호화 키 가져오기
async function getEncryptionKey() {
  return await secretManager.getSecret('encryption-key');
}

// Google 클라이언트 시크릿
async function getGoogleClientSecret() {
  return await secretManager.getSecret('google-client-secret');
}

// 사용 예시
exports.appleCalendarConnect = functions.https.onCall(async (data, context) => {
  const encryptionKey = await getEncryptionKey();
  // ... 나머지 코드
});
```

## 5. package.json 업데이트

```json
{
  "dependencies": {
    "@google-cloud/secret-manager": "^5.0.0",
    // ... 기타 dependencies
  }
}
```

## 6. 로컬 개발 환경 설정

### .env.local (개발용)
```bash
# 로컬에서는 환경 변수 사용
ENCRYPTION_KEY=local-development-key
GOOGLE_CLIENT_SECRET=local-dev-secret
```

### 로컬 서비스 계정 설정
```bash
# 서비스 계정 키 생성 (개발용만!)
gcloud iam service-accounts keys create key.json \
  --iam-account=YOUR_PROJECT_ID@appspot.gserviceaccount.com

# 환경 변수 설정
export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"
```

## 7. 배포 전 로컬 테스트

```bash
# 로컬에서 Secret Manager 테스트
cd functions
npm run serve

# 테스트 후 문제가 없으면 배포
```

## 8. 배포 시 환경 변수 제거

```bash
# 기존 환경 변수 제거
firebase functions:config:unset encryption.key
firebase functions:config:unset google.client_secret

# 배포
firebase deploy --only functions
```

## 9. 시크릿 로테이션

```bash
# 새 버전 추가
echo -n "new-encryption-key" | gcloud secrets versions add encryption-key --data-file=-

# 이전 버전 비활성화
gcloud secrets versions disable 1 --secret="encryption-key"
```

## 🎯 장점

1. **중앙 집중식 관리**: 모든 시크릿을 한 곳에서 관리
2. **감사 로깅**: 모든 접근이 기록됨
3. **자동 로테이션**: 버전 관리 및 자동 업데이트
4. **세밀한 권한 제어**: IAM으로 접근 제어
5. **암호화**: Google이 자동으로 암호화/복호화

## ⚠️ 주의사항

1. **비용**: 시크릿 접근마다 소액 과금 (캐싱 필수!)
2. **콜드 스타트**: 첫 접근 시 약간의 지연
3. **서비스 계정**: 올바른 권한 설정 필수

## 📊 비용 최적화

- 시크릿 스토리지: $0.06/월/시크릿
- 접근 요청: $0.03/10,000 요청
- 캐싱으로 비용 최소화 가능

## 🔧 구현 체크리스트

- [x] Secret Manager API 활성화
- [x] 시크릿 생성 (encryption-key, google-client-secret)
- [x] IAM 권한 설정
- [x] secretManager.js 모듈 구현
- [x] encryption.js async 변환
- [x] index.js encrypt/decrypt async 변환
- [ ] 로컬 테스트
- [ ] 프로덕션 배포

---

**결론**: Firebase Functions Config보다 Secret Manager가 훨씬 안전하고 관리하기 쉽습니다!