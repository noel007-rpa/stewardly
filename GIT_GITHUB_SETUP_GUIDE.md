# Git & GitHub Setup Guide for React + Vite Project

## Overview

This guide walks through initializing git locally, adding proper .gitignore, creating your first commit, pushing to GitHub, and preparing for Vercel deployment.

**Prerequisites:**
- Git installed locally (`git --version` in terminal)
- GitHub account created
- Project folder ready (not yet a git repo)

**Time to complete:** ~10-15 minutes

---

## Step 1: Initialize Local Git Repository

### 1.1 Open Terminal in Project Root

Navigate to your project folder in VS Code or terminal:

```powershell
cd "c:\Users\noel.vicencio.SE\vscode\Stewardly"
```

Verify you're in the right place:
```powershell
pwd
# Should output: C:\Users\noel.vicencio.SE\vscode\Stewardly
```

### 1.2 Initialize Git

```powershell
git init
```

**Output:**
```
Initialized empty Git repository in C:\Users\noel.vicencio.SE\vscode\Stewardly\.git
```

**What this does:** Creates a hidden `.git` folder that tracks all version history.

### 1.3 Verify Initialization

```powershell
git status
```

**Output:**
```
On branch master

No commits yet

nothing to commit (create/commit and track)
```

✅ **Checkpoint:** Local git repository initialized.

---

## Step 2: Create .gitignore File

### 2.1 Create .gitignore in Project Root

The .gitignore file tells git which files/folders to never track.

**File location:** `c:\Users\noel.vicencio.SE\vscode\Stewardly\.gitignore`

**Content for React + Vite project:**

```
# Dependencies
node_modules/
pnpm-lock.yaml
yarn.lock
package-lock.json

# Build outputs
dist/
build/
.tsbuildinfo

# Environment variables
.env
.env.local
.env.*.local
.env.production

# IDE & Editor
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Runtime
*.pid
*.seed

# Temporary files
tmp/
temp/
```

### 2.2 Create the File in VS Code

1. In VS Code, right-click the project root folder in Explorer
2. Select "New File"
3. Name it `.gitignore`
4. Paste the content above
5. Save (`Ctrl+S`)

Or via terminal (PowerShell):

```powershell
@"
# Dependencies
node_modules/
pnpm-lock.yaml
yarn.lock
package-lock.json

# Build outputs
dist/
build/
.tsbuildinfo

# Environment variables
.env
.env.local
.env.*.local
.env.production

# IDE & Editor
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Runtime
*.pid
*.seed

# Temporary files
tmp/
temp/
"@ | Out-File -FilePath .gitignore -Encoding UTF8
```

### 2.3 Verify .gitignore Created

```powershell
ls -Force | Select-Object Name
# Should show .gitignore
```

✅ **Checkpoint:** .gitignore created and configured.

---

## Step 3: Configure Git User (First Time Only)

If you haven't set up git credentials before, configure them:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Replace with your actual name and GitHub email.

**Verify:**
```powershell
git config --global user.name
git config --global user.email
```

✅ **Checkpoint:** Git user configured.

---

## Step 4: Stage and Commit Initial Files

### 4.1 Check What Will Be Tracked

```powershell
git status
```

**Expected:** Should NOT show `node_modules/` or `dist/` (gitignored) but should show `.gitignore` and your source files.

### 4.2 Stage All Files

```powershell
git add .
```

This stages all unignored files for commit.

### 4.3 Create First Commit

```powershell
git commit -m "Initial commit: React + Vite project setup"
```

**Output:**
```
[master (root-commit) abc1234] Initial commit: React + Vite project setup
 XX files changed, YYYY insertions(+)
 create mode 100644 .gitignore
 create mode 100644 package.json
 ...
```

### 4.4 Verify Commit

```powershell
git log --oneline
```

**Output:**
```
abc1234 Initial commit: React + Vite project setup
```

✅ **Checkpoint:** First commit created locally.

---

## Step 5: Create GitHub Repository

### 5.1 Go to GitHub

1. Open https://github.com
2. Log in with your account
3. Click **"+" icon** (top right) → **"New repository"**

### 5.2 Configure Repository

