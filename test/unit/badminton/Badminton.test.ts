import 'babel-polyfill';

import { IMock, Mock, Times } from 'typemoq';

import { Badminton } from '../../../src/badminton/Badminton';
import { IConfigurationService } from '../../../src/configuration/IConfigurationService.interface';
import { IDatabaseService } from '../../../src/database/IDatabaseService.interface';
import { ITelegramService } from '../../../src/telegram/ITelegramService.interface';
import { IMessageService } from '../../../src/message/IMessageService.interface';

import { IMessageBody } from '../../../src/common/model/IMessageBody.interface';
import { IReplyMarkup } from '../../../src/common/model/IReplyMarkup.interface';
import { User } from '../../../src/database/entities/User.entity';
import { Game } from '../../../src/database/entities/Game.entity';

describe('Scheduler', () => {
  let configurationServiceMock: IMock<IConfigurationService>;
  let databaseServiceMock: IMock<IDatabaseService>;
  let telegramServiceMock: IMock<ITelegramService>;
  let messageServiceMock: IMock<IMessageService>;

  let badminton: Badminton;

  beforeEach(() => {
    configurationServiceMock = Mock.ofType<IConfigurationService>();
    databaseServiceMock = Mock.ofType<IDatabaseService>();
    telegramServiceMock = Mock.ofType<ITelegramService>();
    messageServiceMock = Mock.ofType<IMessageService>();

    badminton = new Badminton(
      configurationServiceMock.object,
      databaseServiceMock.object,
      telegramServiceMock.object,
      messageServiceMock.object,
    );
  });

  afterEach(() => {
    configurationServiceMock.verifyAll();
    databaseServiceMock.verifyAll();
    telegramServiceMock.verifyAll();
    messageServiceMock.verifyAll();
  });

  it('Should process message to create new game', async () => {
    // Arrange
    const chatUsername = 'test-chat-username';
    const gameCost = 9;
    const adminIds = [111];
    const gameId = 11;
    const initialUser = {
      id: 987,
      firstName: 'test-first-name',
      lastName: 'test-last-name',
      username: 'test-username',
    };
    const userMarkdown = 'test-user-markdown';
    const replyMarkup = 'test-reply-markup';
    const messageBody: IMessageBody = {
      update_id: 0,
      message: {
        message_id: 0,
        from: {
          id: initialUser.id,
          is_bot: false,
          first_name: initialUser.firstName,
          last_name: initialUser.lastName,
          username: initialUser.username,
          language_code: 'en',
        },
        chat: {
          id: 0,
          username: chatUsername,
          title: '',
          type: '',
        },
        date: 0,
        text: 'game',
      },
    };
    const user = new User();
    user.id = initialUser.id;
    user.firstName = initialUser.firstName;
    user.lastName = initialUser.lastName;
    user.username = initialUser.username;
    const gameMessageText = 'test-telegram-message-text';
    configurationServiceMockgGetConfiguration({ chatUsername, gameCost, adminIds });
    databaseServiceMockUpsertUser(user);
    databaseServiceMockCreateGame(gameCost, user, gameId);
    messageServiceMockGetUserMarkDown(user, userMarkdown);
    messageServiceMockGetGameMessageText(
      {
        gameId,
        createdByUserMarkdown: userMarkdown,
        playUsers: [user],
        payByUserMarkdown: userMarkdown,
        isFree: false,
        gameBalances: [{ userMarkdown, gameBalance: 0 }],
      },
      gameMessageText,
    );
    messageServiceMockGetReplyMarkup(replyMarkup);
    telegramServiceMockSendMessage({
      replyMarkup: JSON.stringify(replyMarkup),
      text: gameMessageText,
      chatUsername: `@${chatUsername}`,
    });
    databaseServiceMockCloseConnection();

    // Act
    await badminton.processMessage(JSON.stringify(messageBody));

    // Assert
    expect(true).toBeTruthy();
  });

  function configurationServiceMockgGetConfiguration({
    chatUsername,
    gameCost,
    adminIds,
  }: {
    chatUsername: string;
    gameCost: number;
    adminIds: number[];
  }): void {
    configurationServiceMock
      .setup((x: IConfigurationService) => x.getConfiguration())
      .returns(() => ({ chatUsername, gameCost, adminIds }))
      .verifiable(Times.exactly(2));
  }

  function databaseServiceMockUpsertUser(user: User): void {
    databaseServiceMock
      .setup((x: IDatabaseService) => x.upsertUser(user))
      .returns(async () => undefined)
      .verifiable(Times.once());
  }

  function databaseServiceMockCreateGame(gameCost: number, user: User, gameId: number): void {
    databaseServiceMock
      .setup((x: IDatabaseService) => x.createGame(gameCost, user))
      .returns(async () => ({ id: gameId, playUsers: [user], createdBy: user, payBy: user, isFree: false } as Game))
      .verifiable(Times.once());
  }

  function messageServiceMockGetUserMarkDown(user: User, userMarkdown: string): void {
    messageServiceMock
      .setup((x: IMessageService) => x.getUserMarkdown(user))
      .returns(() => userMarkdown)
      .verifiable(Times.exactly(3));
  }

  function messageServiceMockGetGameMessageText(
    parameters: {
      gameId: number;
      createdByUserMarkdown: string;
      playUsers: User[];
      payByUserMarkdown: string;
      isFree: boolean;
      gameBalances: { userMarkdown: string; gameBalance: number }[];
    },
    gameMessageText: string,
  ): void {
    messageServiceMock
      .setup((x: IMessageService) => x.getGameMessageText(parameters))
      .returns(() => gameMessageText)
      .verifiable(Times.once());
  }

  function messageServiceMockGetReplyMarkup(replyMarkup: string): void {
    messageServiceMock
      .setup((x: IMessageService) => x.getReplyMarkup())
      .returns(() => (replyMarkup as unknown) as IReplyMarkup)
      .verifiable(Times.once());
  }

  function telegramServiceMockSendMessage({
    text,
    replyMarkup,
    chatUsername,
  }: {
    text: string;
    replyMarkup: string;
    chatUsername: string;
  }): void {
    telegramServiceMock
      .setup((x: ITelegramService) => x.sendMessage({ text, replyMarkup, chatId: chatUsername }))
      .returns(async () => undefined)
      .verifiable(Times.once());
  }

  function databaseServiceMockCloseConnection(): void {
    databaseServiceMock
      .setup((x: IDatabaseService) => x.closeConnection())
      .returns(async () => undefined)
      .verifiable(Times.once());
  }
});
