import { IsInt, Min, Max } from 'class-validator';

export class AcceptOrderDto {
  @IsInt()
  @Min(5)
  @Max(240)
  etaMinutes: number;
}