**Repository name:**
```
Stewardly
```

**Description (optional):**
```
React + Vite personal finance dashboard
```

**Visibility:**
- Choose **Public** or **Private** (your preference)

**Initialize repository:**
- ❌ DO NOT check "Add a README.md" (you already have one)
- ❌ DO NOT check "Add .gitignore" (you already have one)
- ❌ DO NOT choose a license (unless you want to)

### 5.3 Create Repository

Click **"Create repository"** button.

### 5.4 Copy Repository URL

After creation, GitHub shows your repo URL. Copy the **HTTPS URL**:

```
https://github.com/YOUR_USERNAME/Stewardly.git
```

Or use **SSH** if you have SSH keys configured:

```
git@github.com:YOUR_USERNAME/Stewardly.git
```

✅ **Checkpoint:** GitHub repository created and URL copied.

---

## Step 6: Add Remote and Push to GitHub

### 6.1 Add GitHub as Remote

In your terminal, add the remote:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/Stewardly.git
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### 6.2 Verify Remote Added

```powershell
git remote -v
```

**Output:**
```
origin  https://github.com/YOUR_USERNAME/Stewardly.git (fetch)
origin  https://github.com/YOUR_USERNAME/Stewardly.git (push)
```

### 6.3 Push to GitHub (Main Branch)

```powershell
git branch -M main
git push -u origin main
```

**What this does:**
- `git branch -M main` - Renames local `master` branch to `main` (GitHub default)
- `git push -u origin main` - Pushes local `main` to GitHub `origin/main` and sets tracking

### 6.4 Handle Authentication (If Prompted)

**If using HTTPS:**

If prompted for username/password:
- **Username:** Your GitHub username
- **Password:** Your personal access token (NOT your GitHub password)

**To create a personal access token:**
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Click "Generate new token"
3. Name it "Git CLI"
4. Check scopes: `repo`, `user`
5. Generate and copy the token
6. Paste when prompted in terminal

**If using SSH:**

First time only, GitHub may add a security prompt:
```
The authenticity of host 'github.com' can't be established.
Are you sure you want to continue connecting (yes/no)?
```

Type `yes` and press Enter.

### 6.5 Verify Push Succeeded

```powershell
git status
```

**Output:**
```
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

**Also verify on GitHub:**
1. Go to https://github.com/YOUR_USERNAME/Stewardly
2. You should see your files and commit history

✅ **Checkpoint:** Code pushed to GitHub successfully.

---

## Step 7: Verify Vercel Readiness

### 7.1 Check Project Structure

Your GitHub repo should contain:

```
Stewardly/
├── .gitignore              ✓ (prevents tracking of node_modules, dist)
├── .git/                   ✓ (git repository)
├── package.json            ✓ (npm dependencies)
├── vite.config.ts          ✓ (build config)
├── tsconfig.json           ✓ (TypeScript config)
├── src/                    ✓ (source files)
├── public/                 ✓ (static assets)
├── dist/                   ✗ (NOT tracked - ignored by .gitignore)
└── node_modules/           ✗ (NOT tracked - ignored by .gitignore)
```

✅ Node modules and dist are properly ignored

### 7.2 Verify Key Files

Check these files exist in your repo:

```powershell
ls -Force *.json
# Should show: package.json, tsconfig.json, tsconfig.app.json, tsconfig.node.json

ls vite.config.ts
# Should exist

ls src/main.tsx
# Should exist
```

### 7.3 Check Build Configuration

Verify your `package.json` has build and preview scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
```

✅ All scripts present for Vercel deployment

### 7.4 Check Environment Variables (If Any)

If you have `.env` files:
- ❌ `.env` (local secrets) - should NOT be in git (already in .gitignore)
- ✅ `.env.example` (template) - CAN be in git

**Create `.env.example` if needed:**

```
# Example environment variables
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Stewardly
```

Then add to git:
```powershell
git add .env.example
git commit -m "Add environment variables template"
git push
```

✅ Environment variables properly configured

### 7.5 Final Verification Checklist

