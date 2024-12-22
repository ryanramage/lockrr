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
  flag('--invite', 'lockrr sharing invite'),
  flag('--accept [invite]', 'accept a lockrr invite'),
  flag('--store', 'enable store mode, to put a key/value in the lockrr'),
  flag('--profile [profile]', 'isolated profile like "work", "school"'),
  arg('<url>', 'the domain/url to store or retrieve secrets for'),
  arg('<key>', 'when in store mode, a key to store like "email"'),
  arg('<value>', 'when in store mode, the value for the key, like "bob@gmail.com"'),
  async () => {
    if (lockrr.flags.invite) {
      await handleInviteMode(lockrr.flags.profile)
    } else if (lockrr.flags.accept) {
      await handleAcceptMode(lockrr.flags.accept, lockrr.flags.profile)
    } else {
      await handlePasswordMode(lockrr)
    }
  }
)

async function handleInviteMode(profile) {
  const autopass = await getAutopass(profile)
  const inv = await autopass.createInvite()
  await toClipboard(inv)
  console.log('✅ invite copied to clipboard 📝\n')
}

async function handleAcceptMode(invite, profile) {
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

async function handlePasswordMode(lockrr) {
  if (!lockrr.args.url) {
    console.log('url is required')
    console.log('add -h for help')
    process.exit(1)
  }

  const autopass = await getAutopass(lockrr.flags.profile)
  const domain = hostname(lockrr.args.url, {})
  const password = await getPassword()
  console.log('')
  emoji(password)

  if (lockrr.flags.store) {
    await handleStoreMode(autopass, domain, password, lockrr.args)
    return
  }

  await handleRetrieveMode(autopass, domain, password)
}

async function handleStoreMode(autopass, domain, password, args) {
  const { key, value } = args
  console.log(`Storing value '${value}' with domain ${domain} and key '${key}'`)
  const encrypted = encryptEntry(password, value)
  await autopass.add(`${domain}|${key}`, encrypted)
  await autopass.close()
  process.exit(0)
}

async function handleRetrieveMode(autopass, domain, password) {
  const entries = []
  const query = {
    gt: `${domain}|`,
    lt: `${domain}|~`
  }
  
  const readstream = await autopass.list(query)
  readstream.on('data', (data) => {
    const [, key] = data.key.split('|')
    try {
      const decrypted = decryptEntry(password, data.value)
      const entry = { key, value: decrypted }
      entries.push(entry)
    } catch (err) {
      const entry = { key, error: err }
      entries.push(entry)
    }
  })

  readstream.on('end', async () => {
    await run(password, domain)
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
    await autopass.close()
    process.exit()
  })
)

lockrr.parse(process.argv.slice(2))

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

async function run (password, domain) {
  const hash = await sgp(password, domain, { })
  await toClipboard(hash)
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
  }
}
