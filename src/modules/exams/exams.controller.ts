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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExamsService } from './exams.service.js';
import { CreateExamDto, AssignExamDto } from './dto/create-exam.dto.js';
import { UpdateExamDto } from './dto/update-exam.dto.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { ConfirmExcelImportDto } from './dto/import-excel.dto.js';
import { SubmitAnswerDto } from './dto/submit-answer.dto.js';
import { GradeAnswerDto } from './dto/grade-answer.dto.js';
import { FilePurpose } from './entities/exam.enums.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../users/entities/user.entity.js';
import type { AuthenticatedRequest } from '../../common/types/request.types.js';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Exams')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes/:classId/exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Tạo đề thi mới trong lớp (Chỉ Teacher)' })
  @ApiResponse({ status: 201, description: 'Tạo đề thi thành công' })
  create(
    @Req() req: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Body() createExamDto: CreateExamDto,
  ) {
    return this.examsService.createExam(req.user.id, classId, createExamDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đề thi của lớp' })
  @ApiResponse({ status: 200, description: 'Danh sách đề thi' })
  findAll(@Req() req: AuthenticatedRequest, @Param('classId') classId: string) {
    return this.examsService.getExamsByClass(classId, req.user.role, req.user.id);
  }

  @Get(':examId')
  @ApiOperation({ summary: 'Lấy chi tiết 1 đề thi' })
  @ApiResponse({ status: 200, description: 'Chi tiết đề thi' })
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Param('examId') examId: string,
  ) {
    return this.examsService.getExamDetail(examId, classId, req.user.role);
  }

  @Patch(':examId')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Sửa thông tin đề thi (khi DRAFT) (Chỉ Teacher)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('examId') examId: string,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    return this.examsService.updateExam(req.user.id, examId, updateExamDto);
  }

  @Delete(':examId')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Xóa đề thi (khi DRAFT) (Chỉ Teacher)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  remove(@Req() req: AuthenticatedRequest, @Param('examId') examId: string) {
    return this.examsService.deleteExam(req.user.id, examId);
  }

  @Patch(':examId/publish')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Xuất bản đề thi (DRAFT -> PUBLISHED)' })
  @ApiResponse({ status: 200, description: 'Xuất bản thành công' })
  publish(@Req() req: AuthenticatedRequest, @Param('examId') examId: string) {
    return this.examsService.publishExam(req.user.id, examId);
  }

  @Post(':examId/assign')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Giao đề thi đã có cho lớp khác' })
  @ApiResponse({ status: 201, description: 'Giao đề thành công' })
  assign(
    @Req() req: AuthenticatedRequest,
    @Param('examId') examId: string,
    @Body() assignDto: AssignExamDto,
  ) {
    return this.examsService.assignToClass(req.user.id, examId, assignDto);
  }

  @Post(':examId/sections')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Thêm phần thi (Section) vào đề thi' })
  @ApiResponse({ status: 201, description: 'Thêm phần thi thành công' })
  createSection(
    @Req() req: AuthenticatedRequest,
    @Param('examId') examId: string,
    @Body() createSectionDto: CreateSectionDto,
  ) {
    return this.examsService.addSection(req.user.id, examId, createSectionDto);
  }

  @Post(':examId/sections/:sectionId/questions')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Thêm câu hỏi vào phần thi' })
  @ApiResponse({ status: 201, description: 'Thêm câu hỏi thành công' })
  createQuestion(
    @Req() req: AuthenticatedRequest,
    @Param('sectionId') sectionId: string,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.examsService.addQuestion(req.user.id, sectionId, createQuestionDto);
  }

  @Post(':examId/files')
  @Roles(Role.TEACHER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file cho đề thi' })
  @ApiResponse({ status: 201, description: 'Upload thành công' })
  uploadFile(
    @Req() req: AuthenticatedRequest,
    @Param('examId') examId: string,
    @Body('purpose') purpose: FilePurpose,
    @Body('sectionId') sectionId: string,
    @Body('questionId') questionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.examsService.uploadExamFile(
      req.user.id,
      examId,
      file,
      purpose,
      sectionId,
      questionId,
    );
  }

  @Post(':examId/upload-audio')
  @Roles(Role.STUDENT, Role.TEACHER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file audio (ví dụ cho bài Speaking)' })
  @ApiResponse({ status: 201, description: 'Trả về URL của file đã upload' })
  async uploadAudio(
    @Req() req: AuthenticatedRequest,
    @Param('examId') examId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    // We can reuse examsService but let's just make it upload directly or add a small helper in ExamsService
    // Wait, ExamsService has this.cloudinaryService.uploadFile
    const url = await this.examsService.uploadStudentAudio(examId, file);
    return { url };
  }

  @Post('import/excel/preview')
  @Roles(Role.TEACHER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Preview import đề thi từ Excel' })
  @ApiResponse({ status: 200, description: 'Trả về dữ liệu JSON để review' })
  previewExcel(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.examsService.parseExcelImport(file);
  }

  @Post('import/excel/confirm')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Xác nhận import đề thi từ Excel' })
  @ApiResponse({ status: 201, description: 'Import thành công' })
  confirmExcel(
    @Req() req: AuthenticatedRequest,
    @Body() confirmDto: ConfirmExcelImportDto,
  ) {
    return this.examsService.confirmExcelImport(req.user.id, confirmDto);
  }

  @Post(':examId/submit')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Nộp bài thi' })
  @ApiResponse({ status: 201, description: 'Nộp bài thành công' })
  submitExam(
    @Req() req: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Param('examId') examId: string,
    @Body() submitDto: SubmitAnswerDto,
  ) {
    return this.examsService.submitExam(req.user.id, classId, examId, submitDto);
  }

  @Post(':examId/grade/:studentId')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Chấm điểm bài thi tự luận/nói' })
  @ApiResponse({ status: 200, description: 'Chấm điểm thành công' })
  gradeExam(
    @Req() req: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Param('examId') examId: string,
    @Param('studentId') studentId: string,
    @Body() gradeDto: GradeAnswerDto,
  ) {
    return this.examsService.gradeExam(req.user.id, classId, examId, studentId, gradeDto);
  }

  @Get(':examId/submissions')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Lấy danh sách học sinh đã nộp bài' })
  @ApiResponse({ status: 200, description: 'Danh sách bài nộp' })
  getSubmissions(
    @Req() req: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Param('examId') examId: string,
  ) {
    return this.examsService.getExamSubmissions(classId, examId, req.user.id);
  }

  @Get(':examId/results/:studentId')
  @ApiOperation({ summary: 'Xem kết quả bài thi' })
  @ApiResponse({ status: 200, description: 'Kết quả bài thi' })
  getExamResult(
    @Req() req: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Param('examId') examId: string,
    @Param('studentId') studentId: string,
  ) {
    // Nếu là student thì chỉ được xem của chính mình
    if (req.user.role === Role.STUDENT && req.user.id !== studentId) {
      throw new BadRequestException('Bạn chỉ có thể xem kết quả của chính mình');
    }
    return this.examsService.getExamResult(classId, examId, studentId);
  }
}
