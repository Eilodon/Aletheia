import { describe, it, expect } from 'vitest';
import {
  isSafeLocalOutput,
  finalizeLocalInterpretation,
  splitIntoSentences,
} from '../lib/services/local-inference-postprocess';

describe('isSafeLocalOutput', () => {
  it('returns false for empty string (FM1 guard)', () => {
    expect(isSafeLocalOutput('')).toBe(false);
    expect(isSafeLocalOutput('   ')).toBe(false);
  });

  it('returns false for Vietnamese suicide pattern', () => {
    expect(isSafeLocalOutput('tôi muốn tự tử')).toBe(false);
    expect(isSafeLocalOutput('Tự   tử là lối thoát')).toBe(false);
  });

  it('returns false for English harm patterns', () => {
    expect(isSafeLocalOutput('you should kill yourself')).toBe(false);
    expect(isSafeLocalOutput('there is no way out')).toBe(false);
    expect(isSafeLocalOutput('self-harm is a response')).toBe(false);
  });

  it('returns false for chết thôi', () => {
    expect(isSafeLocalOutput('chết thôi, không còn gì nữa')).toBe(false);
  });

  it('returns false for không có lối thoát', () => {
    expect(isSafeLocalOutput('tôi cảm thấy không có lối thoát')).toBe(false);
  });

  it('returns true for safe reflective content', () => {
    expect(isSafeLocalOutput('Điều này đang mời bạn dừng lại và nhìn rõ hơn.')).toBe(true);
    expect(isSafeLocalOutput('What does this symbol mean to you?')).toBe(true);
    expect(isSafeLocalOutput('Hãy ngồi với khoảnh khắc này.')).toBe(true);
  });
});

describe('finalizeLocalInterpretation', () => {
  it('adds closing question when missing', () => {
    const result = finalizeLocalInterpretation('Một suy nghĩ đơn giản.');
    expect(result).toMatch(/\*[^*]+\?[^*]*\*$/);
  });

  it('preserves existing closing question — does not add second', () => {
    const input = 'Suy nghĩ.\n\n*Điều gì đang cần được nhìn rõ?*';
    const result = finalizeLocalInterpretation(input);
    const questionCount = (result.match(/\*[^*]+\?[^*]*\*/g) ?? []).length;
    expect(questionCount).toBe(1);
  });

  it('normalizes [question] bracket format to *question*', () => {
    const input = 'Body text.\n\n[Điều gì quan trọng?]';
    const result = finalizeLocalInterpretation(input);
    expect(result).toContain('*Điều gì quan trọng?*');
    expect(result).not.toContain('[Điều gì');
  });

  it('removes [Câu hỏi] tag', () => {
    const input = 'Body.\n\n[Câu hỏi]\n\n*Điều gì?*';
    const result = finalizeLocalInterpretation(input);
    expect(result).not.toContain('[Câu hỏi]');
  });

  it('uses English fallback question for en language', () => {
    const result = finalizeLocalInterpretation('Body.', 'en');
    expect(result).toContain('most true');
  });
});

describe('splitIntoSentences', () => {
  it('splits on sentence-ending punctuation', () => {
    const text = 'Câu đầu tiên. Câu thứ hai! Câu thứ ba?';
    const sentences = splitIntoSentences(text);
    expect(sentences).toHaveLength(3);
    expect(sentences[0]).toBe('Câu đầu tiên.');
    expect(sentences[1]).toBe('Câu thứ hai!');
  });

  it('handles single sentence', () => {
    expect(splitIntoSentences('Một câu.')).toEqual(['Một câu.']);
  });

  it('returns empty array for empty string', () => {
    expect(splitIntoSentences('')).toEqual([]);
  });

  it('filters whitespace-only entries', () => {
    const result = splitIntoSentences('Câu một.  Câu hai.');
    expect(result.every(s => s.trim().length > 0)).toBe(true);
  });
});
