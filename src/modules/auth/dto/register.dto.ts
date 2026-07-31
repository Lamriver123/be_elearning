import {
  IsNotEmpty,
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, Role } from '../../users/entities/user.entity.js';

export class RegisterDto {
  @ApiProperty({
    description: 'Tên đăng nhập (tối thiểu 3 ký tự, duy nhất)',
    example: 'student01',
    minLength: 3,
  })
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @IsString()
  @MinLength(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
  userName: string;

  @ApiProperty({
    description: 'Họ và tên đầy đủ',
    example: 'Nguyễn Văn A',
  })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  fullName: string;

  @ApiProperty({
    description: 'Mật khẩu (tối thiểu 6 ký tự)',
    example: 'matkhau123',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({
    description: 'Địa chỉ email (dùng để đăng nhập và nhận OTP)',
    example: 'nguyenvana@gmail.com',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại liên hệ',
    example: '0901234567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Ngày sinh (định dạng YYYY-MM-DD)',
    example: '2000-01-15',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ (YYYY-MM-DD)' })
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Giới tính',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsOptional()
  @IsEnum(Gender, { message: 'Giới tính phải là MALE, FEMALE hoặc OTHER' })
  gender?: Gender;

  @ApiPropertyOptional({
    description: 'Địa chỉ',
    example: 'Quận 1, TP. Hồ Chí Minh',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Vai trò người dùng',
    enum: Role,
    example: Role.STUDENT,
  })
  @IsNotEmpty({ message: 'Vai trò không được để trống' })
  @IsEnum(Role, { message: 'Vai trò phải là TEACHER hoặc STUDENT' })
  role: Role;
}
