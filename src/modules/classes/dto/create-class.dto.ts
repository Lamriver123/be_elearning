import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClassDto {
  @ApiProperty({
    description: 'Tên lớp học',
    example: 'Toán Cao Cấp 1',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Tên lớp không được để trống' })
  @IsString()
  @MaxLength(100, { message: 'Tên lớp không được quá 100 ký tự' })
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết về lớp học',
    example: 'Lớp học dành cho sinh viên năm nhất',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
