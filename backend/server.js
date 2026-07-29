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
  console.warn('경고: 서버 기본 CLAUDE_API_KEY가 설정되어 있지 않습니다. 개인 키 입력이 필요할 수 있습니다. 로컬 룰 기반 모드가 활성화됩니다.');
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

// 간단한 로컬 룰 기반 응답자
function localResponder(message) {
  const m = (message || '').toLowerCase();

  // 인사
  if (m.includes('안녕') || m.includes('안녕하세요') || m.includes('hi') || m.includes('hello')) {
    return '안녕하세요! Mini-Kaggle 기반 챗봇입니다. 데이터셋, 제출 방법, 평가 지표 등에 대해 물어보세요.';
  }

  // 데이터셋 관련 일반 질문
  if (m.includes('데이터셋') || m.includes('dataset') || m.includes('data')) {
    return '이 Mini-Kaggle 과제의 데이터셋은 문제에 따라 텍스트/수치/라벨을 포함합니다. 일반적으로 훈련 데이터, 검증 데이터, 테스트 데이터로 나뉘며 각 샘플은 입력(features)과 정답(label)을 가집니다. 구체적인 파일 구조나 컬럼명이 필요하면 질문해 주세요.';
  }

  // 제출 관련
  if (m.includes('제출') || m.includes('submit') || m.includes('submission')) {
    return '제출은 보통 CSV 형식으로 예측값을 제출하는 방식입니다. 제출 파일은 보통 id와 prediction 컬럼을 포함합니다. 자세한 형식은 과제 설명을 확인하세요.';
  }

  // 평가 지표
  if (m.includes('평가') || m.includes('accuracy') || m.includes('auc') || m.includes('f1') || m.includes('f1-score')) {
    return '평가는 문제 유형에 따라 다릅니다. 분류 문제는 Accuracy, F1-score, AUC 등을 사용하고, 회귀 문제는 RMSE, MAE 등을 사용합니다. 어떤 지표가 필요한지 알려주시면 더 자세히 설명해 드릴게요.';
  }

  // 전처리/모델 관련 간단한 도움
  if (m.includes('전처리') || m.includes('전처리 방법') || m.includes('feature') || m.includes('전처리')) {
    return '전처리는 결측치 처리, 범주형 변수 인코딩, 정규화/표준화, 텍스트의 경우 토큰화/정제 등을 포함합니다. 데이터 특성을 알려주시면 더 구체적인 전처리 방법을 제안합니다.';
  }

  // 기본 응답
  return "로컬 모드: 자세한 답변은 제한적입니다. 더 구체적인 질문(예: '데이터셋 파일 구조 알려줘', '평가 지표는 무엇인가요?')을 해주세요, 또는 운영자가 API 키를 설정하면 더 풍부한 응답을 얻을 수 있습니다.";
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, api_key: providedKey } = req.body || {};
    if (!message || !message.trim()) return res.status(400).json({ error: 'message required' });

    // 요청에서 제공된 키 우선 사용, 없으면 서버 기본 키 사용
    const keyToUse = providedKey || DEFAULT_CLAUDE_API_KEY;

    if (!keyToUse) {
      // API 키가 없을 때: 로컬 룰 기반 응답으로 처리 (외부 호출 필요 없음)
      const reply = localResponder(message);
      return res.json({ reply });
    }

    // 외부 Claude(Anthropic) 호출
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
