const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatDeepSeek(messages: ChatMessage[]): Promise<string> {
  const resp = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`DeepSeek API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.choices[0].message.content;
}

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
  // Strip markdown code fences if present
  let json = raw.trim();
  if (json.startsWith('```')) {
    json = json.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error('Expected JSON array from DeepSeek');
  }
  return parsed;
}
