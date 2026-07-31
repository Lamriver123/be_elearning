import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { MemberStatus } from '../entities/class-member.entity.js';

export class ApproveMemberDto {
  @ApiProperty({
    description: 'Trạng thái duyệt',
    enum: [MemberStatus.APPROVED, MemberStatus.REJECTED],
    example: MemberStatus.APPROVED,
  })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsEnum(MemberStatus, {
    message: 'Trạng thái phải là APPROVED hoặc REJECTED',
  })
  status: MemberStatus;
}
