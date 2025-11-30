# 🚀 Render Deployment Checklist

## ✅ Code Changes Completed

1. **✅ MongoDB Session Store** - Using connect-mongo (not memory)
2. **✅ Trust Proxy** - Added `app.set('trust proxy', 1)` for Render's proxy
3. **✅ Session Proxy Config** - Added `proxy: true` to session config
4. **✅ Dynamic PORT** - Using `process.env.PORT || 3000`
5. **✅ Enhanced Debugging** - Added extensive logging to all OAuth endpoints
6. **✅ Error Handling** - Better error messages and user-friendly error pages

## 📋 Environment Variables Required on Render

Set these in your Render dashboard (Environment > Environment Variables):

```
NODE_ENV=production
PORT=3000
SESSION_SECRET=<generate-a-random-32-char-string>
MONGODB_URI=mongodb+srv://nithishkumarnk182005_db_user:3LZEOEORRiL1deWW@cluster0.l7dkvqq.mongodb.net/oauth_db?retryWrites=true&w=majority&appName=Cluster0

# OAuth Configuration
OAUTH_AUTHORIZE_URL=https://accounts.zoho.in/oauth/v2/auth
OAUTH_TOKEN_URL=https://accounts.zoho.in/oauth/v2/token
OAUTH_USERINFO_URL=https://accounts.zoho.in/oauth/v2/user/info
CLIENT_ID=<your-zoho-client-id>
CLIENT_SECRET=<your-zoho-client-secret>
REDIRECT_URI=https://your-render-app.onrender.com/auth/callback
SCOPE=ZohoCliq.users.READ%2CZohoCalendar.event.ALL%2CZohoMeeting.meeting.ALL%2C%2B%2BZohoCliq.Reminders.CREATE
FRONTEND_VOICE_URL=https://cliqtrix-voice-agent.vercel.app
```

## ⚠️ CRITICAL: Update OAuth Redirect URI

**BEFORE deploying to Render:**

1. Go to your Zoho API Console: https://api-console.zoho.in/
2. Find your OAuth application
3. **ADD** the Render callback URL to authorized redirect URIs:
   ```
   https://your-render-app-name.onrender.com/auth/callback
   ```
4. Keep your localhost callback for local development

## 🔧 Render Service Configuration

### Build Command:

```bash
npm install
```

### Start Command:

```bash
node index.js
```

### Other Settings:

- **Region**: Choose closest to your users
- **Instance Type**: Free or Starter
- **Auto-Deploy**: Enable (deploys on git push)
- **Health Check Path**: `/health`

## 🧪 Testing After Deployment

### 1. Test Basic Endpoints:

```
https://your-app.onrender.com/health
https://your-app.onrender.com/test
https://your-app.onrender.com/debug/env
```

### 2. Test OAuth Flow:

```
https://your-app.onrender.com/start?cliq_user_id=test123
```

Expected flow:

1. `/start` → Should redirect to `/auth/login`
2. `/auth/login` → Should redirect to Zoho OAuth
3. Zoho → User authenticates
4. Zoho redirects to `/auth/callback` with code
5. `/auth/callback` → Saves token, redirects to frontend

### 3. Check Logs:

In Render dashboard → Logs tab, you should see:

- `✅ Database connected successfully`
- `✅ Session store created successfully`
- `🚀 Server started successfully`

## 🐛 Debugging Common Issues

### Issue: "An error occurred" on Zoho redirect

**Check:**

1. Is REDIRECT_URI in Render env vars correct?
2. Is REDIRECT_URI added to Zoho API Console?
3. Check Render logs for `/auth/callback` errors

### Issue: Session lost during OAuth

**Check:**

1. `secure: true` in production (should be automatic)
2. `sameSite: 'none'` in production
3. Session store is MongoDB (not memory)
4. MongoDB connection is working

### Issue: "FRONTEND_VOICE_URL not configured"

**Check:**

1. Env var is set in Render
2. No typos in variable name
3. Restart service after adding env vars

## 📊 Monitoring

Check these in Render dashboard:

- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory, Request count
- **Events**: Deployment history

## 🔒 Security Checklist

- ✅ SESSION_SECRET is random and unique
- ✅ CLIENT_SECRET is not committed to git
- ✅ secure: true for cookies in production
- ✅ httpOnly: true for cookies
- ✅ CORS configured with specific origins
- ✅ MongoDB credentials secured

## 📝 Post-Deployment

1. Test complete OAuth flow
2. Verify session persistence
3. Check MongoDB for sessions collection
4. Test from multiple browsers
5. Monitor logs for errors

## 🆘 If Something Goes Wrong

1. Check Render logs immediately
2. Test `/health` and `/debug/env` endpoints
3. Verify all environment variables are set
4. Check MongoDB Atlas allows Render's IP
5. Verify Zoho OAuth redirect URI is correct

## 📚 Useful Commands

```bash
# View logs locally
npm start

# Test endpoints locally
curl http://localhost:3000/health
curl http://localhost:3000/debug/env

# Check MongoDB connection
# (should see in logs)
```

## ✨ Your App is Ready for Render!

All code changes are complete. Just:

1. Push to GitHub
2. Connect GitHub repo to Render
3. Add environment variables
4. Update Zoho OAuth redirect URI
5. Deploy!
