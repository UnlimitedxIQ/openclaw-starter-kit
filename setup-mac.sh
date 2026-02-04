#!/bin/bash
# Mac Mini Setup Script for OpenClaw
# This script sets up a Mac Mini as a 24/7 OpenClaw server with local Ollama models

set -e  # Exit on error

echo "🦞 Setting up OpenClaw on Mac Mini..."
echo ""

# 1. Install Homebrew if needed
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

# 2. Install system dependencies
echo ""
echo "📦 Installing system dependencies..."
brew install poppler libreoffice node python@3.11

# 3. Install Ollama if needed
if ! command -v ollama &> /dev/null; then
    echo ""
    echo "🤖 Installing Ollama..."
    brew install ollama
else
    echo "✅ Ollama already installed"
fi

# 4. Start Ollama service
echo ""
echo "🚀 Starting Ollama service..."
brew services start ollama

# Wait for Ollama to start
echo "⏳ Waiting for Ollama to start..."
sleep 5

# 5. Pull Ollama models
echo ""
echo "📥 Pulling Ollama models (this may take a while)..."
echo "  - llama3.2:3b (heartbeats, fast tasks)"
ollama pull llama3.2:3b

echo "  - llama3.1:8b (research, summarization)"
ollama pull llama3.1:8b

echo "  - mistral:7b (quick drafts, ideas)"
ollama pull mistral:7b

echo "  - deepseek-coder-v2:16b (code analysis)"
ollama pull deepseek-coder-v2:16b

echo "  - nomic-embed-text (embeddings)"
ollama pull nomic-embed-text

# 6. Install OpenClaw globally
echo ""
echo "📦 Installing OpenClaw..."
npm install -g openclaw

# 7. Setup OpenClaw
echo ""
echo "⚙️  Setting up OpenClaw..."
openclaw setup

# 8. Instructions for API key
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  IMPORTANT: You need to set your Anthropic API key:"
echo ""
echo "For current session:"
echo "  export ANTHROPIC_API_KEY=\"your-key-here\""
echo ""
echo "To persist across restarts (add to ~/.zshrc):"
echo "  echo 'export ANTHROPIC_API_KEY=\"your-key-here\"' >> ~/.zshrc"
echo "  source ~/.zshrc"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Set your ANTHROPIC_API_KEY (see above)"
echo "  2. Copy agent config: cp -r ~/openclaw/agent-config ~/.openclaw/agents/main/agent"
echo "  3. Create workspace symlink: ln -s ~/openclaw/workspace ~/agent/openclaw-workspace"
echo "  4. Run: openclaw gateway"
echo ""
