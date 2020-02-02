import {
  Entity,
  DefaultNamingStrategy,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

import { Expense } from './Expense.entity';
import { Balance } from './Balance.entity';

@Entity('group')
export class Group extends DefaultNamingStrategy {
  @PrimaryColumn('text')
  public id: string; //

  @Column('text', { nullable: true })
  public username?: string;

  @Column('text', { name: 'default_expense', nullable: true })
  public defaultExpense?: string;

  @Column('decimal', { name: 'default_price', nullable: true })
  public defaultPrice?: number;

  @Column('text', { name: 'default_action', nullable: true })
  public defaultAction?: string;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;

  @OneToMany(
    type => Expense,
    expense => expense.group,
    { nullable: true },
  )
  public games: Expense[];

  @OneToMany(
    type => Balance,
    balances => balances.group,
    { nullable: true },
  )
  public balances: Balance[];
}
