# 계정 서버 올리는 순서

```
1  scp server/{auth.mjs,account.mjs} root@165.227.196.68:/var/www/patient-zero/server/
2  .env 를 .env.example 대로 채워 같은 폴더에 둔다 (저장소에는 올리지 않는다)
3  install -m644 deploy/patient-zero-account.service /etc/systemd/system/
   systemctl daemon-reload && systemctl enable --now patient-zero-account
4  curl -s localhost:4190/api/config   ← 무엇이 켜졌는지 그대로 나온다
5  Caddyfile 에 deploy/Caddyfile.snippet 을 넣고 `caddy validate` → reload   ← 허락 뒤에
6  게임 쪽에 주소를 알려 준다: window.PZ_API = 'https://home.165-227-196-68.sslip.io/patient-zero'
```

키가 비어 있으면 그 수단은 꺼진 채로 뜬다. 조용히 열어 두는 것보다 꺼진 편이 낫다 —
아무 aud 나 받아 주면 남의 앱 토큰으로 우리 계정에 들어올 수 있다.
