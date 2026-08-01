import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { ClassesService } from './classes.service.js';
import { CreateClassDto } from './dto/create-class.dto.js';
import { UpdateClassDto } from './dto/update-class.dto.js';
import { ApproveMemberDto } from './dto/approve-member.dto.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../users/entities/user.entity.js';
import type { AuthenticatedRequest } from '../../common/types/request.types.js';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Classes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(Role.TEACHER)
  @UseInterceptors(FileInterceptor('poster'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Tạo lớp học (Chỉ Teacher)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tên lớp' },
        description: { type: 'string', description: 'Mô tả' },
        poster: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh đại diện lớp (tùy chọn)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Tạo lớp thành công' })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createClassDto: CreateClassDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|webp)$/,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024, // 5MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    posterFile?: Express.Multer.File,
  ) {
    return this.classesService.createClass(req.user.id, createClassDto, posterFile);
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  @UseInterceptors(FileInterceptor('poster'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Sửa thông tin lớp học (Chỉ Teacher chủ nhiệm)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tên lớp' },
        description: { type: 'string', description: 'Mô tả' },
        poster: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh đại diện lớp mới (tùy chọn)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Cập nhật lớp thành công' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|webp)$/,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    posterFile?: Express.Multer.File,
  ) {
    return this.classesService.updateClass(req.user.id, id, updateClassDto, posterFile);
  }

  @Delete(':id')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Xóa lớp học (Chỉ Teacher chủ nhiệm)' })
  @ApiResponse({ status: 200, description: 'Xóa lớp thành công' })
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.classesService.deleteClass(req.user.id, id);
  }

  @Get('invite/:inviteCode/preview')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Xem trước thông tin lớp học bằng mã mời (Chỉ Student)' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin cơ bản của lớp học' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lớp học' })
  previewClassByInviteCode(@Param('inviteCode') inviteCode: string) {
    return this.classesService.previewClassByInviteCode(inviteCode);
  }

  @Post('join/:inviteCode')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Xin tham gia lớp học bằng mã (Chỉ Student)' })
  @ApiResponse({ status: 201, description: 'Gửi yêu cầu thành công, chờ duyệt' })
  @ApiResponse({ status: 409, description: 'Đã tham gia hoặc đang chờ duyệt' })
  joinClass(@Req() req: AuthenticatedRequest, @Param('inviteCode') inviteCode: string) {
    return this.classesService.joinClass(req.user.id, inviteCode);
  }

  @Patch(':classId/members/:studentId/approve')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Duyệt/từ chối học sinh tham gia lớp (Chỉ Teacher chủ nhiệm)' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật trạng thái học sinh' })
  approveMember(
    @Req() req: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
    @Body() approveMemberDto: ApproveMemberDto,
  ) {
    return this.classesService.approveMember(
      req.user.id,
      classId,
      studentId,
      approveMemberDto,
    );
  }

  @Delete(':classId/members/:studentId')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Đuổi học sinh khỏi lớp (Chỉ Teacher chủ nhiệm)' })
  @ApiResponse({ status: 200, description: 'Đã xóa học sinh khỏi lớp' })
  kickMember(
    @Req() req: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.classesService.kickMember(req.user.id, classId, studentId);
  }

  @Post(':classId/invite')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Mời học sinh tham gia lớp bằng email (Chỉ Teacher chủ nhiệm)' })
  @ApiResponse({ status: 201, description: 'Đã gửi lời mời tham gia lớp tới học sinh' })
  inviteMember(
    @Req() req: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Body() inviteMemberDto: InviteMemberDto,
  ) {
    return this.classesService.inviteMember(req.user.id, classId, inviteMemberDto);
  }

  @Post(':classId/accept-invite')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Học sinh xác nhận lời mời tham gia lớp' })
  @ApiResponse({ status: 201, description: 'Tham gia lớp thành công' })
  acceptInvite(@Req() req: AuthenticatedRequest, @Param('classId') classId: string) {
    return this.classesService.acceptInvite(req.user.id, classId);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách lớp học của tôi' })
  @ApiResponse({ status: 200, description: 'Danh sách lớp học' })
  getMyClasses(@Req() req: AuthenticatedRequest) {
    return this.classesService.getClassesByRole(req.user.id, req.user.role);
  }

  @Get(':classId/members')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Lấy danh sách thành viên trong lớp (Chỉ Teacher)' })
  @ApiResponse({ status: 200, description: 'Danh sách thành viên' })
  getClassMembers(
    @Req() req: AuthenticatedRequest,
    @Param('classId') classId: string,
  ) {
    return this.classesService.getClassMembers(req.user.id, classId);
  }
}
