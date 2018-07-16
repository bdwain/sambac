import magic from './example.js';

describe('magic', function(){
  it('doubles even numbers', function(){
    expect(magic(10)).toBe(20);
  });

  it('squares odd numbers', function(){
    expect(magic(9)).toBe(81);
  });
});