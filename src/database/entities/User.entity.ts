import { Entity, Unique, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';

import { Game } from './Game.entity';

@Entity('user')
@Unique(['id'])
export class User {
  @PrimaryColumn('integer')
  public id: number;

  @Column('text', { name: 'first_name', nullable: true })
  public firstName?: string;

  @Column('text', { name: 'last_name', nullable: true })
  public lastName?: string;

  @Column('text')
  public username: string;

  @Column('decimal', { nullable: true })
  public balance?: number;

  @ManyToMany(
    type => Game,
    game => game.playUsers,
  )
  public playGames: Game[];

  @ManyToMany(
    type => Game,
    game => game.skipUsers,
  )
  public skipGames: Game[];

  @ManyToMany(
    type => Game,
    game => game.payUsers,
  )
  public payGames: Game[];

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;

  @OneToMany(
    type => Game,
    game => game.createdBy,
  )
  public createdGames: Game[];
}
