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
} from 'typeorm';

import { User } from './User.entity';

@Entity('game')
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

  @ManyToOne(
    type => User,
    user => user.createdGames,
  )
  @JoinColumn({ name: 'created_by' })
  public createdBy: User;
}
