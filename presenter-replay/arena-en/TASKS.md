# TASKS — Security Arena

Each task is done by one agent. **This file is generated** by `node tools/gen.mjs` from `specs/cards.json` and `specs/tasks.json`.

- Participant mode: **100 cards** + utility + 2 pages + integration + review, with up to 8 agents in parallel.
- Presenter mode: the same tasks, with up to 16 agents in parallel.

## Support tasks

| id | wave | what | spec | depends on |
| --- | --- | --- | --- | --- |
| lib-hash | 1 | Cryptography utility lib/hash.js | `specs/lib-hash.md` | — |
| category-page | 2 | Category page | `specs/category-page.md` | all the cards |
| score-table | 2 | Score table | `specs/score-table.md` | all the cards |
| integration | 3 | Integration and full suite | `specs/integration.md` | category-page, score-table |
| review | 4 | Security and quality review | `specs/review.md` | integration |

## Passwords

| id | template | title | concept | depends on |
| --- | --- | --- | --- | --- |
| pw-01 | choice | Which password is strongest? | Length and unpredictability matter more than swapping letters for symbols. | — |
| pw-02 | order | From the strongest second factor to the weakest | Not every second factor protects you equally: the ones that resist phishing come out on top. | — |
| pw-03 | choice | One password, thousands of accounts | Password spraying: trying one common password on many accounts avoids the lockout after failed attempts. | — |
| pw-04 | choice | How do you store 80 passwords? | A password manager creates and stores a unique, strong password for every site. | — |
| pw-05 | answer | The three types of factor | MFA combines factors of different types: something you know, something you have and something you are. | — |
| pw-06 | spot-the-flaw | The password policy has bad rules | Forced changes and password hints make passwords weaker, not stronger. | — |
| pw-07 | order | How credential stuffing works | Credential stuffing: email and password pairs stolen from one site are tried on many others. | — |
| pw-08 | choice | Your email showed up in a breach | When an account shows up in a breach, change the password on that site and everywhere it was reused. | — |
| pw-09 | choice | The security question | The true answers to security questions can often be found on social media. | — |
| pw-10 | answer | Signing in without a password | A passkey replaces the password with a key pair: the private key never leaves your device. | — |

## Phishing

| id | template | title | concept | depends on |
| --- | --- | --- | --- | --- |
| ph-01 | choice | Which is the real site? | Look-alike domains swap a letter or add a hyphen to fool people who read quickly. | — |
| ph-02 | choice | What gives this email away? | Urgency and links to another domain are the most common signs of phishing. | — |
| ph-03 | spot-the-flaw | The disguised attachment | A double extension hides a program behind a name that looks like a document. | — |
| ph-04 | spot-the-flaw | The name proves nothing | The sender name is free text; what counts is the domain after the @. | — |
| ph-05 | choice | The QR code stuck on the parking meter | Quishing: a fake QR code stuck over the real one leads to a fake payment site. | — |
| ph-06 | order | Read the URL in the right order | The domain is what sits between :// and the first slash; it tells you who owns the site. | — |
| ph-07 | answer | The link lies | The text of a link can show one address and take you to another. | — |
| ph-08 | choice | Enable content? | The macros in a document are code; enabling them can install malware. | — |
| ph-09 | spot-the-flaw | Phishing by SMS | Smishing: the same trick as phishing, but by SMS, where the link is harder to see. | — |
| ph-10 | choice | The app wants access to your email | Consent phishing: instead of your password, the attacker asks you to authorize an app to get into your account. | — |

## Web (XSS, SQLi, CSRF)

| id | template | title | concept | depends on |
| --- | --- | --- | --- | --- |
| web-01 | spot-the-flaw | Find the SQL injection | Gluing user text into an SQL query lets the attacker rewrite the query. | — |
| web-02 | spot-the-flaw | Find the XSS | Putting user text into innerHTML lets the browser run code hidden in that text. | — |
| web-03 | choice | The hidden form | CSRF: another site makes your browser send a request with your session, without you knowing. | — |
| web-04 | spot-the-flaw | Other people's invoices | IDOR: the server returns an object by its id alone, without checking that it belongs to whoever is asking. | — |
| web-05 | choice | Where do you go after logging in? | Open redirect: the site redirects to any address that comes in the URL. | — |
| web-06 | answer | Where can scripts come from? | The Content-Security-Policy tells the browser which origins it may load scripts and other resources from. | — |
| web-07 | choice | A well-configured session cookie | A session cookie should have Secure, HttpOnly and SameSite. | — |
| web-08 | order | A session from start to finish | The session id must be new after login and destroyed at logout. | — |
| web-09 | answer | The site inside an iframe | Clickjacking: another site loads yours in an invisible iframe and tricks the user into clicking. | — |
| web-10 | spot-the-flaw | CORS that is too open | Reflecting any origin with credentials lets any site read responses on the user's behalf. | — |

