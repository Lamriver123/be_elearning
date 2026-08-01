import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Exam } from './exam.entity.js';
import { Class } from '../../classes/entities/class.entity.js';
import { StudentAnswer } from './student-answer.entity.js';

@Entity('exam_classes')
export class ExamClass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exam, (exam) => exam.examClasses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ type: 'int', name: 'duration_minutes', nullable: true })
  durationMinutes: number;

  @Column({ type: 'boolean', name: 'allow_review', default: true })
  allowReview: boolean;

  @Column({ type: 'timestamp', name: 'start_time', nullable: true })
  startTime: Date;

  @Column({ type: 'timestamp', name: 'end_time', nullable: true })
  endTime: Date;

  @OneToMany(() => StudentAnswer, (answer) => answer.examClass)
  studentAnswers: StudentAnswer[];
}
