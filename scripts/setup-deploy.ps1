# ═══════════════════════════════════════════════════════════════════
#  Logic Tech — Auto-Deploy Setup Script
#  Run this once to configure GitHub Secrets + SSH for CI/CD
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

# Refresh PATH to pick up newly installed tools
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║   Logic Tech — Auto-Deploy Setup                ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─── Step 1: Check GitHub CLI ──────────────────────────────────────
Write-Host "  [1/4] Checking GitHub CLI..." -ForegroundColor Yellow

try {
    $ghVersion = gh --version 2>&1 | Select-Object -First 1
    Write-Host "  ✅ $ghVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ GitHub CLI not found. Install with: winget install GitHub.cli" -ForegroundColor Red
    exit 1
}

# ─── Step 2: Authenticate GitHub CLI ───────────────────────────────
Write-Host ""
Write-Host "  [2/4] Authenticating with GitHub..." -ForegroundColor Yellow

$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  → You'll be prompted to log in via browser..." -ForegroundColor DarkYellow
    gh auth login --web --git-protocol https
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ GitHub authentication failed." -ForegroundColor Red
        exit 1
    }
}
Write-Host "  ✅ Authenticated with GitHub" -ForegroundColor Green

# ─── Step 3: Collect cPanel details ───────────────────────────────
Write-Host ""
Write-Host "  [3/4] Setting up deployment secrets..." -ForegroundColor Yellow
Write-Host ""

# cPanel connection details
$sshHost = Read-Host "  Enter cPanel hostname (e.g. logictech.co.ke)"
if ([string]::IsNullOrWhiteSpace($sshHost)) { $sshHost = "logictech.co.ke" }

$sshPort = Read-Host "  Enter SSH port (default: 22)"
if ([string]::IsNullOrWhiteSpace($sshPort)) { $sshPort = "22" }

$sshUser = Read-Host "  Enter cPanel username (e.g. logictec)"
if ([string]::IsNullOrWhiteSpace($sshUser)) { $sshUser = "logictec" }

$deployPathProd = Read-Host "  Enter production path (default: /home/$sshUser/public_html)"
if ([string]::IsNullOrWhiteSpace($deployPathProd)) { $deployPathProd = "/home/$sshUser/public_html" }

$deployPathStaging = Read-Host "  Enter staging path (default: /home/$sshUser/public_html/staging)"
if ([string]::IsNullOrWhiteSpace($deployPathStaging)) { $deployPathStaging = "/home/$sshUser/public_html/staging" }

# Environment variables
Write-Host ""
Write-Host "  → Environment Variables (press Enter to skip/use defaults):" -ForegroundColor DarkYellow

$adminEmail = Read-Host "  Admin email (e.g. admin@logictech.co.ke)"
$adminPassword = Read-Host "  Admin password (min 16 chars)"
$sessionSecret = Read-Host "  Session secret (leave blank to auto-generate)"

if ([string]::IsNullOrWhiteSpace($sessionSecret)) {
    # Generate a random session secret
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $sessionSecret = [Convert]::ToBase64String($bytes)
    Write-Host "  → Auto-generated session secret" -ForegroundColor DarkGray
}

$smtpHost = Read-Host "  SMTP host (e.g. smtp.gmail.com, or skip)"
$smtpPort = Read-Host "  SMTP port (e.g. 587, or skip)"
$smtpUser = Read-Host "  SMTP user (e.g. hello@logictech.co.ke, or skip)"
$smtpPassword = Read-Host "  SMTP password (or skip)"
$smtpFrom = Read-Host "  SMTP from address (e.g. noreply@logictech.co.ke, or skip)"

# ─── SSH Key ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "  → Setting up SSH key..." -ForegroundColor DarkYellow

$keyPath = "$env:USERPROFILE\.ssh\github_deploy_logictech"
if (-not (Test-Path $keyPath)) {
    Write-Host "  → Generating new SSH key pair..." -ForegroundColor DarkGray
    ssh-keygen -t ed25519 -f $keyPath -N '""' -C "github-actions-deploy@logictech.co.ke"
}

$privateKey = Get-Content $keyPath -Raw
$publicKey = Get-Content "$keyPath.pub" -Raw

Write-Host "  ✅ SSH key ready" -ForegroundColor Green

# ─── Step 4: Add GitHub Secrets ───────────────────────────────────
Write-Host ""
Write-Host "  [4/4] Adding secrets to GitHub..." -ForegroundColor Yellow

$repo = "kim425716-dotcom/logic-tech-website"

# Helper function to set a secret
function Set-GHSecret($name, $value) {
    if (-not [string]::IsNullOrWhiteSpace($value)) {
        $value | gh secret set $name --repo $repo 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ $name" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $name — failed to set" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⏭️  $name — skipped (empty)" -ForegroundColor DarkGray
    }
}

# Connection secrets
Set-GHSecret "CPANEL_SSH_HOST"     $sshHost
Set-GHSecret "CPANEL_SSH_PORT"     $sshPort
Set-GHSecret "CPANEL_SSH_USER"     $sshUser
Set-GHSecret "CPANEL_SSH_KEY"      $privateKey
Set-GHSecret "DEPLOY_PATH_PROD"    $deployPathProd
Set-GHSecret "DEPLOY_PATH_STAGING" $deployPathStaging

# Environment secrets
Set-GHSecret "ENV_PORT"            "8080"
Set-GHSecret "ENV_FRONTEND_URL"    "https://logictech.co.ke"
Set-GHSecret "ENV_PUBLIC_URL"      "https://logictech.co.ke"
Set-GHSecret "ENV_APP_URL"         "https://logictech.co.ke"
Set-GHSecret "ENV_ADMIN_NAME"      "Logic Tech Admin"
Set-GHSecret "ENV_ADMIN_EMAIL"     $adminEmail
Set-GHSecret "ENV_ADMIN_PASSWORD"  $adminPassword
Set-GHSecret "ENV_SESSION_SECRET"  $sessionSecret
Set-GHSecret "ENV_SMTP_HOST"       $smtpHost
Set-GHSecret "ENV_SMTP_PORT"       $smtpPort
Set-GHSecret "ENV_SMTP_USER"       $smtpUser
Set-GHSecret "ENV_SMTP_PASSWORD"   $smtpPassword
Set-GHSecret "ENV_SMTP_FROM"       $smtpFrom

# ─── Done ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║   ✅ Setup Complete!                            ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  📋 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Add this PUBLIC key to cPanel → SSH Access → Import Key:" -ForegroundColor White
Write-Host ""
Write-Host "     $publicKey" -ForegroundColor Yellow
Write-Host ""
Write-Host "     Then click 'Authorize' next to the key in cPanel." -ForegroundColor White
Write-Host ""
Write-Host "  2. Push code to deploy:" -ForegroundColor White
Write-Host "     git push origin main      # → Production" -ForegroundColor DarkGray
Write-Host "     git push origin develop   # → Staging" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  3. Monitor: https://github.com/$repo/actions" -ForegroundColor White
Write-Host ""
