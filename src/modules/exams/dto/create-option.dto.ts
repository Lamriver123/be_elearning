import { IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOptionDto {
  @ApiPropertyOptional({ description: 'Nhãn (A, B, C, D...)' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ description: 'Nội dung lựa chọn' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Là đáp án đúng' })
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @ApiPropertyOptional({ description: 'Thứ tự lựa chọn' })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}
