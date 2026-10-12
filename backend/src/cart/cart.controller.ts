import { Controller, Post, Body } from '@nestjs/common';
import { CartService, CartItemDto } from './cart.service';

@Controller('api/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('validate')
  async validateCart(@Body('items') items: CartItemDto[]) {
    return this.cartService.validateAndComputeCart(items || []);
  }
}
