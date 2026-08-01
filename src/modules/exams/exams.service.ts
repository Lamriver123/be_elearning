import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam } from './entities/exam.entity.js';
import { ExamClass } from './entities/exam-class.entity.js';
import { ExamSection } from './entities/exam-section.entity.js';
import { Question } from './entities/question.entity.js';
import { QuestionOption } from './entities/question-option.entity.js';
import { ExamFile } from './entities/exam-file.entity.js';
import { CreateExamDto, AssignExamDto } from './dto/create-exam.dto.js';
import { UpdateExamDto } from './dto/update-exam.dto.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { ExamStatus, FilePurpose, FileType, QuestionType } from './entities/exam.enums.js';
import { EXAM_MESSAGES } from '../../common/constants/messages.constants.js';
import { Role } from '../users/entities/user.entity.js';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service.js';

import { StudentAnswer } from './entities/student-answer.entity.js';
import { SubmitAnswerDto } from './dto/submit-answer.dto.js';
import { GradeAnswerDto } from './dto/grade-answer.dto.js';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    @InjectRepository(ExamClass)
    private examClassRepository: Repository<ExamClass>,
    @InjectRepository(ExamSection)
    private sectionRepository: Repository<ExamSection>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(QuestionOption)
    private optionRepository: Repository<QuestionOption>,
    @InjectRepository(ExamFile)
    private fileRepository: Repository<ExamFile>,
    @InjectRepository(StudentAnswer)
    private studentAnswerRepository: Repository<StudentAnswer>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async createExam(teacherId: string, classId: string, createExamDto: CreateExamDto) {
    const exam = this.examRepository.create({
      ...createExamDto,
      createdBy: { id: teacherId },
    });
    
    const savedExam = await this.examRepository.save(exam);

    const examClass = this.examClassRepository.create({
      exam: { id: savedExam.id },
      class: { id: classId },
      // Mặc định cho phép review, không giới hạn thời gian (null)
      allowReview: true, 
      durationMinutes: createExamDto.durationMinutes,
    });

    await this.examClassRepository.save(examClass);

    return savedExam;
  }

  async assignToClass(teacherId: string, examId: string, assignDto: AssignExamDto) {
    const exam = await this.examRepository.findOne({
      where: { id: examId, createdBy: { id: teacherId } },
    });

    if (!exam) {
      throw new NotFoundException(EXAM_MESSAGES.NOT_FOUND);
    }

    const examClass = this.examClassRepository.create({
      exam: { id: examId },
      class: { id: assignDto.classId },
      durationMinutes: assignDto.durationMinutes,
      allowReview: assignDto.allowReview ?? true,
      startTime: assignDto.startTime,
      endTime: assignDto.endTime,
    });

    await this.examClassRepository.save(examClass);
    return { message: EXAM_MESSAGES.ASSIGN_SUCCESS };
  }

  async updateExam(teacherId: string, examId: string, updateDto: UpdateExamDto) {
    const exam = await this.examRepository.findOne({
      where: { id: examId, createdBy: { id: teacherId } },
    });

    if (!exam) {
      throw new NotFoundException(EXAM_MESSAGES.NOT_FOUND);
    }

    if (exam.status !== ExamStatus.DRAFT) {
      throw new BadRequestException(EXAM_MESSAGES.ONLY_DRAFT_CAN_BE_UPDATED);
    }

    Object.assign(exam, updateDto);
    const updatedExam = await this.examRepository.save(exam);

    if (updateDto.durationMinutes !== undefined) {
      // Find the corresponding examClass
      const examClasses = await this.examClassRepository.find({
        where: { exam: { id: examId } }
      });
      for (const ec of examClasses) {
        ec.durationMinutes = updateDto.durationMinutes;
        await this.examClassRepository.save(ec);
      }
    }

    return updatedExam;
  }

  async deleteExam(teacherId: string, examId: string) {
    const exam = await this.examRepository.findOne({
      where: { id: examId, createdBy: { id: teacherId } },
    });

    if (!exam) {
      throw new NotFoundException(EXAM_MESSAGES.NOT_FOUND);
    }

    if (exam.status !== ExamStatus.DRAFT) {
      throw new BadRequestException(EXAM_MESSAGES.ONLY_DRAFT_CAN_BE_DELETED);
    }

    await this.examRepository.remove(exam);
    return { message: EXAM_MESSAGES.DELETE_SUCCESS };
  }

  async publishExam(teacherId: string, examId: string) {
    const exam = await this.examRepository.findOne({
      where: { id: examId, createdBy: { id: teacherId } },
      relations: {
        sections: {
          questions: true
        }
      }
    });

    if (!exam) {
      throw new NotFoundException(EXAM_MESSAGES.NOT_FOUND);
    }

    if (exam.status === ExamStatus.PUBLISHED) {
      throw new BadRequestException(EXAM_MESSAGES.ALREADY_PUBLISHED);
    }

    let totalPoints = 0;
    if (exam.sections) {
      exam.sections.forEach(sec => {
        if (sec.questions) {
          sec.questions.forEach(q => {
            totalPoints += (q.points || 0);
          });
        }
      });
    }
    exam.totalPoints = totalPoints;
    exam.status = ExamStatus.PUBLISHED;
    
    await this.examRepository.save(exam);
    return { message: EXAM_MESSAGES.PUBLISH_SUCCESS };
  }

  async getExamsByClass(classId: string, role: Role, userId: string) {
    const query = this.examClassRepository.createQueryBuilder('ec')
      .leftJoinAndSelect('ec.exam', 'exam')
      .where('ec.class_id = :classId', { classId })
      .orderBy('exam.created_at', 'DESC');

    if (role === Role.STUDENT) {
      query.andWhere('exam.status = :status', { status: ExamStatus.PUBLISHED });
    }

    const examClasses = await query.getMany();
    
    // If student, check if they have submitted any answers for each exam
    let submittedExamClassIds = new Set<string>();
    if (role === Role.STUDENT && examClasses.length > 0) {
      const examClassIds = examClasses.map(ec => ec.id);
      const studentAnswers = await this.studentAnswerRepository.createQueryBuilder('sa')
        .select('sa.examClass.id', 'examClassId')
        .addSelect('SUM(sa.score)', 'totalScore')
        .where('sa.examClass.id IN (:...examClassIds)', { examClassIds })
        .andWhere('sa.student.id = :userId', { userId })
        .groupBy('sa.examClass.id')
        .getRawMany();
        
      studentAnswers.forEach(ans => {
        // ans has examClassId and totalScore
        submittedExamClassIds.add(ans.examClassId);
      });
    }

    return examClasses.map(ec => ({
      ...ec.exam,
      classSettings: {
        id: ec.id,
        durationMinutes: ec.durationMinutes,
        allowReview: ec.allowReview,
        startTime: ec.startTime,
        endTime: ec.endTime,
      },
      isSubmitted: submittedExamClassIds.has(ec.id)
    }));
  }

  async getExamDetail(examId: string, classId: string, role: Role) {
    const examClass = await this.examClassRepository.findOne({
      where: { exam: { id: examId }, class: { id: classId } },
      relations: {
        exam: {
          sections: {
            questions: {
              options: true
            }
          }
        }
      },
    });

    if (!examClass) {
      throw new NotFoundException(EXAM_MESSAGES.NOT_FOUND_IN_CLASS);
    }

    if (role === Role.STUDENT && examClass.exam.status !== ExamStatus.PUBLISHED) {
      throw new ForbiddenException(EXAM_MESSAGES.NOT_FOUND);
    }

    const examData = examClass.exam;

    // TODO: Ẩn đáp án đúng (isCorrect) đối với học sinh
    if (role === Role.STUDENT) {
      examData.sections.forEach(section => {
        section.questions.forEach(question => {
          question.options.forEach(option => {
            delete (option as any).isCorrect;
          });
        });
      });
    }

    return {
      ...examData,
      classSettings: {
        id: examClass.id,
        durationMinutes: examClass.durationMinutes,
        allowReview: examClass.allowReview,
        startTime: examClass.startTime,
        endTime: examClass.endTime,
      }
    };
  }

  async addSection(teacherId: string, examId: string, createSectionDto: CreateSectionDto) {
    const exam = await this.examRepository.findOne({
      where: { id: examId, createdBy: { id: teacherId } },
    });

    if (!exam) {
      throw new NotFoundException(EXAM_MESSAGES.NOT_FOUND);
    }

    if (exam.status !== ExamStatus.DRAFT) {
      throw new BadRequestException(EXAM_MESSAGES.ONLY_DRAFT_CAN_BE_UPDATED);
    }

    const section = this.sectionRepository.create({
      ...createSectionDto,
      exam: { id: examId },
    });

    return await this.sectionRepository.save(section);
  }

  async addQuestion(teacherId: string, sectionId: string, createQuestionDto: CreateQuestionDto) {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: {
        exam: {
          createdBy: true
        }
      },
    });

    if (!section || section.exam.createdBy.id !== teacherId) {
      throw new NotFoundException('Không tìm thấy phần thi hoặc không có quyền');
    }

    if (section.exam.status !== ExamStatus.DRAFT) {
      throw new BadRequestException(EXAM_MESSAGES.ONLY_DRAFT_CAN_BE_UPDATED);
    }

    const { options, ...questionData } = createQuestionDto;
    
    const question = this.questionRepository.create({
      ...questionData,
      section: { id: sectionId },
    });

    const savedQuestion = await this.questionRepository.save(question);

    if (options && options.length > 0) {
      const questionOptions = options.map(opt => 
        this.optionRepository.create({
          ...opt,
          question: { id: savedQuestion.id },
        })
      );
      await this.optionRepository.save(questionOptions);
    }

    return await this.questionRepository.findOne({
      where: { id: savedQuestion.id },
      relations: {
        options: true
      },
    });
  }

  async uploadStudentAudio(examId: string, file: Express.Multer.File): Promise<string> {
    const uploadResult = await this.cloudinaryService.uploadFile(
      file,
      `e-learning/exams/${examId}/student_audios`,
      'video' // Cloudinary uses 'video' for audio files as well
    );
    return uploadResult.secure_url;
  }

  async uploadExamFile(teacherId: string, examId: string, file: Express.Multer.File, purpose: FilePurpose, sectionId?: string, questionId?: string) {
    const exam = await this.examRepository.findOne({
      where: { id: examId, createdBy: { id: teacherId } },
    });

    if (!exam) {
      throw new NotFoundException(EXAM_MESSAGES.NOT_FOUND);
    }

    // Upload to Cloudinary
    let fileType = FileType.DOCUMENT;
    if (file.mimetype.includes('image')) fileType = FileType.IMAGE;
    else if (file.mimetype.includes('audio')) fileType = FileType.AUDIO;
    else if (file.mimetype.includes('video')) fileType = FileType.VIDEO;
    else if (file.mimetype.includes('pdf')) fileType = FileType.PDF;

    const result = await this.cloudinaryService.uploadFile(file, `e-learning/exams/${examId}`, 'auto');

    const examFile = this.fileRepository.create({
      exam: { id: examId },
      section: sectionId ? { id: sectionId } : undefined,
      question: questionId ? { id: questionId } : undefined,
      fileUrl: result.secure_url,
      fileName: file.originalname,
      fileType,
      purpose,
      fileSize: file.size,
    });

    return await this.fileRepository.save(examFile);
  }

  async parseExcelImport(file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any as ExcelJS.Buffer);

    const worksheet = workbook.worksheets[0]; // Lấy sheet đầu tiên
    const sectionsMap = new Map<string, any>();
    const questions: any[] = [];

    // Giả sử cột: 
    // A: Tên Phần (Section)
    // B: Loại câu hỏi (MULTIPLE_CHOICE, ESSAY...)
    // C: Nội dung câu hỏi
    // D: Điểm
    // E, F, G, H: Option A, B, C, D
    // I: Đáp án đúng (A/B/C/D)
    // J: Giải thích

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Bỏ qua header

      const sectionTitle = row.getCell(1).value?.toString() || 'Phần chung';
      const questionTypeStr = row.getCell(2).value?.toString() || 'MULTIPLE_CHOICE';
      let questionType = QuestionType.MULTIPLE_CHOICE;
      if (Object.values(QuestionType).includes(questionTypeStr as QuestionType)) {
        questionType = questionTypeStr as QuestionType;
      }
      
      const content = row.getCell(3).value?.toString() || '';
      const points = parseInt(row.getCell(4).value?.toString() || '1');

      if (!sectionsMap.has(sectionTitle)) {
        sectionsMap.set(sectionTitle, {
          title: sectionTitle,
          orderIndex: sectionsMap.size,
        });
      }

      const options: any[] = [];
      const correctOptionLetter = row.getCell(9).value?.toString().toUpperCase() || 'A';
      
      const labels = ['A', 'B', 'C', 'D'];
      for (let i = 0; i < 4; i++) {
        const optContent = row.getCell(5 + i).value?.toString();
        if (optContent) {
          options.push({
            label: labels[i],
            content: optContent,
            isCorrect: correctOptionLetter === labels[i],
            orderIndex: i,
          });
        }
      }

      questions.push({
        sectionTitle,
        questionType,
        content,
        points,
        explanation: row.getCell(10).value?.toString() || '',
        orderIndex: questions.length,
        options,
      });
    });

    return {
      sections: Array.from(sectionsMap.values()),
      questions,
    };
  }

  async confirmExcelImport(teacherId: string, confirmDto: any) { // Type as ConfirmExcelImportDto later
    const { examId, sections, questions } = confirmDto;
    
    const exam = await this.examRepository.findOne({
      where: { id: examId, createdBy: { id: teacherId } },
    });

    if (!exam || exam.status !== ExamStatus.DRAFT) {
      throw new BadRequestException('Không tìm thấy đề thi hoặc đề thi không ở trạng thái DRAFT');
    }

    // Save sections mapping
    const savedSectionsMap = new Map<string, string>(); // sectionTitle -> sectionId

    for (const sec of sections) {
      const secData: any = {
        ...sec,
        exam: { id: exam.id },
      };
      const section = this.sectionRepository.create(secData) as any;
      const savedSection = await this.sectionRepository.save(section);
      savedSectionsMap.set(sec.title, savedSection.id);
    }

    // Save questions
    for (const q of questions) {
      const sectionId = savedSectionsMap.get(q.sectionTitle);
      if (!sectionId) continue;

      const { options, sectionTitle, ...questionData } = q;
      const qData: any = {
        ...questionData,
        section: { id: sectionId },
      };
      const question = this.questionRepository.create(qData) as any;
      
      const savedQuestion = await this.questionRepository.save(question);

      if (options && options.length > 0) {
        const questionOptions = options.map((opt: any) => 
          this.optionRepository.create({
            ...opt,
            question: { id: savedQuestion.id },
          })
        );
        await this.optionRepository.save(questionOptions);
      }
    }

    return { message: 'Import từ Excel thành công' };
  }

  async submitExam(studentId: string, classId: string, examId: string, submitDto: SubmitAnswerDto) {
    const examClass = await this.examClassRepository.findOne({
      where: { class: { id: classId }, exam: { id: examId } },
      relations: { exam: true },
    });

    if (!examClass || examClass.exam.status !== ExamStatus.PUBLISHED) {
      throw new NotFoundException('Không tìm thấy bài thi hoặc bài thi chưa mở');
    }

    const examClassId = examClass.id;
    const { answers } = submitDto;
    
    // Xóa các câu trả lời cũ nếu có (cho phép nộp lại hoặc nộp lần đầu tùy logic)
    await this.studentAnswerRepository.delete({
      examClass: { id: examClassId },
      student: { id: studentId }
    });

    const studentAnswersToSave: StudentAnswer[] = [];

    for (const ans of answers) {
      const question = await this.questionRepository.findOne({
        where: { id: ans.questionId },
        relations: { options: true },
      });

      if (!question) continue;

      let score = 0;
      let isAutoGraded = false;

      // Chấm điểm tự động cho trắc nghiệm
      if (question.questionType === QuestionType.MULTIPLE_CHOICE) {
        isAutoGraded = true;
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (correctOption && ans.selectedOptionId === correctOption.id) {
          score = question.points ?? 1;
        }
      }

      const answerData: any = {
        examClass: { id: examClassId },
        question: { id: ans.questionId },
        student: { id: studentId },
        selectedOption: ans.selectedOptionId ? { id: ans.selectedOptionId } : undefined,
        textAnswer: ans.textAnswer,
        fileUrl: ans.audioUrl,
        score,
        isAutoGraded,
        submittedAt: new Date(),
      };

      const ansEntity = this.studentAnswerRepository.create(answerData) as any;
      studentAnswersToSave.push(ansEntity);
    }

    await this.studentAnswerRepository.save(studentAnswersToSave);
    return { message: 'Nộp bài thành công' };
  }

  async gradeExam(teacherId: string, classId: string, examId: string, studentId: string, gradeDto: GradeAnswerDto) {
    const examClass = await this.examClassRepository.findOne({
      where: { 
        class: { id: classId }, 
        exam: { id: examId, createdBy: { id: teacherId } } 
      },
      relations: { exam: { createdBy: true } },
    });

    if (!examClass) {
      throw new ForbiddenException('Không có quyền chấm điểm lớp này');
    }

    const examClassId = examClass.id;
    const { grades } = gradeDto;

    for (const grade of grades) {
      const answer = await this.studentAnswerRepository.findOne({
        where: { id: grade.answerId, examClass: { id: examClassId }, student: { id: studentId } },
      });

      if (answer) {
        answer.score = grade.score;
        if (grade.teacherComment) {
          answer.teacherComment = grade.teacherComment;
        }
        await this.studentAnswerRepository.save(answer);
      }
    }

    return { message: 'Chấm điểm thành công' };
  }

  async getExamSubmissions(classId: string, examId: string, teacherId: string) {
    const examClass = await this.examClassRepository.findOne({
      where: { class: { id: classId }, exam: { id: examId, createdBy: { id: teacherId } } },
    });

    if (!examClass) {
      throw new NotFoundException('Không tìm thấy bài thi trong lớp');
    }

    // Lấy điểm tổng của mỗi học sinh đã nộp
    const submissions = await this.studentAnswerRepository.createQueryBuilder('sa')
      .leftJoinAndSelect('sa.student', 'student')
      .select('student.id', 'studentId')
      .addSelect('student.fullName', 'studentName')
      .addSelect('student.email', 'studentEmail')
      .addSelect('SUM(sa.score)', 'totalScore')
      .addSelect('MAX(sa.submitted_at)', 'submittedAt')
      // Đếm số câu tự luận / nói chưa có nhận xét / chưa chấm điểm (score = 0 và ko phải autoGrade) 
      // Nhưng để đơn giản, ta chỉ trả về danh sách nộp
      .where('sa.examClass.id = :examClassId', { examClassId: examClass.id })
      .groupBy('student.id')
      .addGroupBy('student.fullName')
      .addGroupBy('student.email')
      .getRawMany();

    return submissions;
  }

  async getExamResult(classId: string, examId: string, studentId: string) {
    const examClass = await this.examClassRepository.findOne({
      where: { class: { id: classId }, exam: { id: examId } },
    });

    if (!examClass) {
      throw new NotFoundException('Không tìm thấy bài thi trong lớp');
    }

    const studentAnswers = await this.studentAnswerRepository.find({
      where: { examClass: { id: examClass.id }, student: { id: studentId } },
      relations: { question: true, selectedOption: true },
    });

    const totalScore = studentAnswers.reduce((acc, ans) => acc + (ans.score || 0), 0);

    return {
      totalScore,
      answers: studentAnswers,
    };
  }
}
