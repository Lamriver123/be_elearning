import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSectionDto } from './create-section.dto.js';
import { CreateQuestionDto } from './create-question.dto.js';

export class ParsedQuestionDto extends CreateQuestionDto {
  @IsString()
  sectionTitle: string;
}

export class ConfirmExcelImportDto {
  @IsString()
  examId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSectionDto)
  sections: CreateSectionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParsedQuestionDto)
  questions: ParsedQuestionDto[];
}