## Networks

| id | template | title | concept | depends on |
| --- | --- | --- | --- | --- |
| rd-01 | choice | Two networks at the coffee shop | Anyone can create a Wi-Fi network named after a coffee shop (evil twin). | — |
| rd-02 | order | Where your traffic goes | Every point between you and the site can see where you are going; HTTPS hides the content, not the destination. | — |
| rd-03 | answer | Always HTTPS | HSTS forces the browser to use HTTPS on a site, even if someone types http://. | — |
| rd-04 | order | What happens when you open an HTTPS site | Before any data is sent encrypted, the browser checks the server's certificate. | — |
| rd-05 | choice | What a VPN does not do | A VPN encrypts the path to the VPN server; it does not stop phishing or malware. | — |
| rd-06 | spot-the-flaw | Too many ports open on the firewall | A web server should only expose the ports it needs to the internet. | — |
| rd-07 | answer | DNS that nobody can read | Traditional DNS travels unencrypted; DoH hides the names you look up. | — |
| rd-08 | choice | Where to connect the cheap cameras | Putting untrusted devices on their own network limits the damage if they are attacked. | — |
| rd-09 | spot-the-flaw | The badly configured router | A home router has several doors: the Wi-Fi itself, the admin page and the devices connected to it. | — |
| rd-10 | choice | Certificate warning | A certificate warning can be a sign that someone is intercepting the connection. | — |

## Privacy

| id | template | title | concept | depends on |
| --- | --- | --- | --- | --- |
| pv-01 | choice | The curious calculator | An app should only have the permissions it needs to work. | — |
| pv-02 | answer | The photo says where you are | A photo's EXIF metadata can store the GPS coordinates of where it was taken. | — |
| pv-03 | choice | The 1-pixel image | A tracking pixel in an email tells the sender when and where you opened it. | — |
| pv-04 | answer | Taking your data with you | The GDPR gives you the right to receive your data in a format another service can read. | — |
| pv-05 | spot-the-flaw | Too much data for a newsletter | Data minimization: collect only the data you need for the stated purpose. | — |
| pv-06 | order | Asking a company for your data | The right of access lets you find out what data a company holds about you. | — |
| pv-07 | choice | No cookies and they still recognize you | A site can recognize you without cookies, through details that do not change when you delete them. | — |
| pv-08 | choice | The boarding pass photo | The barcode on a boarding pass contains your name and booking reference. | — |
| pv-09 | spot-the-flaw | Personal data in the URL | Personal data in a URL ends up in the history and in the logs of every server the request passes through. | — |
| pv-10 | order | Who sees your post? | Each sharing level widens who sees what you post; the most restricted is the most private. | — |

## Social engineering

| id | template | title | concept | depends on |
| --- | --- | --- | --- | --- |
| es-01 | choice | The CEO's urgent request | CEO fraud: someone pretends to be a boss to ask for an urgent, secret transfer. | — |
| es-02 | choice | Do you hold the door? | Tailgating: getting into a secure area by following closely behind someone who has access. | — |
| es-03 | answer | The bank on the phone | Vishing: a voice-call scam where the scammer pretends to be from the bank or tech support. | — |
| es-04 | choice | 15 approval requests | MFA fatigue: the attacker already has the password and sends requests until someone approves one. | — |
| es-05 | spot-the-flaw | The migration story | Pretexting: a believable story is used to ask for something you should never hand over. | — |
| es-06 | order | The stages of a social engineering attack | A social engineering attack starts long before contact: with research on the target. | — |
| es-07 | choice | The USB drive in the parking lot | Baiting: leaving a tempting object, like a USB drive, and waiting for someone to use it. | — |
| es-08 | answer | Tailor-made phishing | Spear phishing: phishing aimed at one person, with real details to look legitimate. | — |
| es-09 | spot-the-flaw | The supplier changed banks | Bank details fraud: an email asks you to pay into a new account and avoids any confirmation. | — |
| es-10 | order | The new number scam | The 'I changed my number' scam uses family trust to ask for money in a hurry. | — |

## Basic cryptography

