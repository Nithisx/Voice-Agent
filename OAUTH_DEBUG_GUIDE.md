# OAuth State Error Debugging Guide

## Overview

This guide helps debug "Invalid OAuth state" errors in the Zoho OAuth integration.

## Common Causes & Solutions

### 1. Memory Store Warning (FIXED)

**Problem**: `Warning: connect.session() MemoryStore is not designed for a production environment`
**Solution**: ✅ Replaced with MongoDB session store using `connect-mongo`

### 2. State Token Validation Failures

#### Debugging Steps:

1. **Check Debug Endpoints**:

   ```bash
   # View recent OAuth states
   curl http://localhost:3000/debug/oauth-states

   # View OAuth tokens
   curl http://localhost:3000/debug/oauth-tokens

   # Check session data
   curl http://localhost:3000/debug/session
   ```

2. **Monitor Server Logs**:

   - Look for `🔐 OAuth Login Request` logs
   - Check `🔄 OAuth Callback Request` logs
   - Watch for `❌` error indicators

3. **Common Issues**:

   **a) State Token Expired**

   - States expire after 15 minutes
   - Check `expires_at` in debug endpoint
   - Solution: Restart OAuth flow

   **b) Browser Cookie Issues**

   - Clear browser cookies for your domain
   - Check if cookies are being set correctly

   **c) Session Store Problems**

   - Verify MongoDB connection
   - Check `oauth_sessions` collection in MongoDB

   **d) HMAC Signature Issues**

   - Verify `STATE_SECRET` environment variable
   - Check if server restarted (changes session secret)

### 3. Environment Configuration

Ensure these environment variables are set:

```env
STATE_SECRET=your_secret_key_here
SESSION_SECRET=your_session_secret_here
CLIENT_ID=your_zoho_client_id
CLIENT_SECRET=your_zoho_client_secret
REDIRECT_URI=https://your-domain.com/auth/callback
```

### 4. State Validation Flow

The system now uses triple redundancy:

1. **HMAC Verification**: Cryptographic signature validation
2. **Database Storage**: MongoDB backup with expiration
3. **Session Storage**: Express session fallback

## Troubleshooting Commands

### View Server Logs with Filtering

```bash
# Start with detailed logging
nodemon | grep -E "(🔐|🔄|❌|✅)"
```

### Test OAuth Flow Manually

```bash
# 1. Start OAuth flow
curl -i "http://localhost:3000/auth/login?cliq_user_id=test123"
# Follow redirect URL in browser

# 2. Check if state was created
curl "http://localhost:3000/debug/oauth-states"
```

### Database Queries

Connect to MongoDB and run:

```javascript
// Check OAuth states
db.oauthstates.find().sort({ created_at: -1 }).limit(5);

// Check sessions
db.oauth_sessions.find().sort({ expires: -1 }).limit(5);

// Check OAuth tokens
db.oauthtokens.find().sort({ created_at: -1 }).limit(5);
```

## Error Messages & Solutions

| Error Message                         | Cause                              | Solution                                |
| ------------------------------------- | ---------------------------------- | --------------------------------------- |
| `Missing OAuth state`                 | No state parameter in callback URL | Check Zoho app configuration            |
| `Invalid OAuth state`                 | State validation failed            | Check server logs, verify session store |
| `OAuth provider error: access_denied` | User denied permission             | User needs to accept permissions        |
| `Failed to store OAuth state`         | MongoDB connection issue           | Check database connection               |

## Monitoring & Alerts

### Key Metrics to Monitor:

1. OAuth state creation rate
2. State validation success rate
3. Session store errors
4. Database connection status

### Log Patterns to Watch:

```bash
# Success patterns
grep "✅ OAuth state stored" logs.txt
grep "✅ State verified via" logs.txt

# Error patterns
grep "❌ All state verification methods failed" logs.txt
grep "⚠️ Failed to store OAuth state" logs.txt
```

## Production Checklist

- [x] MongoDB session store configured
- [x] OAuth states stored in database with TTL
- [x] Comprehensive logging added
- [x] Multiple state verification methods
- [x] Debug endpoints available
- [x] Environment variables secured
- [ ] HTTPS enabled for production
- [ ] Rate limiting on OAuth endpoints
- [ ] Error monitoring/alerting setup

## Testing OAuth Flow

Use this test sequence:

1. **Clear all data**:

   ```javascript
   // In MongoDB
   db.oauthstates.deleteMany({});
   db.oauth_sessions.deleteMany({});
   ```

2. **Start fresh OAuth flow**:

   ```bash
   curl -c cookies.txt "http://localhost:3000/auth/login?cliq_user_id=test123"
   ```

3. **Complete flow in browser** using the redirect URL

4. **Verify success**:
   ```bash
   curl "http://localhost:3000/debug/oauth-tokens"
   ```

## Emergency Recovery

If OAuth is completely broken:

1. **Reset all OAuth data**:

   ```javascript
   db.oauthstates.deleteMany({});
   db.oauthtokens.deleteMany({});
   db.oauth_sessions.deleteMany({});
   ```

2. **Restart server** to clear memory state

3. **Test with fresh browser session** (incognito mode)

4. **Check Zoho app configuration** in developer console

## Contact & Support

For persistent issues:

1. Check server logs with timestamps
2. Export MongoDB collections for analysis
3. Verify Zoho app settings match environment variables
4. Test with curl commands to isolate browser issues
