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

Configure the receptionist introduction as the assistant's first message/greeting in the Vapi dashboard. The frontend does not call `vapi.say()` on start, so the assistant introduces itself from dashboard configuration and then waits for the visitor to speak.

```text
Welcome to Dubai Elite Investments L.L.C By Al Maktoum. This is your AI voice receptionist. I can help route inquiries about investment opportunities, strategic partnerships, and concierge introductions.
```