| id | template | title | concept | depends on |
| --- | --- | --- | --- | --- |
| cr-01 | answer | Decrypt Caesar's message | The Caesar cipher replaces each letter with another one a fixed distance away. With only 25 keys, it breaks in seconds. | lib-hash |
| cr-02 | answer | The Base64 cookie | Base64 is a way of writing bytes as text, not a cipher: anyone can reverse it. | lib-hash |
| cr-03 | answer | Which is the real file? | A SHA-256 hash changes completely if the file changes, so it is used to check downloads. | lib-hash |
| cr-04 | answer | Repeated hashes in the breach | Without a salt, identical passwords give identical hashes and stand out in a breach. | lib-hash |
| cr-05 | choice | Hash or encryption? | Encryption can be reversed with the key; a hash is one-way. | — |
| cr-06 | answer | One letter changes everything | Avalanche effect: changing a single character in the input changes the whole hash. | lib-hash |
| cr-07 | order | Which generated password lasts longest? | The strength of a randomly generated password is the number of possibilities of its generator. | — |
| cr-08 | order | Storing passwords: from worst to best | Passwords are stored with a slow, salted hash, designed on purpose to be costly to test. | — |
| cr-09 | answer | The S in HTTPS | HTTPS is HTTP inside TLS; the old SSL is no longer secure. | — |
| cr-10 | choice | Truly random numbers | Security tokens need a cryptographic random generator, not Math.random(). | — |

## Secrets and cloud

| id | template | title | concept | depends on |
| --- | --- | --- | --- | --- |
| sc-01 | spot-the-flaw | The key in the code | Secrets written in the code end up in git and in every copy of the repository. | — |
| sc-02 | choice | I deleted the key in the next commit | What goes into git stays in the history; an exposed key must be revoked. | — |
| sc-03 | answer | The .env stays out | The .env file with secrets never goes into the repository; share only a .env.example without values. | — |
| sc-04 | order | From minimal access to full access | Least privilege: each account or service gets only the access it needs. | — |
| sc-05 | choice | The public bucket | A bucket with public read access can be reached by anyone on the internet. | — |
| sc-06 | order | The life of a secret | A secret has a life cycle: it is created in a vault, rotated regularly and revoked at the end. | — |
| sc-07 | spot-the-flaw | The secret in the CI log | Everything a pipeline prints ends up in the logs, which many people can read. | — |
| sc-08 | answer | The production secret | Authorization: being signed in does not mean you may read every secret. | — |
| sc-09 | spot-the-flaw | The secret in the image | A secret written in the Dockerfile is baked into the image, within reach of anyone who downloads it. | — |
| sc-10 | choice | How the app reaches the database | Temporary credentials, given by the cloud to a service, avoid fixed keys that can leak. | — |

## Mobile devices

| id | template | title | concept | depends on |
| --- | --- | --- | --- | --- |
| mb-01 | order | From the weakest lock to the strongest | The more combinations a lock has, the longer it takes to guess. | — |
| mb-02 | choice | The paid game for free | Apps installed outside the official stores are the main way malware gets onto phones. | — |
| mb-03 | choice | The cleaner app wants accessibility | The accessibility service lets an app read the screen and tap buttons for you. | — |
| mb-04 | choice | The pending update | Security updates fix flaws that attackers already know about. | — |
| mb-05 | order | How a phone number gets stolen | SIM swap: the attacker convinces the carrier to move your number to their own SIM card. | — |
| mb-06 | choice | You lost your phone | Locking and wiping remotely protects the data on a lost phone. | — |
| mb-07 | spot-the-flaw | Is the app ready for the store? | A published app must not be in debug mode or accept unencrypted traffic. | — |
| mb-08 | choice | Charging at the airport | A public USB port can exchange data with your phone, not just power. | — |
| mb-09 | answer | Managing the company's phones | Mobile device management enforces security rules and lets the company wipe data remotely. | — |
| mb-10 | spot-the-flaw | What shows on the lock screen | Notifications on the lock screen can show codes to anyone who picks up the phone. | — |

## Secure code

| id | template | title | concept | depends on |
| --- | --- | --- | --- | --- |
| cs-01 | spot-the-flaw | Find the path traversal | Joining a file name that comes from the user onto a path lets it escape the intended folder. | — |
| cs-02 | choice | Validating age | Validating against a list of what is allowed is safer than trying to block what is dangerous. | — |
| cs-03 | spot-the-flaw | The password in the log | Passwords and tokens must never go into the application logs. | — |
| cs-04 | choice | The calculator with eval | eval() runs any text it receives as code. | — |
| cs-05 | order | Fixing a vulnerable dependency | A dependency with a known flaw is fixed by updating it, with tests before the deploy. | — |
| cs-06 | answer | Values kept apart from the SQL | Parameterized queries send the SQL and the values separately, and the database never mixes them. | — |
| cs-07 | spot-the-flaw | The error that says too much | Detailed error messages show the attacker how the application works inside. | — |
| cs-08 | choice | Unlimited attempts | Without a limit on attempts, the login is open to brute-force attacks. | — |
| cs-09 | spot-the-flaw | Find the command injection | Gluing user text onto a shell command lets other commands run. | — |
| cs-10 | answer | Pinned versions | The lockfile pins the exact versions of every dependency, including indirect ones. | — |
