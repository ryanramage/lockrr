/*!
 * SuperGenPass library
 * https://github.com/chriszarate/supergenpass-lib
 * https://chriszarate.github.com/supergenpass/
 * License: GPLv2
 */

import sodium from 'sodium-universal'

// Replace non-alphanumeric and padding characters in the Base-64 alphabet to
// comply with most password policies.
function customBase64 (str) {
  return str.replace(/\+/g, '9').replace(/\//g, '8').replace(/=/g, 'A')
}

// Compute hexadecimal hash and convert it to Base-64.
function customBase64Hash (str, hashFunction) {
  const input = Buffer.from(str)
  const output = Buffer.alloc(64)
  hashFunction(output, input)
  const _hash = output.toString('base64')
  const result = customBase64(_hash)
  return result
}

const hashFunctions = {
  // md5: str => customBase64Hash(str, md5),
  sha512: str => customBase64Hash(str, sodium.crypto_hash_sha512)
}

// Return a hash function for SGP to use.
function hash (method) {
  // Is user supplies a function, use it and assume they will take of any
  // encoding (Base-64 or otherwise).
  if (typeof method === 'function') {
    return method
  }

  if (hashFunctions[method]) {
    return hashFunctions[method]
  }

  throw new Error(`Could not resolve hash function, received ${typeof method}.`)
}

export default hash
