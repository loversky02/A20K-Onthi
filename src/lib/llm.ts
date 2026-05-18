// ─── Multi-provider LLM client ───
// Randomly selects from configured providers (DeepSeek, MiniMax, MiMo)
// Supports OpenAI-compatible and Anthropic-compatible protocols

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type Protocol = 'openai' | 'anthropic';

interface LLMProvider {
  name: string;
  protocol: Protocol;
  apiKey: string;
  baseUrl: string;
  model: string;
}

function getAvailableProviders(): LLMProvider[] {
  const providers: LLMProvider[] = [];

  if (process.env.DEEPSEEK_API_KEY) {
    providers.push({
      name: 'deepseek',
      protocol: 'openai',
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: 'deepseek-chat',
    });
  }

  if (process.env.MINIMAX_API_KEY) {
    providers.push({
      name: 'minimax',
      protocol: 'openai',
      apiKey: process.env.MINIMAX_API_KEY,
      baseUrl: process.env.MINIMAX_API_HOST || 'https://api.minimax.io',
      model: 'MiniMax-M2.7',
    });
  }

  if (process.env.MIMO_API_KEY) {
    providers.push({
      name: 'mimo',
      protocol: 'anthropic',
      apiKey: process.env.MIMO_API_KEY,
      baseUrl: process.env.MIMO_API_HOST || 'https://api.xiaomimimo.com',
      model: process.env.MIMO_MODEL || 'mimo-v2.5-pro',
    });
  }

  return providers;
}

async function callOpenAI(provider: LLMProvider, messages: ChatMessage[]): Promise<string> {
  const resp = await fetch(`${provider.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`${provider.name} API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.choices[0].message.content;
}

async function callAnthropic(provider: LLMProvider, messages: ChatMessage[]): Promise<string> {
  // Anthropic protocol — system prompt must be extracted to top-level
  let system: string | undefined;
  const anthropicMessages: Array<{ role: string; content: string }> = [];

  for (const m of messages) {
    if (m.role === 'system') {
      system = m.content;
    } else {
      anthropicMessages.push({ role: m.role, content: m.content });
    }
  }

  const body: Record<string, unknown> = {
    model: provider.model,
    messages: anthropicMessages,
    max_tokens: 4096,
    thinking: { type: 'disabled' },
  };
  if (system) body.system = system;

  const resp = await fetch(`${provider.baseUrl}/anthropic/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`${provider.name} API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
  return textBlock?.text || '';
}

export async function chatLLM(messages: ChatMessage[]): Promise<{ content: string; provider: string }> {
  const providers = getAvailableProviders();
  if (providers.length === 0) {
    throw new Error('No LLM API keys configured');
  }

  const provider = providers[Math.floor(Math.random() * providers.length)];

  const content = provider.protocol === 'anthropic'
    ? await callAnthropic(provider, messages)
    : await callOpenAI(provider, messages);

  return { content, provider: provider.name };
}

// ─── Prompt generation (shared across providers) ───

export function generatePrompt(topic: string, count: number, types: string[]): ChatMessage[] {
  const systemPrompt = `Bạn là chuyên gia tạo câu hỏi thi về AI. Hãy tạo câu hỏi chất lượng cao bằng tiếng Việt.

Output PHẢI là JSON array. Mỗi phần tử có cấu trúc:
{
  "type": "single" | "multi" | "short" | "scenario" | "case_study",
  "topic": "${topic}",
  "content": {
    // Tùy theo type:
    // single: { "stem": "...", "options": ["A.", "B.", "C.", "D."] }
    // multi:  { "stem": "...", "options": ["A.", "B.", "C.", "D.", "E."] }
    // short:  { "stem": "..." }
    // scenario: { "scenario": "...", "stem": "...", "options": [...] }  (options optional)
    // case_study: { "context": "...", "stem": "..." }  (options optional)
  },
  "answer": {
    // single: { "correct": 0 }  (index của đáp án đúng)
    // multi:  { "correct": [0, 2] }  (array indexes)
    // short: { "keywords": ["kw1", "kw2"], "modelAnswer": "..." }
    // scenario: { "correct": 0, "modelAnswer": "..." }  (correct optional nếu có options)
    // case_study: { "keywords": ["..."], "modelAnswer": "..." }
  },
  "explanation": "Giải thích chi tiết bằng tiếng Việt",
  "points": 2-4
}

Yêu cầu:
- Câu hỏi phải chuyên sâu, không hỏi định nghĩa cơ bản
- Câu scenario/case_study phải có tình huống thực tế, không giả định
- Multi-select phải có ít nhất 5 lựa chọn, 2-4 đáp án đúng
- Nội dung phải chính xác về mặt kỹ thuật
- Giải thích phải rõ ràng, có tính giáo dục`;

  const userPrompt = `Hãy tạo ${count} câu hỏi trắc nghiệm và tự luận về chủ đề "${topic}".

Loại câu hỏi cần tạo: ${types.join(', ')}.

Phân bổ: ưu tiên scenario và case_study cho câu nhiều điểm (3-4 điểm), single/multi cho câu 2 điểm.

Chỉ trả về JSON array, không thêm bất kỳ text nào khác.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

export function parseQuestionsResponse(raw: string): Array<{
  type: string;
  topic: string;
  content: Record<string, unknown>;
  answer: Record<string, unknown>;
  explanation: string;
  points: number;
}> {
  let json = raw.trim();
  if (json.startsWith('```')) {
    json = json.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error('Expected JSON array from LLM');
  }
  return parsed;
}
