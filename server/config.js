import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_ENV = path.resolve(__dirname, '..', '.env')

let loaded = false

export function loadServerEnv() {
  if (!loaded) {
    dotenv.config({ path: ROOT_ENV })
    loaded = true
  }

  const deviceId =
    process.env.MYSQL_DEVICE_ID?.trim() ||
    process.env.VITE_TB_DEVICE_ID?.trim() ||
    'local-device'

  return {
    port: Number(process.env.API_PORT || 3001),
    mysql: {
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD ?? '',
      database: process.env.MYSQL_DATABASE || 'ultrasonic_iot',
    },
    deviceId,
  }
}
