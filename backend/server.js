const express = require('express');
const fetch = require('node-fetch'); // node 18+에서는 내장 fetch 사용 가능
const path = require('path');

const app = express();
app.use(express.json());

// 정적 파일 제공 (GitHub Pages와 별도로 서버에서 테스트할 경우)
app.use('/', express.static(path.join(__dirname, '..', 'docs')));

// 환경변수로부터 키/엔드포인트 읽기
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY; // 반드시 배포 환경에서 설정하세요
const CLAUDE_API_URL = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/complete';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-2.1'; // 실제 모델명은 Anthropic 문서 확인

if (!CLAUDE_API_KEY) {
  console.warn('경고: CLAUDE_API_KEY가 설정되어 있지 않습니다. 로컬 테스트 시에는 환경변수로 설정하세요.');
}

// 간단한 health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// 챗 엔드포인트
app.post('/api/chat', async (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: 'message required' });

  // Anthropic 스타일 프롬프트 (Human:/Assistant: 형식 사용)
  const prompt = `System: 당신은 친절하고 간결한 한국어 답변자입니다.\n\nHuman: ${message}\n\nAssistant:`;

  if (!CLAUDE_API_KEY) {
    // 개발 모드: 키가 없으면 단순 룰 기반 응답 제공
    const fallback = message.includes('안녕') ? '안녕하세요! 무엇을 도와드릴까요?' : '로컬 모드: 실제 Claude 키가 설정되어 있지 않습니다.';
    return res.json({ reply: fallback });
  }

  try {
    const body = {
      model: CLAUDE_MODEL,
      prompt,
      max_tokens_to_sample: 800,
      temperature: 0.7,
    };

    const r = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLAUDE_API_KEY}`,
      },
      body: JSON.stringify(body),
      // node-fetch v2는 timeout 옵션 직접 지원하지 않음
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error('Claude API error', r.status, txt);
      return res.status(502).json({ error: 'Upstream error', details: txt });
    }

    const json = await r.json();
    let reply = '';
    if (json.completion) reply = json.completion;
    else if (Array.isArray(json.choices) && json.choices[0]?.text) reply = json.choices[0].text;
    else reply = JSON.stringify(json);

    return res.json({ reply: reply.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error', details: String(err) });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server listening on ${port}`));
