import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Question } from './question.entity.js';
import { StudentAnswer } from './student-answer.entity.js';

@Entity('question_options')
export class QuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Question, (question) => question.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ type: 'varchar', length: 50, nullable: true })
  label: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', name: 'is_correct', default: false })
  isCorrect: boolean;

  @Column({ type: 'int', name: 'order_index', default: 0 })
  orderIndex: number;

  @OneToMany(() => StudentAnswer, (answer) => answer.selectedOption)
  studentAnswers: StudentAnswer[];
}
