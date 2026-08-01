import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SkillType } from '../entities/exam.enums.js';

export class CreateSectionDto {
  @ApiProperty({ description: 'Tiêu đề phần thi' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Hướng dẫn làm bài' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ enum: SkillType, description: 'Loại kỹ năng của phần này' })
  @IsOptional()
  @IsEnum(SkillType)
  skillType?: SkillType;

  @ApiPropertyOptional({ description: 'Thứ tự phần thi' })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Điểm mặc định cho mỗi câu trong phần' })
  @IsOptional()
  @IsNumber()
  pointsPerQuestion?: number;
}
