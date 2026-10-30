const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateHash,
  verifyHash,
  normalizeStatus,
} = require('../services/payments/paynow.service');

const INTEGRATION_KEY = '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977';

test('generateHash matches the Paynow inbound example', () => {
  const data = {
    status: 'Ok',
    browserurl: 'https://staging.paynow.co.zw/Payment/ConfirmPayment/9510',
    pollurl:
      'https://staging.paynow.co.zw/Interface/CheckPayment/?guid=c7ed41da-0159-46da-b428-69549f770413',
    paynowreference: '9510',
  };

  assert.equal(
    generateHash(data, INTEGRATION_KEY),
    '750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D'
  );
});

test('generateHash matches the Paynow outbound example', () => {
  const data = {
    id: '1201',
    reference: 'TEST REF',
    amount: '99.99',
    additionalinfo: 'A test ticket transaction',
    returnurl: 'http://www.google.com/search?q=returnurl',
    resulturl: 'http://www.google.com/search?q=resulturl',
    status: 'Message',
  };

  assert.equal(
    generateHash(data, INTEGRATION_KEY),
    '2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689'
  );
});

test('verifyHash accepts a valid hash and rejects tampering', () => {
  const data = {
    status: 'Ok',
    browserurl: 'https://example.com/return',
    pollurl: 'https://example.com/poll',
    paynowreference: '9510',
  };
  const hash = generateHash(data, INTEGRATION_KEY);

  assert.equal(verifyHash({ ...data, hash }, INTEGRATION_KEY), true);
  assert.equal(verifyHash({ ...data, status: 'Error', hash }, INTEGRATION_KEY), false);
});

test('normalizeStatus maps Paynow statuses to stored statuses', () => {
  assert.equal(normalizeStatus('Paid'), 'paid');
  assert.equal(normalizeStatus('Awaiting Delivery'), 'paid');
  assert.equal(normalizeStatus('Delivered'), 'paid');
  assert.equal(normalizeStatus('Created'), 'pending');
  assert.equal(normalizeStatus('Cancelled'), 'cancelled');
  assert.equal(normalizeStatus('Disputed'), 'disputed');
  assert.equal(normalizeStatus('Refunded'), 'refunded');
  assert.equal(normalizeStatus('Something else'), null);
});
