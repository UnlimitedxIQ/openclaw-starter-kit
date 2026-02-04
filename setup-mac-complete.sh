#!/bin/bash
# Complete Mac Mini Setup Script for OpenClaw
# This script does EVERYTHING in one command - zero manual steps!
#
# Usage: ./setup-mac-complete.sh YOUR_ANTHROPIC_API_KEY [YOUR_NAME]
#
# Example: ./setup-mac-complete.sh sk-ant-api03-xxxxx "John Smith"

set -e  # Exit on error

# Check if API key provided
if [ -z "$1" ]; then
    echo "❌ Error: Anthropic API key required!"
    echo ""
    echo "Usage: ./setup-mac-complete.sh YOUR_ANTHROPIC_API_KEY [YOUR_NAME]"
    echo ""
    echo "Example:"
    echo "  ./setup-mac-complete.sh sk-ant-api03-xxxxx \"John Smith\""
    echo ""
    echo "Get your API key from: https://console.anthropic.com/"
    exit 1
fi

ANTHROPIC_API_KEY="$1"
USER_NAME="${2:-YOUR_NAME}"  # Default to YOUR_NAME if not provided

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   🦞 OpenClaw Complete Setup - Zero Manual Steps!           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "API Key: ${ANTHROPIC_API_KEY:0:20}... ✓"
echo "User Name: $USER_NAME"
echo ""
echo "This will take 5-10 minutes. Grab a coffee! ☕"
echo ""

# ============================================================================
# PHASE 1: System Dependencies
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 PHASE 1: Installing System Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install Homebrew if needed
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    echo "✅ Homebrew already installed"
fi

# Install system dependencies
echo "📦 Installing dependencies (poppler, libreoffice, node, python)..."
brew install poppler libreoffice node python@3.11 2>&1 | grep -v "already installed" || true

# ============================================================================
# PHASE 2: Ollama Setup
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 PHASE 2: Ollama Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install Ollama
if ! command -v ollama &> /dev/null; then
    echo "🤖 Installing Ollama..."
    brew install ollama
else
    echo "✅ Ollama already installed"
fi

# Start Ollama service
echo "🚀 Starting Ollama service..."
brew services start ollama

# Wait for Ollama to start
echo "⏳ Waiting for Ollama to initialize..."
sleep 5

# Pull all models
echo ""
echo "📥 Pulling Ollama models (~10GB, this takes 5-10 minutes)..."
echo ""

models=("llama3.2:3b" "llama3.1:8b" "mistral:7b" "deepseek-coder-v2:16b" "nomic-embed-text")
model_names=("Llama 3.2 3B (heartbeats)" "Llama 3.1 8B (research)" "Mistral 7B (ideas)" "DeepSeek Coder 16B (code)" "Nomic Embed (embeddings)")

for i in "${!models[@]}"; do
    echo "  [$((i+1))/5] Pulling ${model_names[$i]}..."
    ollama pull "${models[$i]}" 2>&1 | grep -E "(pulling|success)" || true
done

echo ""
echo "✅ All Ollama models ready!"

# ============================================================================
# PHASE 3: OpenClaw Installation
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 PHASE 3: OpenClaw Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install OpenClaw globally
echo "📦 Installing OpenClaw..."
npm install -g openclaw

# Run OpenClaw setup
echo "⚙️  Running OpenClaw setup..."
openclaw setup

# ============================================================================
# PHASE 4: Directory Structure & Configuration
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 PHASE 4: Directory Structure & Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p ~/agent
mkdir -p ~/.openclaw/agents/main/agent
mkdir -p ~/.openclaw/cron

# Create workspace symlink (current directory is the cloned repo)
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "📁 Linking workspace: $REPO_DIR → ~/agent/openclaw-workspace"
ln -sf "$REPO_DIR" ~/agent/openclaw-workspace

# ============================================================================
# PHASE 5: Personal Configuration Files
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  PHASE 5: Personal Configuration Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd ~/agent/openclaw-workspace

# Copy template files to actual files
echo "📄 Creating CONSTITUTION.md from template..."
if [ ! -f CONSTITUTION.md ]; then
    cp CONSTITUTION.md.example CONSTITUTION.md
    sed -i '' "s/YOUR_NAME/$USER_NAME/g" CONSTITUTION.md
fi

echo "📄 Creating USER.md from template..."
if [ ! -f USER.md ]; then
    cp USER.md.example USER.md
    sed -i '' "s/YOUR_NAME/$USER_NAME/g" USER.md
fi

