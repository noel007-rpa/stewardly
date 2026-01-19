# Supabase Network Debug Checklist

## Quick Diagnosis: ERR_NAME_NOT_RESOLVED vs Network Blocking

### Error Symptom
```
net::ERR_NAME_NOT_RESOLVED
TypeError: Failed to fetch
```

**Root Causes:**
1. ❌ Wrong `VITE_SUPABASE_URL` format (malformed hostname)
2. ❌ DNS resolver can't find `*.supabase.co` domain
3. ❌ Network/proxy/firewall blocking `*.supabase.co`
4. ❌ ISP blocking Supabase domains
5. ❌ Corporate firewall/proxy rules

---

## Step 1: Verify Environment Variables Are Loaded

### Check `.env.local` Exists

```powershell
# Windows: Verify file exists
Test-Path "$PWD\.env.local"
# Result: True (file exists) or False (missing)

# Check file contents
Get-Content .env.local
# Expected output:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=sb_publishable_xxxx
```

### Verify Variables In Vite Dev Server

1. **Check Vite console output on startup:**
   ```
   npm run dev
   ```

2. **Look for startup message:**
   ```
   ✓ VITE v7.2.4
   ➜ Local: http://localhost:5174
   ```

3. **If you don't see Supabase logs, variables aren't loaded**

### Check Browser Console (DevTools)

Open DevTools → Console tab and look for:

```javascript
// Good: Supabase initialized
[Supabase] Initializing with URL: https://your-project.supabase...
[Supabase] Client initialized successfully

// Bad: Missing variables (error thrown)
Uncaught Error: Missing Supabase environment variables
```

---

## Step 2: Verify URL Format (Not Mangled)

### Check If createClient() Receives Correct URL

1. **Add temporary debug logging to `src/api/supabaseClient.ts`:**

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("DEBUG: Raw URL from env:", supabaseUrl);
console.log("DEBUG: URL type:", typeof supabaseUrl);
console.log("DEBUG: URL length:", supabaseUrl?.length);
console.log("DEBUG: URL starts with https://:", supabaseUrl?.startsWith("https://"));
console.log("DEBUG: Contains .supabase.co:", supabaseUrl?.includes(".supabase.co"));

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables...");
}

