const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());

// CORS: 배포시에는 정확한 origin으로 제한하세요.
// 예: app.use(cors({ origin: 'https://a71143055.github.io' }));
app.use(cors());

// 정적 파일 제공 (옵션)
app.use('/', express.static(path.join(__dirname, '..', 'docs')));

// 기본 서버 키 (옵션). 운영자가 설정하면 키 입력 없이도 사용 가능
const DEFAULT_CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/complete';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-2.1';

if (!DEFAULT_CLAUDE_API_KEY) {
  console.warn('경고: 서버 기본 CLAUDE_API_KEY가 설정되어 있지 않습니다. 개인 키 입력이 필요할 수 있습니다.');
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/chat', async (req, res) => {
  try {
    const { message, api_key: providedKey } = req.body || {};
    if (!message || !message.trim()) return res.status(400).json({ error: 'message required' });

    // 요청에서 제공된 키 우선 사용, 없으면 서버 기본 키 사용
    const keyToUse = providedKey || DEFAULT_CLAUDE_API_KEY;

    if (!keyToUse) {
      // 운영에서는 401 응답을 권장하나, 사용자 경험을 위해 안내 메시지를 반환
      return res.status(401).json({ error: 'no_api_key', message: 'API 키가 설정되어 있지 않습니다. 개인 키를 입력하거나 운영자에게 문의하세요.' });
    }

    const prompt = `System: 당신은 친절하고 간결한 한국어 답변자입니다.\n\nHuman: ${message}\n\nAssistant:`;

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
        'Authorization': `Bearer ${keyToUse}`,
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error('Upstream API error:', r.status, txt);
      return res.status(502).json({ error: 'upstream_error', details: txt });
    }

    const json = await r.json();
    let reply = '';
    if (json.completion) reply = json.completion;
    else if (Array.isArray(json.choices) && json.choices[0]?.text) reply = json.choices[0].text;
    else reply = JSON.stringify(json);

    return res.json({ reply: reply.trim() });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'server_error', details: String(err) });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server listening on ${port}`));
