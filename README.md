# Dubai Elite AI Voice Receptionist Landing Page

Single-section React + Tailwind landing page for the Dubai Elite Investments L.L.C By Al Maktoum AI voice receptionist demo.

## Setup

Install dependencies:

```bash
npm install
```

Create a local `.env` file using the public Vapi browser credentials:

```bash
VITE_VAPI_PUBLIC_KEY=VAPI_PUBLIC_KEY_HERE
VITE_VAPI_ASSISTANT_ID=VAPI_ASSISTANT_ID_HERE
```

Only use the Vapi public key in frontend code. Never put a private/server Vapi API key in `VITE_` variables.

## Run

```bash
npm run dev
```

Open the local Vite URL shown in the terminal.

## Build

```bash
npm run build
```

## Vapi Greeting

The app sends the receptionist greeting with `vapi.say()` after the call starts. For production reliability, also configure the same text as the assistant's first message/greeting in the Vapi dashboard:

```text
Welcome to Dubai Elite Investments L.L.C By Al Maktoum. This is your AI voice receptionist. I can help route inquiries about investment opportunities, strategic partnerships, and concierge introductions.
```
