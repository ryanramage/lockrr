# 🔒𝕣𝕣 lockrr

A CLI password(less) manager that puts your security first.

## Why lockrr?

- **Truly Password(less)**: The safest password is one that's never stored
- **Single Master Password**: Keep one strong password in your head
- **Unique Generation**: Creates distinct passwords for each domain
- **Flexible Storage**: Securely store auxiliary information like usernames and notes
- **improves supergenpass** [read about supergenpass](SUPERGENPASS.md) and lockrr improves the security and experience
- **Optional Encryption**: Can encrypt and store actual passwords if needed
- [Lockrr Chrome Extension](https://github.com/ryanramage/lockrr-chrome-extension) for better UX in a desktop browser

This generator is equivalent to https://chriszarate.github.io/supergenpass which is important. 
If you dont have access to this generator, you can always use that bookmark in a pinch.


## Quick Start

### Prerequisites
- Install the [bare runtime](https://docs.pears.com/bare-reference/overview)

### Installation
```bash
npm i bare-runtime -g
git clone https://github.com/ryanramage/lockrr
cd lockrr
npm i
```

## Usage Guide

### Interactive Mode

Start the interactive mode with:
```
bare index.mjs --http
```

#### What to Expect:
1. Enter your master password
2. View emoji verification (unique to your password)
3. Enter domain/URL
4. View stored information
5. Get generated password (auto-copied to clipboard)
6. the optional --http flag allows the chrome plugin to communicate locally with lockrr

Example session:
```
❯ bare index.mjs
Master password:
visual: 💢  🎁  🚀  💀  👼

Enter URL:
google.com
> google.com
Domain: google.com
----------- store -----------
note : you probably wanted google.ca
username : ryanr@personal-email.com
-----------------------------

{ length: 15, suffix: '_121' }
✅ password copied to clipboard 📝
```

### Storing Information

#### Store Username
```
❯ bare index.mjs test.com --store username ryanr
Master password:
visual: 💢  🎁  🚀  💀  👼

Storing value 'ryanr' with domain test.com and key 'username'
```

#### Store Password (Optional)
```
🐟 bare index.mjs test.com --store password
Master password:
visual: 💢  🎁  🚀  💀  👼

Enter password: 
Storing value '******' with domain test.com and key 'password'
```

#### Retrieve Information
```
🐟 bare index.mjs test.com
Master password:
visual: 💢  🎁  🚀  💀  👼

Domain: test.com
----------- store -----------
password : ******
username : ryanr
-----------------------------
✅ password copied to clipboard 📝
```

## Advanced Features

### Password Constraints
Customize generated passwords for sites with specific requirements:

```
🐟 bare index.mjs test.com --options --suffix "32&4" --length 15
✅ options set
{ length: 15, suffix: '32&4' }
```

Key options:
- `length`: Control password length
- `suffix`: Add special characters or counters (e.g., '_2', '&)hU4')

### Device Synchronization
Securely sync between devices without cloud storage:

1. On primary device:
```
bare index.mjs --invite
✅ invite copied to clipboard 📝
```

2. On secondary device:
```
bare index.mjs --accept yry63bx8eohgquiy9bj7andad81hkwk9z6a163z7ytg1iso7e3ajg3sr5xn8om5pmsn1u5r98kzh7rafmozci8yrnbgr1wibbpaiju8bnc
```

The devices will automatically sync while running. ✨

### Profile Management
Manage multiple accounts for the same domain using profiles:

#### Store Profile Information
```
❯ bare index.mjs google.com --store username ryanr@work.com --profile work
Master password:
visual: 💢  🎁  🚀  💀  👼

Storing value 'ryanr@work.com' with domain google.com and key 'username'
```

#### Access Profile
```
🐟 bare index.mjs google.com --profile work
Master password:
visual: 💢  🎁  🚀  💀  👼

Domain: google.com
----------- store -----------
username : ryanr@work.com
-----------------------------
✅ password copied to clipboard 📝
```


