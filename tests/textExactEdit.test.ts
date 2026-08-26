import { describe, expect, it } from 'vitest';
import { removeAllExact, replaceAllExact } from '../src/lib/textExactEdit';

const source = 'The NEW system update (version 4.5.1) was successfully installed today! Please DO NOT turn off the device while the NEW system is configuring files. If you see ERROR [1001], contact support.';

describe('exact whole-text editing', () => {
  it('replaces every exact occurrence without changing other text', () => {
    expect(replaceAllExact(source, 'NEW', 'OLD')).toBe(
      'The OLD system update (version 4.5.1) was successfully installed today! Please DO NOT turn off the device while the OLD system is configuring files. If you see ERROR [1001], contact support.',
    );
  });

  it('removes exact phrases together with their spaces', () => {
    expect(removeAllExact(source, ['(version 4.5.1) '])).toBe(
      'The NEW system update was successfully installed today! Please DO NOT turn off the device while the NEW system is configuring files. If you see ERROR [1001], contact support.',
    );
    expect(removeAllExact(source, ['ERROR '])).toBe(
      'The NEW system update (version 4.5.1) was successfully installed today! Please DO NOT turn off the device while the NEW system is configuring files. If you see [1001], contact support.',
    );
  });

  it('removes several literal fragments in one pass', () => {
    expect(removeAllExact(source, ['successfully ', '!'])).toBe(
      'The NEW system update (version 4.5.1) was installed today Please DO NOT turn off the device while the NEW system is configuring files. If you see ERROR [1001], contact support.',
    );
  });

  it('supports long phrases, case-sensitive matches, and literal replacement characters', () => {
    expect(replaceAllExact(source, 'DO NOT turn off', 'safely disconnect')).toBe(
      'The NEW system update (version 4.5.1) was successfully installed today! Please safely disconnect the device while the NEW system is configuring files. If you see ERROR [1001], contact support.',
    );
    expect(replaceAllExact('NEW new NEW', 'NEW', '$&')).toBe('$& new $&');
  });

  it('treats regular-expression characters as ordinary text', () => {
    expect(removeAllExact('Keep [1001] and (4.5.1), remove [1001].', ['[1001]', '(4.5.1)'])).toBe(
      'Keep  and , remove .',
    );
  });
});