- [x] Repository exists on GitHub at `https://github.com/YOUR_USERNAME/Stewardly`
- [x] Local git initialized with `git init`
- [x] `.gitignore` file created with proper ignores
- [x] First commit created with initial project files
- [x] Remote `origin` points to GitHub repo
- [x] Code pushed to `main` branch on GitHub
- [x] `package.json` contains build scripts
- [x] `vite.config.ts` exists and is configured
- [x] `src/main.tsx` entry point exists
- [x] No `node_modules/` or `dist/` in git history
- [x] Environment template `.env.example` created (if needed)

✅ **READY FOR VERCEL IMPORT**

---

## Step 8: Import into Vercel

### 8.1 Go to Vercel Dashboard

1. Open https://vercel.com
2. Log in with your account (can use GitHub)
3. Click "Add New..." → "Project"

### 8.2 Import from GitHub

1. Click "Import Git Repository"
2. Paste your GitHub repo URL: `https://github.com/YOUR_USERNAME/Stewardly`
3. Or search for your repo if connected to GitHub

### 8.3 Configure Build Settings

Vercel should auto-detect:

**Framework Preset:** Vite

**Build Command:** `npm run build` (auto-detected)

**Output Directory:** `dist` (auto-detected)

**Install Command:** `npm install` (auto-detected)

Verify these are correct, then click "Deploy".

### 8.4 Wait for Deployment

Vercel will:
1. Clone your repo
2. Run `npm install`
3. Run `npm run build`
4. Deploy to Vercel CDN

Once complete, you'll get a deployment URL like:
```
https://stewardly-xyz.vercel.app
```

✅ **Project successfully deployed to Vercel!**

---

## Quick Reference: Common Commands

### View Status
```powershell
git status
```

### View Commit History
```powershell
git log --oneline
```

### View Remote
```powershell
git remote -v
```

### Pull Latest from GitHub
```powershell
git pull origin main
```

### Push Local Changes
```powershell
git add .
git commit -m "Your message"
git push
```

### Undo Last Commit (Before Push)
```powershell
git reset --soft HEAD~1
```

### Remove File from Git (Keep Locally)
```powershell
git rm --cached filename
```

---

## Troubleshooting

### "fatal: not a git repository"
**Solution:** Run `git init` in your project root directory.

### "error: failed to push some refs to 'origin'"
**Solution:** Your local branch is behind remote. Run:
```powershell
git pull origin main
git push origin main
```

### "Permission denied (publickey)" (SSH only)
**Solution:** Add SSH keys to GitHub or use HTTPS instead:
```powershell
git remote set-url origin https://github.com/YOUR_USERNAME/Stewardly.git
```

### ".gitignore not working (node_modules still tracked)"
**Solution:** Remove cached files and re-add:
```powershell
git rm -r --cached node_modules/
git add .
git commit -m "Remove node_modules from tracking"
git push
```

### "Updates were rejected because the remote contains work that you do not have locally"
**Solution:** Pull before pushing:
```powershell
git pull origin main --rebase
git push origin main
```

---

## What's Next?

After Vercel deployment:

1. **Set environment variables in Vercel:**
   - Vercel Dashboard → Project Settings → Environment Variables
   - Add any secrets from your `.env` file

2. **Enable auto-deployments:**
   - Vercel auto-deploys on every push to `main`
   - Create a `develop` or `staging` branch for testing

3. **Add GitHub branch protection (optional):**
   - Require pull requests before merging to `main`
   - Require status checks to pass

4. **Monitor deployments:**
   - Vercel Dashboard shows all deployment history
   - View logs for any build errors

---

## Summary Timeline

| Step | Action | Time |
|------|--------|------|
| 1 | Initialize git locally | 1 min |
| 2 | Create .gitignore | 2 min |
| 3 | Configure git user | 1 min |
| 4 | Create first commit | 2 min |
| 5 | Create GitHub repo | 3 min |
| 6 | Add remote & push | 3 min |
| 7 | Verify Vercel readiness | 2 min |
| 8 | Import into Vercel | 3 min |
| **Total** | **From local folder to live deployment** | **~17 minutes** |

---

**Completion Date:** 2026-01-17  
**Project:** Stewardly (React + Vite)  
**Status:** ✅ Ready for production
