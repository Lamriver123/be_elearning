import { IsString, IsEnum, IsOptional, IsNumber, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '../entities/exam.enums.js';
import { CreateOptionDto } from './create-option.dto.js';

export class CreateQuestionDto {
  @ApiProperty({ enum: QuestionType, description: 'Loại câu hỏi' })
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @ApiProperty({ description: 'Nội dung câu hỏi' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Giải thích đáp án' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Điểm số của câu hỏi' })
  @IsOptional()
  @IsNumber()
  points?: number;

  @ApiPropertyOptional({ description: 'Thứ tự câu hỏi' })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @ApiPropertyOptional({ type: [CreateOptionDto], description: 'Danh sách các lựa chọn (cho câu trắc nghiệm)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];
}
