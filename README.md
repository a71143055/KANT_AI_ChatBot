# KANT Claude Chatbot

이 저장소의 add-claude-chatbot 브랜치에 프론트엔드(GitHub Pages) 및 백엔드(Express 프록시)를 추가합니다.

주요 구성
- docs/ 또는 root index.html: GitHub Pages에서 제공할 프론트엔드 채팅 UI
- backend/: Express 서버 (요청의 api_key 우선 사용, 저장하지 않음)
- Procfile: Render/Heroku 배포용

중요: API 키 보안
- 절대 CLAUDE_API_KEY를 코드에 커밋하지 마세요.
- 배포 시에는 Render/Railway/Heroku의 환경변수(Secrets)에 CLAUDE_API_KEY를 설정하세요.
- 채팅에 이미 노출된 키는 즉시 폐기(rotate)하세요.

로컬 테스트
1) 프론트엔드 테스트
   - 브라우저에서 index.html 열기 (백엔드가 로컬에 없으면 실제 API 호출 불가)

2) 백엔드 로컬
   - cd backend
   - npm install
   - export CLAUDE_API_KEY="(실제 키)"  # Windows: set CLAUDE_API_KEY=...
   - node server.js
   - POST http://localhost:5000/api/chat 로 테스트

GitHub Pages 배포 (프론트엔드)
1) main 브랜치에 merge 한 뒤:
   - Settings → Pages → Source: main branch / (root) 선택
   - Pages URL이 발급됩니다

백엔드 배포 (Render 예시)
1) Render에서 New → Web Service → GitHub repo 연동
2) Build Command: npm install --prefix backend
   Start Command: node backend/server.js
3) Environment → CLAUDE_API_KEY 추가
4) 배포된 백엔드 URL을 얻은 후, index.html의 BACKEND_URL을 그 URL로 변경하거나 CNAME/리버스 프록시를 사용

