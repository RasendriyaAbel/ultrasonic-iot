# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## ThingsBoard Control

Untuk monitoring realtime, isi token device pada `.env.local`:

```env
VITE_TB_ENABLED=true
VITE_TB_WS_URL=wss://mqtt.thingsboard.cloud:443/mqtt
VITE_TB_TOPIC=v1/devices/me/telemetry
VITE_TB_TOKEN=YOUR_DEVICE_TOKEN
```

Untuk kontrol pompa dari dashboard, isi konfigurasi RPC:

```env
VITE_TB_BASE_URL=https://eu.thingsboard.cloud
VITE_TB_DEVICE_ID=YOUR_DEVICE_UUID
VITE_TB_RPC_METHOD=setPump
VITE_TB_RPC_CALL_TYPE=oneway
VITE_TB_API_KEY=YOUR_API_KEY
```

Atau gunakan login user ThingsBoard:

```env
VITE_TB_USERNAME=your-user@example.com
VITE_TB_PASSWORD=your-password
```

Dashboard akan mengirim payload RPC seperti berikut:

```json
{
  "method": "setPump",
  "params": {
    "status": "ON",
    "mode": "MANUAL",
    "pumpOn": true,
    "enabled": true,
    "source": "ultrasonic-iot-dashboard"
  }
}
```

ESP32/perangkat harus memproses server-side RPC dari ThingsBoard dan mengirim telemetry balik agar status di dashboard ikut terkonfirmasi.
