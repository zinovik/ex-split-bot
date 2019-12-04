import {
  Entity,
  Unique,
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
@Unique(['id'])
export class Game {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column('decimal')
  public price: number;

  @ManyToMany(
    type => User,
    user => user.playGames,
  )
  @JoinTable({ name: 'play' })
  public playUsers: User[];

  @ManyToMany(
    type => User,
    user => user.skipGames,
  )
  @JoinTable({ name: 'skip' })
  public skipUsers: User[];

  @ManyToMany(
    type => User,
    user => user.payGames,
  )
  @JoinTable({ name: 'pay' })
  public payUsers: User[];

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
