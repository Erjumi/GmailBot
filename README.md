# GmailBot Automation – README

Automates Gmail inbox processing using OAuth2 and Gmail API. It retrieves emails with subject “Neostella,” downloads attachments, marks emails as unread, and sends a confirmation email via Gmail API. Attachments are saved to a dated folder on local repository.

---
### Google Account Requirements
- Gmail account with **2-Step Verification enabled**
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Ability to create OAuth2 credentials

---
## Google Cloud Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g. `GmailBot`)
3. Enable the **Gmail API** under “APIs & Services”
4. Go to **Credentials** → Create **OAuth client ID**
   - App type: **Desktop App**
   - Download `credentials.json` and place it in the project root
5. Go to **OAuth consent screen**
   - Set user type to **External**
   - Add your Gmail address under **Test Users**
   - Save and publish


---
##  How to Run

1. Clone or copy the project folder to your PC
3. Create `credentials.env` with your Gmail credentials:

node gmailBot.js

---
## Install Dependencies
Run this in the project folder:

```bash
npm install googleapis fs-extra dotenv nodemailer playwright readline
npx playwright install msedge