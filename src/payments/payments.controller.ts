import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payment-session')
  createPaymentSession(@Body() dto: CreatePaymentSessionDto) {
    return this.paymentsService.createPaymentSession(dto);
  }

  @Post('webhook')
  @HttpCode(200)
  handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!request.rawBody) {
      throw new BadRequestException('Missing raw request body');
    }

    return this.paymentsService.handleWebhook(request.rawBody, signature);
  }

  @Get('success')
  success() {
    return { ok: true, message: 'Payment successful' };
  }

  @Get('cancel')
  cancel() {
    return { ok: false, message: 'Payment cancelled' };
  }
}
