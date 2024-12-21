import readline from 'bare-readline'
import tty from 'bare-tty'
import { Writable } from 'stream'

const stdio_in = tty.WriteStream(0)

// Save current stdin settings
const { isRaw } = stdio_in
stdio_in.setRawMode(true)

const mask = (data, cb) => {
  cb(null)
}

const rl = readline.createInterface({
  input: stdio_in,
  output: new Writable({ write: mask })
})

console.log('Enter Password:')

rl.question('', (password) => {
  // Restore stdin settings
  stdio_in.setRawMode(isRaw)
  
  // Close the readline interface
  rl.close()
  
  // Output the password
  console.log('\nPassword received:', password)
  
  // Exit the program
  process.exit(0)
})
