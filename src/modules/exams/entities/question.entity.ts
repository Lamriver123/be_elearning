import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ExamSection } from './exam-section.entity.js';
import { QuestionOption } from './question-option.entity.js';
import { ExamFile } from './exam-file.entity.js';
import { StudentAnswer } from './student-answer.entity.js';
import { QuestionType } from './exam.enums.js';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ExamSection, (section) => section.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_id' })
  section: ExamSection;

  @Column({ type: 'enum', enum: QuestionType })
  questionType: QuestionType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  explanation: string;

  @Column({ type: 'int', default: 1 })
  points: number;

  @Column({ type: 'int', name: 'order_index', default: 0 })
  orderIndex: number;

  @OneToMany(() => QuestionOption, (option) => option.question)
  options: QuestionOption[];

  @OneToMany(() => ExamFile, (file) => file.question)
  files: ExamFile[];

  @OneToMany(() => StudentAnswer, (answer) => answer.question)
  studentAnswers: StudentAnswer[];
}
