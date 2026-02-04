import crypto from 'node:crypto';

/**
 * OpenClaw session adapter.
 *
 * In production (inside an OpenClaw agent runtime), implement these functions
 * by calling the tool surface:
 *   - sessions_spawn({ label, ... })
 *   - sessions_send({ sessionId, message })
 *
 * This repository starter code runs as plain Node, so we ship a stub provider.
 */

export function createOpenClawProvider(config = {}) {
  const provider = config.provider || 'stub';

  if (provider === 'stub') return createStubProvider();

  // Placeholder for future implementations.
  // - provider === 'gateway': call OpenClaw Gateway HTTP API
  // - provider === 'cli': call `openclaw ...` if a sessions subcommand exists
  throw new Error(
    `OpenClaw provider '${provider}' not implemented. Set config.openclaw.provider='stub' or implement a real provider in src/openclaw.js.`
  );
}

function createStubProvider() {
  return {
    name: 'stub',

    async spawnSession({ label, role }) {
      return {
        sessionId: `stub_sess_${crypto.randomUUID()}`,
        label,
        role
      };
    },

    async sendMessage({ sessionId, message }) {
      return {
        sessionId,
        echoed: message
      };
    }
  };
}
