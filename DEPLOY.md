# 다른 사람들도 보이게 하는 방법

지금 `file:///.../index.html`로 열면 내 컴퓨터에서만 보입니다.
다른 사람이 보려면 이 폴더를 인터넷 서버에 올리고 `https://...` 주소로 접속해야 합니다.

## 가장 쉬운 흐름

1. GitHub에 새 저장소를 만듭니다.
2. 이 폴더 파일을 저장소에 올립니다.
   - `index.html`
   - `receiver.html`
   - `server.js`
   - `messages.json`
   - `package.json`
3. Render, Railway, Fly.io 같은 Node 서버 호스팅에 연결합니다.
4. 실행 명령은 아래처럼 설정합니다.

```bash
npm start
```

5. 환경변수에 받는 사이트 비밀번호를 설정합니다.

```bash
RECEIVER_PASSWORD=내가쓸비밀번호
```

6. 배포가 끝나면 아래 주소들이 생깁니다.
   - 입력 사이트: `https://내주소/`
   - 받는 사이트: `https://내주소/receiver.html`

받는 사이트는 비밀번호를 입력한 사람만 볼 수 있습니다.
입력 사이트는 공개되어 있고, 사람들이 글자를 보낼 수 있습니다.

## 주의

이 버전은 글자를 서버의 `messages.json` 파일에 저장합니다.
간단한 테스트용으로는 괜찮지만, 진짜 오래 운영하려면 데이터베이스를 붙이는 방식이 더 안정적입니다.

비밀번호를 설정하지 않으면 기본값은 `change-this-password`입니다.
배포할 때는 반드시 `RECEIVER_PASSWORD`를 바꾸세요.
