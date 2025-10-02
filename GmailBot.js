require('dotenv').config({ path: './credentials.env' });
const fs = require('fs-extra');
const path = require('path');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const readline = require('readline');
const { chromium } = require('playwright');

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = 'token.json';
const ROOT_DOWNLOAD_FOLDER = path.join(__dirname, 'downloads');
const CONFIRMATION_EMAIL = process.env.CONFIRMATION_EMAIL;
const today = new Date().toISOString().split('T')[0];
const saveDir = path.join(ROOT_DOWNLOAD_FOLDER, today);
fs.ensureDirSync(saveDir);

async function authorize() {
  const credentials = await fs.readJson('credentials.json');
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = await fs.readJson(TOKEN_PATH);
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('Authorize this app by visiting this URL:', authUrl);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise(resolve => rl.question('Enter the code from that page here: ', resolve));
  rl.close();

  const { tokens } = await oAuth2Client.getToken(code);
  await fs.writeJson(TOKEN_PATH, tokens);
  oAuth2Client.setCredentials(tokens);
  return oAuth2Client;
}

async function processNeostellaEmails(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:Neostella',
    maxResults: 50
  });

  const messages = res.data.messages || [];
  if (messages.length === 0) {
    console.log('No Neostella emails found.');
    await sendConfirmationEmailViaGmailAPI(auth);
    return;
  }

  for (const msg of messages) {
    const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id });
    const parts = detail.data.payload.parts || [];

    for (const part of parts) {
      if (part.filename && part.body && part.body.attachmentId) {
        const attachment = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: msg.id,
          id: part.body.attachmentId
        });
        const data = attachment.data.data;
        const buffer = Buffer.from(data, 'base64');
        const filePath = path.join(saveDir, part.filename);
        fs.writeFileSync(filePath, buffer);
        console.log(`Saved: ${part.filename} in ${filePath}`);
      }
    }

    await gmail.users.messages.modify({
      userId: 'me',
      id: msg.id,
      resource: { removeLabelIds: ['INBOX'], addLabelIds: ['UNREAD'] }
    });
  }

  await sendConfirmationEmailViaGmailAPI(auth);
}

async function sendConfirmationEmailViaGmailAPI(auth) {
  const gmail = google.gmail({ version: 'v1', auth });

  const rawMessage = [
    `From: ${process.env.GMAIL_USER}`,
    `To: ${process.env.CONFIRMATION_EMAIL}`,
    'Subject: Ernesto Juarez - Neostella Email Processing Complete',
    '',
    'All Neostella emails processed and attachments saved in \downloads\YYYY-MM-DD folder'
  ].join('\n');

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });

  console.log('Confirmation email sent');
}

authorize().then(processNeostellaEmails).catch(console.error);