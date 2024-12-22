lockrr (🔒𝕣𝕣)
=============

**lockrr**, pronounced lock-er, is a cli personal password(less) manager.

Why is is password(less)? Because not storing a password is the safest security possible.
How? You keep one strong master password in your head, and for each url/domain, lockrr generates a unique password to use.
But what does this tool store? Things adjacent to your password, like usernames, hints, etc.
If you want you can actually store an encrypted site password, but most times you wont need to.

Setup
-----

Currently the [bare](https://docs.pears.com/bare-reference/overview) runtime is used and needs to be installed.
To install lockrr, do the following

    npm i bare-runtime -g
    git clone https://github.com/ryanramage/lockrr
    cd lockrr

Running
-------

```
    bare index.mjs
```
This will start interactive mode. You'll be 

  - prompted to enter your Master password (the one and only one you'll remember)
  - shown some emoji that will only be the same if you enter the same password. Helps you if you messed up the password see something is wrong.
  - be asked to enter a url/domain to work with
  - shown your adjacent information about that domain, like notes, username, you can make your own list.
  - shown any options that you've set for the password on that domain
  - given your password as it will be copied to the clipboard
  - you can keep entering urls all day. leave it open.

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
username : ryanr@redmantech.com
-----------------------------

{ length: 15, suffix: '_121' }
✅ password copied to clipboard 📝
```

To store adjacent information to your password, use the store mode as follows:

```
❯ bare index.mjs test.com --store username ryanr
Master password:
visual: 💢  🎁  🚀  💀  👼

Storing value 'ryanr' with domain test.com and key 'username'
```

If you want to store an explicit password for a url/domain you can like so:

```
🐟 bare index.mjs test.com --store password
Master password:
visual: 💢  🎁  🚀  💀  👼

Enter password: 
Storing value '******' with domain test.com and key 'password'
```
Notice that the console never reveals passwords 

and it will give it back, and copy to the clipboard like this:

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

Dealing with Password constraints
---------------------------------

Sometimes sites force you to change your password, or also can have weird rules. As such you can set options for a domain/url.
The most important ones are lenth and suffix. You can get more generated characters wth length. suffix lets you add a counter like '_2' or
special characters like '&)hU4'. To set the options for a site, use

```
🐟 bare index.mjs test.com --options --suffix "32&4" --length 15
✅ options set
{ length: 15, suffix: '32&4' }
```

Device Replication
------------------

Nothing is ever stored on a server! So how to you sync between devices? Follow this pattern

1. Generate an invite from your host computer

```
bare index.mjs --invite
✅ invite copied to clipboard 📝
```
Leave that computer running. The invite will be on your clipboard. On your other device accept the invite like so:

```
bare index.mjs --accept yry63bx8eohgquiy9bj7andad81hkwk9z6a163z7ytg1iso7e3ajg3sr5xn8om5pmsn1u5r98kzh7rafmozci8yrnbgr1wibbpaiju8bnc
```

Thats it! the two will sync. You probably want to leave at least on running in interactive mode, but otherwise it is magic 🪄

Profiles
--------

Lets say you have a work and a school account that both use google. No problem. Just add the --profile work switch and get a fresh lockrr


```
❯ bare index.mjs google.com --store username ryanr@work.com --profile work
Master password:
visual: 💢  🎁  🚀  💀  👼

Storing value 'ryanr@work.com' with domain google.com and key 'username'
```
Retrival from a profile

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