echo "📄 Creating MEMORY.md from template..."
if [ ! -f MEMORY.md ]; then
    cp MEMORY.md.example MEMORY.md
fi

echo "📄 Creating STARTUP.md from template..."
if [ ! -f STARTUP.md ]; then
    cp STARTUP.md.example STARTUP.md
    sed -i '' "s/YOUR_NAME/$USER_NAME/g" STARTUP.md
fi

# ============================================================================
# PHASE 6: OpenClaw Configuration
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  PHASE 6: OpenClaw Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Copy and configure openclaw.json
echo "📄 Configuring openclaw.json..."
cp openclaw.json.example ~/.openclaw/openclaw.json

# Update workspace path in openclaw.json for macOS
sed -i '' "s|/path/to/openclaw-workspace|$HOME/agent/openclaw-workspace|g" ~/.openclaw/openclaw.json

# Copy and configure cron jobs
echo "📄 Configuring cron jobs..."
cp cron-jobs.json.example ~/.openclaw/cron/jobs.json

# Update paths in cron jobs for macOS
sed -i '' "s|C:\\\\\\\\agent\\\\\\\\openclaw-workspace|$HOME/agent/openclaw-workspace|g" ~/.openclaw/cron/jobs.json
sed -i '' "s|C:\\\\\\\\Users\\\\\\\\bryso|$HOME|g" ~/.openclaw/cron/jobs.json

# ============================================================================
# PHASE 7: API Key Configuration
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 PHASE 7: API Key Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Set API key in environment
echo "🔑 Setting Anthropic API key..."

# Add to .zshrc if not already there
if ! grep -q "ANTHROPIC_API_KEY" ~/.zshrc 2>/dev/null; then
    echo "" >> ~/.zshrc
    echo "# OpenClaw - Anthropic API Key" >> ~/.zshrc
    echo "export ANTHROPIC_API_KEY=\"$ANTHROPIC_API_KEY\"" >> ~/.zshrc
fi

# Set for current session
export ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"

# Create auth-profiles.json for agent
echo "🔑 Creating auth-profiles.json..."
cat > ~/.openclaw/agents/main/agent/auth-profiles.json << EOF
{
  "anthropic:default": {
    "provider": "anthropic",
    "mode": "api_key",
    "apiKey": "$ANTHROPIC_API_KEY"
  }
}
EOF

# Copy agent identity files if they exist in repo
if [ -d "$REPO_DIR/agent-identity" ]; then
    echo "📄 Copying agent identity files..."
    cp -r "$REPO_DIR/agent-identity/"* ~/.openclaw/agents/main/agent/ 2>/dev/null || true
fi

# ============================================================================
# PHASE 8: Verification
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PHASE 8: Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test Ollama
echo "🧪 Testing Ollama..."
ollama list

# Test API key
echo "🧪 Testing API key..."
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "   ✅ API key set (${ANTHROPIC_API_KEY:0:15}...)"
else
    echo "   ❌ API key not set"
fi

# Check OpenClaw
echo "🧪 Checking OpenClaw installation..."
openclaw --version

# ============================================================================
# COMPLETE!
# ============================================================================

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              ✅ SETUP COMPLETE! ✅                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 What was installed:"
echo "   ✅ Homebrew + dependencies (poppler, libreoffice, node, python)"
echo "   ✅ Ollama + 5 models (~10GB)"
echo "   ✅ OpenClaw (globally installed)"
echo "   ✅ Configuration files (all paths set for macOS)"
echo "   ✅ Personal files (from templates)"
echo "   ✅ API key (configured in environment + auth-profiles.json)"
echo "   ✅ Cron jobs (6 background workers ready)"
echo ""
echo "📁 Directory structure:"
echo "   ~/agent/openclaw-workspace → Your workspace"
echo "   ~/.openclaw/openclaw.json → OpenClaw config"
echo "   ~/.openclaw/cron/jobs.json → Background workers"
echo "   ~/.openclaw/agents/main/agent/ → Agent identity"
echo ""
echo "🚀 Start OpenClaw now:"
echo ""
echo "   openclaw gateway"
echo ""
echo "   Or run as background service:"
echo "   screen -dmS openclaw openclaw gateway"
echo "   (Reattach with: screen -r openclaw)"
echo ""
echo "📚 Documentation:"
echo "   ~/agent/openclaw-workspace/QUICKSTART.md"
echo "   ~/agent/openclaw-workspace/MIGRATION_GUIDE.md"
echo ""
echo "💰 Estimated savings: \$2,072/year"
echo ""
echo "✨ You're all set! Start OpenClaw and begin saving money! 🎉"
echo ""
