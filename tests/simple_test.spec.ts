import { test } from '@japa/runner'

test.group('Simple test', () => {
  test('should pass', ({ assert }) => {
    assert.equal(1 + 1, 2)
  })
})
