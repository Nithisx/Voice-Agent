# 🚨 CRITICAL FIX - OAuth Redirect URI Problem

## The Root Cause

Your `.env` file had:

```
REDIRECT_URI=https://localhost:3000/auth/callback
```

But your local server runs on **HTTP** (not HTTPS), causing:

1. ❌ Session cookies can't be read when Zoho redirects to `https://localhost`
2. ❌ Browser security blocks the callback
3. ❌ State validation fails because session is lost

## ✅ Fixed

Changed to:

```
REDIRECT_URI=http://localhost:3000/auth/callback
```

## 🔧 REQUIRED: Update Zoho API Console

**YOU MUST DO THIS NOW:**

1. Go to: https://api-console.zoho.in/
2. Find your Client ID: `1000.WK4T1AN4ENTTKZPBDOSKQ19M2GWVKD`
3. Click "Edit" or "Update"
4. In **Authorized Redirect URIs**, ADD:
   ```
   http://localhost:3000/auth/callback
   ```
5. Keep BOTH URIs (for local and production):

   ```
   http://localhost:3000/auth/callback          ← For LOCAL testing
   https://your-render-app.onrender.com/auth/callback  ← For PRODUCTION
   ```

6. **Save** the changes

## 🧪 Test the Fix

1. **Restart your server:**

   ```bash
   nodemon
   ```

2. **Try OAuth flow:**

   ```
   http://localhost:3000/start?cliq_user_id=906810684
   ```

3. **Expected flow:**
   ```
   http://localhost:3000/start
   → http://localhost:3000/auth/login
   → https://accounts.zoho.in/oauth (authenticate)
   → http://localhost:3000/auth/callback ← Should work now!
   → https://cliqtrix-voice-agent.vercel.app
   ```

## 📋 What I Changed in the Code

### 1. Clear Old OAuth State

```javascript
// In /start endpoint
if (req.session.oauth_state) {
  console.log("🧹 Clearing old oauth_state from session");
  delete req.session.oauth_state;
}
```

### 2. Better Logging

- Shows when state is generated
- Shows when state is compared
- Shows exact mismatch details

### 3. Session Cleanup

```javascript
// Before starting new OAuth flow
delete req.session.oauth_state; // Clear old state
req.session.cliq_user_id = cliqUserId; // Set new user
```

## 🎯 Why This Happened

Your previous OAuth attempts left old `oauth_state` values in the session. When you tried again:

1. Old session had: `oauth_state: 'e5bfd8a8...'`
2. New flow generated: `oauth_state: 'ae216536...'`
3. Zoho returned with: NEW state
4. Callback compared: NEW state vs OLD state in session
5. ❌ Mismatch → Error page

## ✅ Verification Checklist

After updating Zoho API Console and restarting:

- [ ] Server starts without errors
- [ ] Visit: `http://localhost:3000/test` (works)
- [ ] Start OAuth: `http://localhost:3000/start?cliq_user_id=906810684`
- [ ] Gets redirected to Zoho (works)
- [ ] After login on Zoho, redirected back to `http://localhost:3000/auth/callback`
- [ ] Console shows: "✅ State validation passed - states match!"
- [ ] Token saved to MongoDB
- [ ] Redirected to frontend

## 🚀 For Production (Render)

When deploying to Render:

1. **Environment Variables** - Add to Render:

   ```
   REDIRECT_URI=https://your-app.onrender.com/auth/callback
   NODE_ENV=production
   ```

2. **Zoho API Console** - Make sure you have BOTH:
   ```
   http://localhost:3000/auth/callback           ← Local
   https://your-app.onrender.com/auth/callback  ← Production
   ```

## 🐛 If Still Not Working

Check console logs for:

```
🧹 Clearing old oauth_state from session
🎲 Generated NEW state: xxxxxxxx...
✅ NEW oauth_state saved to session: xxxxxxxx...
📝 Received state: xxxxxxxx...
📝 Session oauth_state: xxxxxxxx...
✅ State validation passed - states match!
```

All states should have the SAME value!
