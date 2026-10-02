import ZAI from 'z-ai-web-dev-sdk'
import zaiConfig from '@/data/zai-config.json'

let zaiInstance: ZAI | null = null

/**
 * Инициализация Z.AI SDK.
 * Для Edge runtime: создаёт экземпляр через конструктор (без fs).
 * Для Node.js runtime: сначала пытается записать .z-ai-config, затем ZAI.create().
 */
export async function getZai() {
  if (zaiInstance) return zaiInstance

  // Пробуем через конструктор напрямую (работает везде, включая Edge)
  try {
    zaiInstance = new ZAI(zaiConfig as any)
    return zaiInstance
  } catch {
    // Если конструктор не сработал — пробуем через create() (Node.js only)
    if (typeof window === 'undefined') {
      try {
        const fs = await import('fs/promises')
        const os = await import('os')
        const path = await import('path')

        const configStr = JSON.stringify(zaiConfig)
        const paths = [
          '/tmp/.z-ai-config',
          path.join(os.tmpdir(), '.z-ai-config'),
          path.join(process.cwd(), '.z-ai-config'),
          path.join(os.homedir(), '.z-ai-config'),
        ]

        for (const p of paths) {
          try {
            await fs.writeFile(p, configStr)
          } catch {}
        }

        zaiInstance = await ZAI.create()
        return zaiInstance
      } catch {
        // Последний фолбэк
        zaiInstance = new ZAI(zaiConfig as any)
        return zaiInstance
      }
    }
  }

  throw new Error('Не удалось инициализировать Z.AI SDK')
}
