import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateClassDto {
  @ApiPropertyOptional({
    description: 'Tên lớp học',
    example: 'Toán Cao Cấp 2',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Tên lớp không được quá 100 ký tự' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết về lớp học',
    example: 'Lớp học dành cho sinh viên năm hai',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
