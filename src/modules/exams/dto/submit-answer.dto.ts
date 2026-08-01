import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerItemDto {
  @IsString()
  questionId: string;

  @IsOptional()
  @IsString()
  selectedOptionId?: string; // Cho trắc nghiệm

  @IsOptional()
  @IsString()
  textAnswer?: string; // Cho tự luận / điền khuyết

  @IsOptional()
  @IsString()
  audioUrl?: string; // Cho phần nói
}

export class SubmitAnswerDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];
}
