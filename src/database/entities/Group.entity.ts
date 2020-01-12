import {
  Entity,
  DefaultNamingStrategy,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

import { Game } from './Game.entity';
import { Balance } from './Balance.entity';

@Entity('group')
export class Group extends DefaultNamingStrategy {
  @PrimaryColumn('text')
  public id: string; //

  @Column('text', { nullable: true })
  public username?: string;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;

  @OneToMany(
    type => Game,
    game => game.group,
    { nullable: true },
  )
  public games: Game[];

  @OneToMany(
    type => Balance,
    balances => balances.group,
    { nullable: true },
  )
  public balances: Balance[];
}