// Before createClient()
console.log("DEBUG: About to call createClient with:", {
  url: supabaseUrl,
  keyPrefix: supabaseAnonKey?.substring(0, 20) + "...",
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { ... });
```

2. **Open DevTools → Console**

3. **Look for DEBUG logs:**
   ```
   DEBUG: Raw URL from env: https://your-project.supabase.co
   DEBUG: URL type: string
   DEBUG: URL length: 43
   DEBUG: URL starts with https://: true
   DEBUG: Contains .supabase.co: true
   DEBUG: About to call createClient with: { url: "https://...", keyPrefix: "sb_publishable_..." }
   ```

### Expected Values

| Property | Example | ❌ Wrong | ✅ Correct |
|----------|---------|---------|-----------|
| Format | `https://project.supabase.co` | `http://...` | `https://...` |
| Protocol | Must be HTTPS | HTTP, FTP | `https://` |
| Domain | `.supabase.co` | `.supabase.com`, typo | `.supabase.co` |
| No trailing slash | `...supabase.co` | `...supabase.co/` | No slash |
| No path | Just hostname | `...supabase.co/api` | Clean domain |

**Common Mistakes:**
```
❌ https://evekeqcqcsirxlocuvsq/supabase.co (slash in middle)
❌ https://evekeqcqcsirxlocuvsq.supabase.co/ (trailing slash)
❌ https://evekeqcqcsirxlocuvsq.supabase.com (wrong TLD)
❌ http://evekeqcqcsirxlocuvsq.supabase.co (HTTP not HTTPS)

✅ https://evekeqcqcsirxlocuvsq.supabase.co (correct)
```

---

## Step 3: Test DNS Resolution

### Option A: Browser Console (Quickest)

1. Open DevTools → Console
2. Paste this command:

```javascript
// Extract hostname from your URL
const url = "https://evekeqcqcsirxlocuvsq.supabase.co";
const hostname = new URL(url).hostname;
console.log("Testing hostname:", hostname);

// Try to fetch health endpoint
fetch(`${url}/auth/v1/health`)
  .then(r => r.json())
  .then(d => console.log("✅ DNS works! Response:", d))
  .catch(e => console.log("❌ Error:", e.message));
```

**Results:**
```
✅ Success: {"status":"ok"} 
   → DNS resolves, network works

❌ net::ERR_NAME_NOT_RESOLVED
   → DNS can't find *.supabase.co (ISP/network blocking)

❌ net::ERR_BLOCKED_BY_CLIENT
   → Firewall/proxy blocking

❌ CORS error
   → DNS works, but preflight request blocked
```

### Option B: Windows Command Line

```powershell
# Test DNS resolution
nslookup evekeqcqcsirxlocuvsq.supabase.co
# Expected: Shows IP address (e.g., 34.120.x.x)
# If error: "Can't find evekeqcqcsirxlocuvsq.supabase.co"
#          → DNS not resolving

# Try with different DNS server (Google)
nslookup evekeqcqcsirxlocuvsq.supabase.co 8.8.8.8
# If this works but default didn't:
#   → Your ISP/network DNS is blocking
```

### Option C: Check Supabase Status Page

Visit: https://status.supabase.com

**Check:**
- Is Supabase having an outage?
- Are API services online?
- Any regional issues?

---

## Step 4: Flush DNS & Try System DNS

### Windows: Flush Local DNS Cache

```powershell
# Flush DNS
ipconfig /flushdns
# Output should show:
# "Successfully flushed the DNS Resolver Cache"

# View current DNS servers
ipconfig /all | Select-String "DNS Servers"
# Shows your current DNS servers
```

### After flushing, test resolution again:

```powershell
nslookup evekeqcqcsirxlocuvsq.supabase.co
# Should now resolve (if DNS was cached with old value)
```

### Change DNS Server (if blocking detected)

**Try Google Public DNS:**

1. **Windows Settings:**
   - Settings → Network & Internet → WiFi (or Ethernet)
   - Click your network
   - Advanced options
   - DNS server assignment → Edit
   - Change from "Automatic" to "Manual"
   - Toggle IPv4 on
   - Set DNS to: `8.8.8.8` (Google)
   - Also add: `8.8.4.4` (Google backup)
   - Save

2. **Or use 1.1.1.1 (Cloudflare):**
   - `1.1.1.1` (Primary)
   - `1.0.0.1` (Backup)

3. **Or use Quad9 (privacy-focused):**
   - `9.9.9.9` (Primary)
   - `149.112.112.112` (Backup)

4. **Flush DNS again after change:**
   ```powershell
   ipconfig /flushdns
   ```

5. **Test resolution:**
   ```powershell
   nslookup evekeqcqcsirxlocuvsq.supabase.co
   ```

**If it works after changing DNS:**
→ Your ISP is blocking `.supabase.co` domain

**If it still fails after changing DNS:**
→ Likely corporate firewall/proxy (not ISP)

---

## Step 5: Network vs Proxy Blocking

### Quick Network Test: Use Mobile Hotspot

**This definitively shows if it's your network blocking:**

1. **Disconnect from WiFi/Ethernet**
2. **Enable Mobile Hotspot from your phone**
3. **Connect laptop to your phone's hotspot**
4. **Test again in browser:**
   ```javascript
   fetch("https://evekeqcqcsirxlocuvsq.supabase.co/auth/v1/health")
     .then(r => r.json())
     .then(d => console.log("✅ Works on hotspot:", d))
     .catch(e => console.log("❌ Still blocked:", e.message));
   ```

**Results Interpretation:**

| Scenario | WiFi | Hotspot | Likely Cause |
|----------|------|---------|--------------|
| ❌ Fail | ❌ | ✅ | WiFi network blocking (router config) |
| ❌ Fail | ❌ | ❌ | ISP blocking (all networks) |
| ❌ Fail | ⚠️ | ✅ | WiFi or router proxy |
| ✅ Works | ✅ | ✅ | Not a network issue (check URL format) |

**If it works on hotspot but not WiFi:**
- Your router or network admin is blocking `*.supabase.co`
- Talk to network admin or try different WiFi network

**If it fails on both:**
- Your ISP is blocking the domain (contact ISP)
- Or you're on a corporate/school network with restrictions

---

## Step 6: Check for Proxy/Firewall Interference

### Detect If You're Behind a Proxy

```powershell
# Windows: Check proxy settings
netsh winhttp show proxy
# Shows: "Direct access (no proxy)" or proxy address

# If proxy is set:
# ProxyServer=xxx.xxx.xxx.xxx:8080
#   → You're behind a proxy that might be blocking

# Check system proxy (used by Vite)
Get-ItemProperty -Path "Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Internet Settings" | 
  Select-Object ProxyEnable, ProxyServer, ProxyOverride
```

### If Behind Corporate Proxy

1. **Configure Vite to use proxy** (`vite.config.ts`):
   ```typescript
   export default defineConfig({
     server: {
       proxy: {
         '/api': {
           target: 'https://evekeqcqcsirxlocuvsq.supabase.co',
           changeOrigin: true,
           rewrite: (path) => path.replace(/^\/api/, ''),
         }
       }
     }
   })
   ```

2. **Or bypass proxy in Node** (not recommended):
   ```powershell
   $env:npm_config_proxy=$null
   $env:npm_config_https_proxy=$null
   npm run dev
   ```

3. **Better: Contact network admin** to whitelist `*.supabase.co`

---

## Step 7: Verify Supabase Project Exists

### Check Your Project on Supabase Dashboard

1. Go to https://app.supabase.com
2. Sign in with your account
3. Look for project: `evekeqcqcsirxlocuvsq`
4. If you can't find it:
   - ❌ Wrong project ID in URL
   - ❌ Project was deleted
   - ❌ Wrong Supabase account
5. If you find it, copy the exact URL from:
   - Settings → API → Project URL
   - Paste exact value (no typos)

---

## Complete Debug Flow

```
1. Check .env.local exists
   └─ YES → Continue
   └─ NO → Create it

2. Check env vars loaded in console
   └─ ERROR thrown → .env.local not loaded
              → Restart dev server
   └─ NO ERROR → Continue

3. Verify URL format
   └─ DEBUG logs show correct format → Continue
   └─ DEBUG logs show wrong format → Fix .env.local

4. Test DNS resolution (browser console)
   └─ ✅ Works → Skip to Step 8
   └─ ❌ Fails → Continue to Step 5

5. Test on mobile hotspot
   └─ ✅ Works on hotspot → WiFi/Router blocking
   └─ ❌ Still fails → ISP/Proxy blocking

6. Change DNS server
   └─ Works after change → ISP was blocking
   └─ Still fails → Corporate firewall/proxy

7. Contact network admin / ISP
   └─ Whitelist *.supabase.co
   └─ Or find alternate network

8. App should work now!
   └─ If still failing, check CORS headers
```

---

## Test URLs for Manual Verification

### Browser Address Bar (Direct Test)

Copy and paste these in your browser address bar:

```
https://evekeqcqcsirxlocuvsq.supabase.co/auth/v1/health
```

**Expected response:**
```json
{"status":"ok"}
```

**If you see this, DNS and network are working!**

### Browser Console (Fetch Test)

```javascript
// Test Supabase health endpoint
const url = "https://evekeqcqcsirxlocuvsq.supabase.co/auth/v1/health";

fetch(url)
  .then(response => {
    console.log("✅ Status:", response.status);
    return response.json();
  })
  .then(data => console.log("✅ Response:", data))
  .catch(error => {
    console.error("❌ Error type:", error.constructor.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Full error:", error);
  });

// Output will show:
// ✅ Status: 200
// ✅ Response: {status: "ok"}
// OR
// ❌ Error type: TypeError
// ❌ Error message: Failed to fetch
// ❌ Full error: TypeError: Failed to fetch
```

### Browser DevTools Network Tab

1. Open DevTools → Network tab
2. Reload page
3. Look for requests to `*.supabase.co`
4. Check response status:
   - ✅ `200 OK` → Network works
   - ❌ `0 (BLOCKED)` → Firewall blocking
   - ❌ `NET::ERR_NAME_NOT_RESOLVED` → DNS failing
   - ⚠️ `301/302 Redirect` → Proxy intercepting

---

## Common Issues & Solutions

### Issue: "net::ERR_NAME_NOT_RESOLVED"

**Cause:**
- DNS can't resolve `*.supabase.co` hostname to IP address

**Solutions:**
1. Flush DNS: `ipconfig /flushdns`
2. Try public DNS: `8.8.8.8` (Google)
3. Test on mobile hotspot to isolate network
4. If only fails on your network → ISP/firewall blocking

### Issue: "TypeError: Failed to fetch"

**Cause:**
- URL format wrong, OR
- Network can't reach server, OR
- CORS headers rejected request

**Solutions:**
1. Check URL format: must be `https://project.supabase.co`
2. Verify DNS resolves: `nslookup project.supabase.co`
3. Test directly: paste URL in browser address bar
4. Check DevTools Network tab for status code

### Issue: "CORS error: No 'Access-Control-Allow-Origin' header"

**Cause:**
- Request reached server but response headers rejected it

**Solutions:**
1. This means DNS + network + server are fine
2. Likely a browser security restriction on preflight
3. Check Supabase CORS settings: Settings → API → CORS
4. Or use different approach (proxy through Vite)

### Issue: Works on Mobile Hotspot but Not WiFi

**Cause:**
- Your router or WiFi network admin blocking domain

**Solutions:**
1. Access router settings: usually `192.168.1.1` or `192.168.0.1`
2. Look for firewall rules / blocked domains
3. Whitelist `*.supabase.co`
4. Restart router
5. Or use different WiFi network

---

## Final Verification

Once you fix the issue:

1. **Clear browser cache:**
   ```
   DevTools → Application → Clear site data
   ```

2. **Restart dev server:**
   ```powershell
   # Stop: Ctrl+C
   npm run dev
   ```

3. **Check console logs:**
   ```
   [Supabase] Initializing with URL: https://evekeqcqcsirxlocuvsq.supabase.co...
   [Supabase] Client initialized successfully
   ```

4. **Try signing up:**
   - If you get to login page successfully → Network is fixed
   - If you can sign up → Supabase is fully working

---

## Quick Checklist (Copy & Paste)

```
☐ .env.local file exists in project root
☐ VITE_SUPABASE_URL is correct format (https://project.supabase.co)
☐ VITE_SUPABASE_ANON_KEY starts with sb_publishable_
☐ No trailing slash on URL
☐ No typos in domain name
☐ nslookup resolves the hostname to IP
☐ Browser can reach https://project.supabase.co/auth/v1/health
☐ fetch() test in console works
☐ Flushed DNS cache (ipconfig /flushdns)
☐ Dev server restarted after env change (npm run dev)
☐ Cleared browser cache (DevTools → Application → Clear site data)
☐ Tested on mobile hotspot (if corporate network)
```

---

**Last Updated:** January 19, 2026  
**For:** Supabase ERR_NAME_NOT_RESOLVED and Failed to fetch errors
