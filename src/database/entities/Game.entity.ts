import {
  Entity,
  DefaultNamingStrategy,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { User } from './User.entity';
import { Group } from './Group.entity';

@Entity('game')
@Index(['group', 'messageId'], { unique: true })
export class Game extends DefaultNamingStrategy {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column('decimal')
  public price: number;

  @ManyToMany(
    type => User,
    user => user.playGames,
    { nullable: true },
  )
  @JoinTable({ name: 'play' })
  public playUsers: User[];

  @ManyToOne(
    type => User,
    user => user.createdGames,
    { nullable: true },
  )
  @JoinColumn({ name: 'pay_by' })
  public payBy: User | null;

  @Column('boolean', { name: 'is_free' })
  public isFree: boolean;

  @Column('boolean', { name: 'is_done' })
  public isDone: boolean;

  @Column('boolean', { name: 'is_deleted' })
  public isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;

  @Column('integer', { name: 'message_id' })
  public messageId: number;

  @Column('text', { nullable: true })
  public expense?: string;

  @ManyToOne(
    type => User,
    user => user.createdGames,
  )
  @JoinColumn({ name: 'created_by' })
  public createdBy: User;

  @ManyToOne(
    type => Group,
    group => group.games,
  )
  @JoinColumn({ name: 'group' })
  public group: Group;
}
