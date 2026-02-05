import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import { TradeCurrencyDto } from './dto/trade-currency.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VerifiedUserGuard } from '../../common/guards/verified-user.guard';
import { User } from '../user/entities/user.entity';
import { GetUser } from '../../common/decorators/get-current-user.decorator';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get wallet balances' })
  @ApiResponse({ status: 200, description: 'Wallet balances retrieved successfully' })
  async getWalletBalances(@GetUser() user: User) {
    return this.walletService.getWalletBalances(user.id);
  }

  @Post('fund')
  @UseGuards(VerifiedUserGuard)
  @ApiOperation({ summary: 'Fund wallet' })
  @ApiResponse({ status: 201, description: 'Wallet funded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async fundWallet(@GetUser() user: User, @Body() fundWalletDto: FundWalletDto) {
    return this.walletService.fundWallet(user.id, fundWalletDto);
  }

  @Post('convert')
  @UseGuards(VerifiedUserGuard)
  @ApiOperation({ summary: 'Convert currency' })
  @ApiResponse({ status: 201, description: 'Currency converted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async convertCurrency(@GetUser() user: User, @Body() convertDto: ConvertCurrencyDto) {
    return this.walletService.convertCurrency(user.id, convertDto);
  }

  @Post('trade')
  @UseGuards(VerifiedUserGuard)
  @ApiOperation({ summary: 'Trade currency' })
  @ApiResponse({ status: 201, description: 'Currency traded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async tradeCurrency(@GetUser() user: User, @Body() tradeDto: TradeCurrencyDto) {
    return this.walletService.tradeCurrency(user.id, tradeDto);
  }
}
