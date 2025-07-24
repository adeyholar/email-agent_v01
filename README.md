# Email Agent MCP - Complete Execution Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (Download from [nodejs.org](https://nodejs.org/))
- **pnpm** package manager (`npm install -g pnpm`)
- **Git** for version control
- **Claude Desktop** application installed

### Step 1: Initial Setup
```powershell
# Navigate to project directory
cd D:\AI\Gits\email-agent_v01\

# Run master setup (creates structure, checks dependencies)
.\setup-master.ps1
```

### Step 2: Frontend Setup
```powershell
# Setup React TypeScript frontend with Tailwind CSS
.\setup-frontend.ps1
```

### Step 3: MCP Server Setup
```powershell
# Setup Claude Desktop MCP integration
.\setup-mcp.ps1
```

### Step 4: Email Connectors Setup
```powershell
# Setup Gmail and email provider integrations
.\setup-connectors.ps1
```

### Step 5: Configuration
1. **Update Environment Variables**
   ```powershell
   # Edit .env file with your credentials
   notepad .env
   ```
   
   Required variables:
   ```env
   GMAIL_CLIENT_ID=your_gmail_client_id
   GMAIL_CLIENT_SECRET=your_gmail_client_secret
   GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
   MCP_SERVER_PORT=8080
   API_PORT=3001
   ```

2. **Gmail API Setup**
   - Follow instructions in `docs/oauth-setup.md`
   - Get credentials from [Google Cloud Console](https://console.cloud.google.com/)

### Step 6: Start Application
```powershell
# Start in development mode
.\start.ps1 -Development

# Or start in production mode
.\start.ps1
```

---

## 📁 Project Structure

```
D:\AI\Gits\email-agent_v01\
├── src/
│   ├── components/
│   │   └── EmailDashboard.jsx     # Main UI component
│   ├── services/
│   │   ├── emailAnalyzer.js       # AI analysis service
│   │   └── apiServer.js           # Express API server
│   ├── types/
│   ├── utils/
│   ├── main.tsx                   # React entry point
│   └── index.css                  # Global styles
├── mcp-server/
│   ├── mcpServer.js              # MCP integration server
│   ├── config.json               # MCP configuration
│   └── tools-schema.json         # MCP tools schema
├── connectors/
│   ├── gmailConnector.js         # Gmail API integration
│   ├── connectorUtils.js         # Shared utilities
│   ├── config.json               # Connector configuration
│   └── test-config.json          # Test configuration
├── scripts/
│   ├── setup-master.ps1          # Main orchestrator
│   ├── setup-frontend.ps1        # Frontend setup
│   ├── setup-mcp.ps1             # MCP setup
│   ├── setup-connectors.ps1      # Connectors setup
│   └── start.ps1                 # Application starter
├── config/
├── logs/
├── docs/
│   └── oauth-setup.md            # OAuth setup instructions
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── .env
└── .env.example
```

---

## 🔧 Configuration Details

### Environment Variables (.env)
```env
# MCP Server Configuration
MCP_SERVER_PORT=8080
MCP_SERVER_HOST=localhost
MCP_LOG_LEVEL=info

# API Server Configuration
API_PORT=3001
FRONTEND_URL=http://localhost:3000

# Gmail API Credentials
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# Security (generate secure random strings)
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
```

### Claude Desktop Configuration
The setup automatically updates `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "email-agent": {
      "command": "node",
      "args": ["D:\\AI\\Gits\\email-agent_v01\\mcp-server\\mcpServer.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

---

## 🌐 API Endpoints

### Email Operations
- `POST /api/emails/recent` - Get recent emails
- `POST /api/emails/search` - Search emails
- `GET /api/emails/:id` - Get specific email
- `GET /api/emails/unread-count` - Get unread count
- `POST /api/emails/send` - Send email

### Analysis Operations
- `POST /api/analysis/analyze` - Analyze email content
- `POST /api/analysis/compose-assist` - Get composition help

### Insights
- `POST /api/insights` - Get email insights and analytics

### Authentication
- `GET /api/auth/gmail/url` - Get Gmail OAuth URL
- `POST /api/auth/gmail/callback` - Handle OAuth callback

---

## 🔍 MCP Tools Available in Claude Desktop

Once configured, these tools are available in Claude Desktop:

1. **email_analyze** - Analyze email content for sentiment, priority, action items
2. **email_search** - Search emails using various criteria  
3. **email_compose_assist** - Get AI assistance for composing emails
4. **email_insights** - Get insights about email patterns and productivity

---

## 🚨 Troubleshooting

### Common Issues

1. **"Gmail credentials not found"**
   ```powershell
   # Check .env file exists and has correct values
   cat .env | findstr GMAIL
   ```

2. **"MCP server not connecting"**
   ```powershell
   # Check Claude Desktop config
   cat "$env:APPDATA\Claude\claude_desktop_config.json"
   
   # Restart Claude Desktop application
   ```

3. **"Port already in use"**
   ```powershell
   # Check what's using the port
   netstat -ano | findstr :3001
   
   # Kill the process or change port in .env
   ```

4. **"pnpm command not found"**
   ```powershell
   # Install pnpm globally
   npm install -g pnpm
   ```

### Logs Location
- Application logs: `logs/`
- MCP server logs: `logs/mcp-server.log`
- Setup logs: `logs/setup.log`

### Reset and Reinstall
```powershell
# Clean install
Remove-Item -Recurse -Force node_modules, dist, .pnpm-store -ErrorAction SilentlyContinue
pnpm install
```

---

## 🔒 Security Considerations

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Use environment variables** - All sensitive data in .env
3. **Regular token rotation** - Refresh OAuth tokens periodically
4. **HTTPS in production** - Use secure connections
5. **Rate limiting** - Built-in rate limiting for API calls

---

## 📊 Features

### Email Management
- ✅ Gmail integration via Google APIs
- ✅ Real-time email search and filtering
- ✅ Unread email tracking
- ✅ Email sending capabilities

### AI Analysis (via Claude MCP)
- ✅ Sentiment analysis
- ✅ Priority classification
- ✅ Action item extraction
- ✅ Email summarization
- ✅ Compose assistance

### Dashboard
- ✅ Email volume analytics
- ✅ Response time insights  
- ✅ Top senders analysis
- ✅ Topic extraction
- ✅ Real-time statistics

### Architecture
- ✅ Modular design (each file <200 lines)
- ✅ React 18 + TypeScript frontend
- ✅ Express.js API server
- ✅ Claude Desktop MCP integration
- ✅ pnpm package management
- ✅ Tailwind CSS styling

---

## 🎯 Next Steps

1. **Complete OAuth setup** following `docs/oauth-setup.md`
2. **Test MCP integration** in Claude Desktop
3. **Customize email analysis** rules in `emailAnalyzer.js`
4. **Add more email providers** (Outlook, Exchange)
5. **Implement email templates** and automation

---

## 📞 Support

For issues:
1. Check logs in `logs/` directory
2. Verify all environment variables are set
3. Ensure Claude Desktop is restarted after MCP setup
4. Test Gmail API connection independently

---

**Happy Email Management with Claude MCP! 🎉**