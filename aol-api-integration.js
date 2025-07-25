
// AOL IMAP Integration Code
// Add this to your working-api-server.js

import { ImapFlow } from 'imapflow';

// AOL IMAP Helper Functions
async function getAOLEmails(accountEnvPrefix, limit = 10) {
    const config = {
        host: 'imap.aol.com',
        port: 993,
        secure: true,
        auth: {
            user: process.env[`${accountEnvPrefix}_EMAIL`],
            pass: process.env[`${accountEnvPrefix}_APP_PASSWORD`]
        }
    };
    
    const client = new ImapFlow(config);
    await client.connect();
    
    const lock = await client.getMailboxLock('INBOX');
    const emails = [];
    
    try {
        const messages = await client.fetch(`1:${limit}`, { 
            envelope: true, 
            bodyStructure: true 
        }, { uid: true });
        
        for await (let message of messages) {
            emails.push({
                id: message.uid,
                from: message.envelope.from?.[0]?.address || 'Unknown',
                subject: message.envelope.subject || 'No Subject',
                date: message.envelope.date,
                isUnread: !message.flags.has('\\Seen')
            });
        }
    } finally {
        lock.release();
    }
    
    await client.logout();
    return emails;
}

// Add AOL endpoints to your Express app:

app.get('/api/aol/aol/emails', async (req, res) => {
    try {
        const emails = await getAOLEmails('AOL', req.query.limit || 10);
        res.json(emails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/aol/aol2/emails', async (req, res) => {
    try {
        const emails = await getAOLEmails('AOL2', req.query.limit || 10);
        res.json(emails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/aol/aol3/emails', async (req, res) => {
    try {
        const emails = await getAOLEmails('AOL3', req.query.limit || 10);
        res.json(emails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
