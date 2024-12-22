#!/usr/local/env bare
import Corestore from 'corestore'
import Autopass from 'autopass'
import env from 'bare-env'
import { command, arg, flag, summary, description } from 'paparam'
import process from 'bare-process'
import readline from 'bare-readline'
import { spawn } from 'bare-subprocess'
import tty from 'bare-tty'
import baseEmoji from 'base-emoji'
import crypto from 'hypercore-crypto'
import sodium from 'sodium-universal'
import { Writable } from 'streamx'
import generate from './sgp/generate.mjs'
import hostname from './sgp/hostname'

const homeDir = env.HOME || env.USERPROFILE // USERPROFILE for Windows compatibility

// Define the main 'lockrr' command
const lockrr = command(
  'lockrr',
  summary('lockrr password and secret manager'),
  description('A supergenpass compatible password generator with associated p2p storage.'),
  flag('--profile [profile]', 'isolated profile like "work", "school". Can be used with all modes.'),

  flag('--invite', 'lockrr sharing invite [invite mode]'),
  flag('--accept [invite]', 'accept a lockrr invite [accept mode]'),
  flag('--store', 'put a key/value in the lockrr [store mode]'),
  flag('--options', 'set the supergenpassword options for a url [options mode]'),
  flag('--length [length]', 'Length of the generated password [options mode]'),
  flag('--removeSubdomains', 'remove subdomains from the hostname before generating the password [options mode]'),
  flag('--secret [secret]', 'A secret password to be appended to the master password before generating the password [options mode]'),
  flag('--suffix [suffix]', 'A string added to the end of the generated password. Useful to satisfy password requirements [options mode]'),
  arg('<url>', 'the domain/url to store or retrieve secrets for'),
  arg('<key>', 'when in store mode, a key to store like "email"'),
  arg('<value>', 'when in store mode, the value for the key, like "bob@gmail.com"'),
  async () => {
    if (lockrr.flags.invite) {
      await handleInviteMode(lockrr.flags.profile)
    } else if (lockrr.flags.accept) {
      await handleAcceptMode(lockrr.flags.accept, lockrr.flags.profile)
    } else if (lockrr.flags.options) {
      await handleOptionsMode(lockrr)
    } else if (lockrr.flags.store) {
      await handleStoreMode(lockrr)
    } else {
      await handlePasswordMode(lockrr)
    }
  }
)
lockrr.parse(process.argv.slice(2)) // this starts everything

async function handleInviteMode (profile) {
  const autopass = await getAutopass(profile)
  const inv = await autopass.createInvite()
  await toClipboard(inv)
  console.log('✅ invite copied to clipboard 📝\n')
}

async function handleAcceptMode (invite, profile) {
  if (invite.length !== 106) {
    console.log('⚠️ invalid invite')
    process.exit(1)
  }
  const baseDir = getBaseDir(profile)
  const pair = Autopass.pair(new Corestore(baseDir), invite)
  const autopass = await pair.finished()
  await autopass.ready()
  console.log('✅ invite accepted')
}

async function handleOptionsMode (lockrr) {
  if (!lockrr.args.url) {
    console.log('⚠️ no URL provided')
    process.exit(1)
  }
  const autopass = await getAutopass(lockrr.flags.profile)
  const domain = hostname(lockrr.args.url, {})
  const currentOptions = await autopass.get(`options|${domain}`) || '{}'
  const opts = JSON.parse(currentOptions)
  // set any of the option mode flags
  if (lockrr.flags.length) opts.length = lockrr.flags.length
  if (lockrr.flags.secret) opts.secret = lockrr.flags.secret
  if (lockrr.flags.suffix) opts.suffix = lockrr.flags.suffix

  if (lockrr.flags.removeSubdomains) opts.removeSubdomains = true
  else opts.removeSubdomains = false

  await autopass.add(`options|${domain}`, JSON.stringify(opts))

  await autopass.close()
  process.exit(0)
}

async function handlePasswordMode (lockrr) {
  const autopass = await getAutopass(lockrr.flags.profile)
  const password = await getPassword()
  console.log('')
  emoji(password)
  if (lockrr.args.url) {
    const domain = hostname(lockrr.args.url, {})
    await handleRetrieveMode(autopass, domain, password)
    await autopass.close()
    process.exit(0)
  } else repeatMode(autopass, password)
}

async function repeatMode (autopass, password) {
  console.log('Enter URL: ')
  const url = await new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    rl.on('line', (line) => {
      rl.close()
      resolve(line)
    })
  })
  const domain = hostname(url, {})
  await handleRetrieveMode(autopass, domain, password)
  repeatMode(autopass, password)
}

async function handleStoreMode (lockrr) {
  const autopass = await getAutopass(lockrr.flags.profile)
  const domain = hostname(lockrr.args.url, {})
  const password = await getPassword()
  console.log('')
  emoji(password)

  const { key, value } = lockrr.args
  console.log(`Storing value '${value}' with domain ${domain} and key '${key}'`)
  const encrypted = encryptEntry(password, value)
  await autopass.add(`domain|${domain}|${key}`, encrypted)
  await autopass.close()
  process.exit(0)
}

