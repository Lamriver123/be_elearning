import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GradeItemDto {
  @IsString()
  answerId: string;

  @IsNumber()
  score: number;

  @IsOptional()
  @IsString()
  teacherComment?: string;
}

export class GradeAnswerDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeItemDto)
  grades: GradeItemDto[];
}
