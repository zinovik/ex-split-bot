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

import { Game } from './Game.entity';
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
    type => Game,
    game => game.playUsers,
    { nullable: true },
  )
  public playGames: Game[];

  @OneToMany(
    type => Game,
    game => game.payBy,
    { nullable: true },
  )
  public payGames: Game[];

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;

  @OneToMany(
    type => Game,
    game => game.createdBy,
    { nullable: true },
  )
  public createdGames: Game[];

  @OneToMany(
    type => Balance,
    balance => balance.user,
    { nullable: true },
  )
  public balances: Balance[];
}
