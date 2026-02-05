import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { GetTransactionsDto } from './dto/get-transactions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VerifiedUserGuard } from '../../common/guards/verified-user.guard';
import { User } from '../user/entities/user.entity';
import { GetUser } from '../../common/decorators/get-current-user.decorator';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @Get()
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getTransactions(@GetUser() user: User, @Query() query: GetTransactionsDto) {
    return this.transactionService.getTransactions(user.id, query);
  }
}
