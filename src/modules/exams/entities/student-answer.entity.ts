import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExamClass } from './exam-class.entity.js';
import { Question } from './question.entity.js';
import { QuestionOption } from './question-option.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('student_answers')
export class StudentAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ExamClass, (examClass) => examClass.studentAnswers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_class_id' })
  examClass: ExamClass;

  @ManyToOne(() => Question, (question) => question.studentAnswers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => QuestionOption, (option) => option.studentAnswers, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'selected_option_id' })
  selectedOption: QuestionOption;

  @Column({ type: 'text', name: 'text_answer', nullable: true })
  textAnswer: string;

  @Column({ type: 'varchar', name: 'file_url', length: 1024, nullable: true })
  fileUrl: string;

  @Column({ type: 'float', nullable: true })
  score: number;

  @Column({ type: 'text', name: 'teacher_comment', nullable: true })
  teacherComment: string;

  @Column({ type: 'boolean', name: 'is_auto_graded', default: false })
  isAutoGraded: boolean;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;
}
