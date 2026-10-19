# TP4 - Sesiones de pago y webhook Stripe

Trabajo práctico de **Programación Avanzada (UADER - FCyT)**. Microservicio HTTP desarrollado con NestJS que crea sesiones de pago de Stripe Checkout y recibe el webhook con el que Stripe confirma el cobro.

## Requisitos

- Node.js y npm.
- Una cuenta de Stripe en modo test.
- Stripe CLI para probar el webhook localmente.

## Instalación

```bash
npm install
cp .env.template .env
```

Completar `.env` con las credenciales de prueba. El archivo `.env` está ignorado por Git y no debe versionarse.

```env
PORT=3003
STRIPE_SECRET=sk_test_...
STRIPE_SUCCESS_URL=http://localhost:3003/payments/success
STRIPE_CANCEL_UR=http://localhost:3003/payments/cancel
STRIPE_ENDPOINT_SECRET=whsec_...
```

> La variable `STRIPE_CANCEL_UR` conserva el nombre utilizado en el template de la consigna. La validación también admite `STRIPE_CANCEL_URL`.

## Ejecutar

```bash
npm run start:dev
```

El servicio queda disponible en `http://localhost:3003`.

## 1. Crear una sesión de pago

### `POST /payments/create-payment-session`

Ejemplo:

```bash
curl -X POST http://localhost:3003/payments/create-payment-session \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ord-1",
    "currency": "usd",
    "items": [
      { "name": "Producto", "price": 20, "quantity": 1 }
    ]
  }'
```

Respuesta esperada:

```json
{
  "id": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/..."
}
```

La sesión se crea con `mode: payment`. El precio se convierte a centavos y `orderId` se envía en `payment_intent_data.metadata`.

La aplicación usa un `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`, por lo que cuerpos inválidos, precios no positivos o campos extra responden `400`.

## 2. Webhook de Stripe

### `POST /payments/webhook`

Para probarlo localmente:

```bash
stripe listen --forward-to localhost:3003/payments/webhook
```

Copiar el `whsec_...` que muestra Stripe CLI en `STRIPE_ENDPOINT_SECRET` y reiniciar el servicio si fuera necesario.

La aplicación arranca NestJS con `rawBody: true` y verifica el header `stripe-signature` usando `stripe.webhooks.constructEvent(...)`.

- Firma inválida o ausente: `400` y el evento no se procesa.
- `charge.succeeded`: registra en consola el `orderId` asociado al pago y responde `200`.
- Otros eventos: se registran como no manejados y se responde `200`.

## Rutas de redirección

```text
GET /payments/success
GET /payments/cancel
```

Respuestas:

```json
{ "ok": true, "message": "Payment successful" }
```

```json
{ "ok": false, "message": "Payment cancelled" }
```

## Estructura

```text
src/
├── config/
│   └── validate-env.ts
├── payments/
│   ├── dto/
│   │   └── create-payment-session.dto.ts
│   ├── payments.controller.ts
│   ├── payments.module.ts
│   └── payments.service.ts
├── app.module.ts
└── main.ts
```

## Verificación rápida

```bash
npm run build
npm run lint
```

El proyecto implementa el contrato solicitado: creación de Checkout Session, DTO validado, configuración fail-fast, URLs desde variables de entorno, `rawBody`, validación de firma del webhook y procesamiento de `charge.succeeded`.
