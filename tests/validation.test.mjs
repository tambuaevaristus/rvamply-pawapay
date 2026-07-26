import test from 'node:test'
import assert from 'node:assert/strict'
import validation from '../src/lib/validation.js'

const { normalizeAmount, normalizeCurrency, normalizePhoneNumber, validateCreatePaymentBody } = validation

test('normalizeAmount accepts valid numeric input', () => {
  assert.equal(normalizeAmount('1250.50'), 1250.5)
  assert.equal(normalizeAmount(100), 100)
})

test('normalizeCurrency uppercases and validates length', () => {
  assert.equal(normalizeCurrency('kes'), 'KES')
  assert.throws(() => normalizeCurrency('usd1'))
})

test('normalizePhoneNumber strips non-essential characters', () => {
  assert.equal(normalizePhoneNumber('+254 701 000 111'), '+254701000111')
})

test('validateCreatePaymentBody rejects malformed payloads', () => {
  assert.throws(() => validateCreatePaymentBody({ amount: 0, currency: 'KES', provider: 'MPESA_KEN', phoneNumber: '0712345678' }))
  assert.throws(() => validateCreatePaymentBody({ amount: '10', currency: 'KSHX', provider: 'MPESA_KEN', phoneNumber: '0712345678' }))
})