function handleRetrieveMode (autopass, domain, password) {
  return new Promise((resolve, reject) => {
    const entries = []
    const query = {
      gt: `domain|${domain}|`,
      lt: `domain|${domain}|~`
    }

    // Create the stream
    const readstream = autopass.list(query)

    readstream.on('data', (data) => {
      const [, key] = data.key.split('|')
      try {
        const decrypted = decryptEntry(password, data.value)
        entries.push({ key, value: decrypted })
      } catch (err) {
        entries.push({ key, error: err })
      }
    })

    readstream.on('error', reject)

    readstream.on('end', () => {
      autopass.get(`options|${domain}`).then(currentOptions => {
        if (!currentOptions) currentOptions = '{}'
        const opts = JSON.parse(currentOptions)
        sgp(password, domain, opts)
          .then(hash => toClipboard(hash))
          .then(() => {
            console.log('Domain:', domain)

            if (entries.length) {
              console.log('----------- store -----------')
              entries.forEach(entry => {
                if (entry.error) return console.log(entry.key, ': 🚨 error decrypting!')
                console.log(entry.key, ':', entry.value)
              })
              console.log('-----------------------------')
            }

            console.log('✅ password copied to clipboard 📝\n')
            resolve()
          }).catch(reject)
      })
    })
  })
}

function encryptEntry (password, value) {
  const passwordBuffer = Buffer.from(password)
  const valueBuffer = Buffer.from(value)

  // Derive a key directly from the password
  const key = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)
  sodium.crypto_generichash(key, passwordBuffer) // Using generic hash as a simple key derivation

  // Encrypt the value
  const cipher = Buffer.alloc(valueBuffer.length + sodium.crypto_secretbox_MACBYTES)
  sodium.crypto_secretbox_easy(cipher, valueBuffer, Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES), key)

  return cipher.toString('base64') // Return the ciphertext as a base64 string
}

function decryptEntry (password, ciphertext) {
  const passwordBuffer = Buffer.from(password)
  const cipherBuffer = Buffer.from(ciphertext, 'base64')

  // Derive the key directly from the password
  const key = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)
  sodium.crypto_generichash(key, passwordBuffer)

  // Decrypt the value
  const plainText = Buffer.alloc(cipherBuffer.length - sodium.crypto_secretbox_MACBYTES)
  const success = sodium.crypto_secretbox_open_easy(plainText, cipherBuffer, Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES), key)

  if (!success) {
    throw new Error('Decryption failed. Invalid password or corrupted data.')
  }

  return plainText.toString() // Return the decrypted value as a string
}

async function getAutopass (profile) {
  const baseDir = getBaseDir(profile)
  const autopass = new Autopass(new Corestore(baseDir))
  await autopass.ready()
  return autopass
}

function getBaseDir (profile) {
  if (!profile) profile = 'default'
  const baseDir = `${homeDir}/.lockrr/${profile}/`
  return baseDir
}

function sgp (password, url, opts) {
  return new Promise((resolve, reject) => {
    generate(password, url, opts, (err, result) => {
      if (err) return reject(err)
      resolve(result)
    })
  })
}

function emoji (password) {
  // print out 5 emoji from a md5 hash
  const buf = Buffer.from(password, 'utf8')
  const bits = crypto.hash(buf)
  const parts = []
  for (let i = 0; i < 5; i++) {
    const bit = bits.slice(i, i + 1)
    const pic = baseEmoji.toUnicode(Buffer.from(bit, 'utf8'))
    parts.push(pic)
  }
  console.log('visual: ' + parts.join('  '))
}

function getPassword () {
  return new Promise((resolve) => {
    process.stderr.write('Master password: ')
    // console.log('Enter Password:')
    const stdin = new tty.ReadStream(0)
    stdin.setRawMode(true)
    const mask = (_data, cb) => cb(null, '*')
    const rl = readline.createInterface({
      input: stdin,
      output: new Writable({ write: mask })
    })
    rl.on('data', (line) => {
      stdin.setRawMode(false)
      rl.close()
      resolve(line)
    })
  })
}

function toClipboard (text) {
  return new Promise((resolve, reject) => {
    const proc = spawn(clipboard(), {
      stdio: ['pipe', 'ignore', 'ignore']
    })
    proc.on('error', reject)
    proc.on('exit', () => resolve())
    proc.stdin.write(text)
    proc.stdin.end()
  })
}

function clipboard () {
  switch (process.platform) {
    case 'darwin':
      return 'pbcopy'
    case 'win32':
      return 'clip'
    case 'linux':
      return 'xclip -selection clipboard'
    case 'android':
      return 'termux-clipboard-set'
    default:
      throw new Error(`Unsupported platform: ${process.platform}`)
  }
}
