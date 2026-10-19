import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';

interface PurchaseRecord {
  orderId: string;
  chargeId: string;
  amount: number | null;
  currency: string | null;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;
  private readonly endpointSecret: string;
  private readonly successUrl: string;
  private readonly cancelUrl: string;
  private readonly purchases: PurchaseRecord[] = [];

  constructor(private readonly configService: ConfigService) {
    this.stripe = new Stripe(this.configService.getOrThrow<string>('STRIPE_SECRET'));
    this.endpointSecret = this.configService.getOrThrow<string>('STRIPE_ENDPOINT_SECRET');
    this.successUrl = this.configService.getOrThrow<string>('STRIPE_SUCCESS_URL');
    this.cancelUrl = this.configService.getOrThrow<string>('STRIPE_CANCEL_URL');
  }

  async createPaymentSession(dto: CreatePaymentSessionDto) {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: this.successUrl,
      cancel_url: this.cancelUrl,
      line_items: dto.items.map((item) => ({
        price_data: {
          currency: dto.currency,
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      payment_intent_data: {
        metadata: {
          orderId: dto.orderId,
        },
      },
    });

    return {
      id: session.id,
      url: session.url,
    };
  }

  handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.endpointSecret,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid Stripe signature';
      this.logger.warn(`Invalid webhook signature: ${message}`);
      throw new BadRequestException(`Webhook Error: ${message}`);
    }

    if (event.type === 'charge.succeeded') {
      const charge = event.data.object as Stripe.Charge;
      const orderId = charge.metadata?.orderId;

      this.purchases.push({
        orderId: orderId ?? 'unknown',
        chargeId: charge.id,
        amount: charge.amount,
        currency: charge.currency,
      });

      this.logger.log(
        `Payment confirmed. orderId=${orderId ?? 'unknown'} chargeId=${charge.id}`,
      );
    } else {
      this.logger.log(`Unhandled Stripe event: ${event.type}`);
    }

    return { received: true };
  }
}
