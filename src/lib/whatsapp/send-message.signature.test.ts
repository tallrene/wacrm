import { describe, it, expect } from 'vitest';
import { signText, signFooter } from './send-message';

describe('sender signature', () => {
  it('appends an em-dash signature to plain text', () => {
    expect(signText('Hello', 'Mira (AI)')).toBe('Hello\n\n\u2014 Mira (AI)');
  });
  it('does not double-sign', () => {
    const once = signText('Hello', 'René G');
    expect(signText(once, 'René G')).toBe(once);
  });
  it('leaves text alone without a sender', () => {
    expect(signText('Hello', null)).toBe('Hello');
  });
  it('uses the name as footer when none was given', () => {
    expect(signFooter(undefined, 'Mira (AI)', 'House of 3D')).toBe('Mira (AI)');
  });
  it('replaces a generic account-name footer, keeps a custom one', () => {
    expect(signFooter('house of 3d', 'Mira (AI)', 'House of 3D')).toBe('Mira (AI)');
    expect(signFooter('Reply within 24h', 'Mira (AI)', 'House of 3D')).toBe('Reply within 24h');
  });
  it('keeps the given footer when there is no sender', () => {
    expect(signFooter('House of 3D', null, 'House of 3D')).toBe('House of 3D');
    expect(signFooter('', null, null)).toBeUndefined();
  });
});
