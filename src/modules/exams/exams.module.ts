import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamsService } from './exams.service.js';
import { ExamsController } from './exams.controller.js';
import { Exam } from './entities/exam.entity.js';
import { ExamClass } from './entities/exam-class.entity.js';
import { ExamSection } from './entities/exam-section.entity.js';
import { Question } from './entities/question.entity.js';
import { QuestionOption } from './entities/question-option.entity.js';
import { ExamFile } from './entities/exam-file.entity.js';
import { StudentAnswer } from './entities/student-answer.entity.js';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      ExamClass,
      ExamSection,
      Question,
      QuestionOption,
      ExamFile,
      StudentAnswer,
    ]),
    CloudinaryModule,
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
