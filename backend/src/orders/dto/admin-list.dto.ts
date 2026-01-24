import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '../order-status.enum';

export class AdminListOrdersDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
