import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SkillType, CreateMethod } from '../entities/exam.enums.js';

export class CreateExamDto {
  @ApiProperty({ description: 'Tên đề thi' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Mô tả đề thi' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: SkillType, description: 'Loại kỹ năng' })
  @IsEnum(SkillType)
  skillType: SkillType;

  @ApiProperty({ enum: CreateMethod, description: 'Cách tạo đề' })
  @IsEnum(CreateMethod)
  createMethod: CreateMethod;

  @ApiPropertyOptional({ description: 'Đảo câu hỏi ngẫu nhiên' })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional({ description: 'Thời gian làm bài (phút)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;
}

export class AssignExamDto {
  @ApiProperty({ description: 'ID của lớp học được giao đề thi' })
  @IsString()
  classId: string;

  @ApiPropertyOptional({ description: 'Thời gian làm bài (phút)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Cho phép học sinh xem lại bài' })
  @IsOptional()
  @IsBoolean()
  allowReview?: boolean;

  @ApiPropertyOptional({ description: 'Thời gian mở đề (ISO string)' })
  @IsOptional()
  @IsString() // Hoặc IsDateString
  startTime?: Date;

  @ApiPropertyOptional({ description: 'Thời gian đóng đề (ISO string)' })
  @IsOptional()
  @IsString()
  endTime?: Date;
}
