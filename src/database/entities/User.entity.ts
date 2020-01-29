import {
  Entity,
  DefaultNamingStrategy,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
} from 'typeorm';

import { Expense } from './Expense.entity';
import { Balance } from './Balance.entity';

@Entity('user')
export class User extends DefaultNamingStrategy {
  @PrimaryColumn('integer')
  public id: number;

  @Column('text', { name: 'first_name', nullable: true })
  public firstName?: string;

  @Column('text', { name: 'last_name', nullable: true })
  public lastName?: string;

  @Column('text', { nullable: true })
  public username?: string;

  @ManyToMany(
    type => Expense,
    expense => expense.playUsers,
    { nullable: true },
  )
  public playGames: Expense[];

  @OneToMany(
    type => Expense,
    expense => expense.payBy,
    { nullable: true },
  )
  public payGames: Expense[];

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;

  @OneToMany(
    type => Expense,
    expense => expense.createdBy,
    { nullable: true },
  )
  public createdGames: Expense[];

  @OneToMany(
    type => Balance,
    balance => balance.user,
    { nullable: true },
  )
  public balances: Balance[];
}
