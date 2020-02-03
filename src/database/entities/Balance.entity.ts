import {
  Entity,
  DefaultNamingStrategy,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryColumn,
  BeforeInsert,
} from 'typeorm';

import { User } from './User.entity';
import { Group } from './Group.entity';

@Entity('balance')
@Index(['user', 'group'], { unique: true })
export class Balance extends DefaultNamingStrategy {
  @Column('decimal')
  public amount: number; // DEPRECATED!

  @Column('text', { name: 'amount_precise', nullable: true })
  public amountPrecise?: string;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;

  @PrimaryColumn('integer')
  @ManyToOne(
    type => User,
    user => user.balances,
  )
  @JoinColumn({ name: 'user' })
  public user: User;

  @PrimaryColumn('text')
  @ManyToOne(
    type => Group,
    group => group.games,
  )
  @JoinColumn({ name: 'group' })
  public group: Group;

  @BeforeInsert()
  public async beforeInsert(): Promise<void> {
    this.amountPrecise = '0';
  }
}
