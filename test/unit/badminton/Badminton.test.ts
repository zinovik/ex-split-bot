import { IMock, Mock, Times } from 'typemoq';

import { Badminton } from '../../../src/badminton/Badminton';
import { IConfigurationService } from '../../../src/configuration/IConfigurationService.interface';
import { IDatabaseService } from '../../../src/database/IDatabaseService.interface';
import { ITelegramService } from '../../../src/telegram/ITelegramService.interface';
import { IMessageService } from '../../../src/message/IMessageService.interface';

import { IMessageBody } from '../../../src/common/model/IMessageBody.interface';
import { IReplyMarkup } from '../../../src/common/model/IReplyMarkup.interface';

describe('Badminton', () => {
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
    const user = {
      id: 987,
      firstName: 'test-first-name',
      lastName: 'test-last-name',
      username: 'test-username',
    };
    const balance = 999;
    const userMarkdown = 'test-user-markdown';
    const replyMarkup = 'test-reply-markup';
    const messageBody: IMessageBody = {
      update_id: 0,
      message: {
        message_id: 0,
        from: {
          id: user.id,
          is_bot: false,
          first_name: user.firstName,
          last_name: user.lastName,
          username: user.username,
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
    const gameMessageText = 'test-telegram-message-text';
    configurationServiceMockgGetConfiguration({ chatUsername, gameCost, adminIds });
    databaseServiceMockUpsertUser(user);
    databaseServiceMockCreateGame({ gameCost, userId: user.id }, gameId);
    messageServiceMockGetUserMarkdown(
      { username: user.username, firstName: user.firstName, id: user.id },
      userMarkdown,
    );
    databaseServiceMockGetUserBalance(user.id, balance);
    messageServiceMockGetGameMessageText(
      {
        gameId,
        createdByUserMarkdown: userMarkdown,
        playUsers: [{ username: user.username, firstName: user.firstName, id: user.id, balance }],
        payByUserMarkdown: userMarkdown,
        gameBalances: [{ userMarkdown, gameBalance: 0 }],
      },
      gameMessageText,
    );
    messageServiceMockGetReplyMarkup(false, (replyMarkup as unknown) as IReplyMarkup);
    telegramServiceMockSendMessage({
      replyMarkup: JSON.stringify(replyMarkup),
      text: gameMessageText,
      chatId: `@${chatUsername}`,
    });
    databaseServiceMockCloseConnection();

    // Act
    await badminton.processMessage(JSON.stringify(messageBody));

    // Assert
    expect(true).toBeTruthy();
  });

  function configurationServiceMockgGetConfiguration(configuration: {
    chatUsername: string;
    gameCost: number;
    adminIds: number[];
  }): void {
    configurationServiceMock
      .setup((x: IConfigurationService) => x.getConfiguration())
      .returns(() => configuration)
      .verifiable(Times.once());
  }

  function databaseServiceMockUpsertUser(user: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): void {
    databaseServiceMock
      .setup((x: IDatabaseService) => x.upsertUser(user))
      .returns(async () => undefined)
      .verifiable(Times.once());
  }

  function databaseServiceMockCreateGame(
    { gameCost, userId }: { gameCost: number; userId: number },
    gameId: number,
  ): void {
    databaseServiceMock
      .setup((x: IDatabaseService) => x.createGame(gameCost, userId))
      .returns(async () => gameId)
      .verifiable(Times.once());
  }

  function messageServiceMockGetUserMarkdown(
    user: { username: string; firstName: string; id: number },
    userMarkdown: string,
  ): void {
    messageServiceMock
      .setup((x: IMessageService) => x.getUserMarkdown(user))
      .returns(() => userMarkdown)
      .verifiable(Times.once());
  }

  function databaseServiceMockGetUserBalance(userId: number, balance: number): void {
    databaseServiceMock
      .setup((x: IDatabaseService) => x.getUserBalance(userId))
      .returns(async () => balance)
      .verifiable(Times.once());
  }

  function messageServiceMockGetGameMessageText(
    parameters: {
      gameId: number;
      createdByUserMarkdown: string;
      playUsers: { username?: string; firstName?: string; id: number; balance: number }[];
      payByUserMarkdown: string;
      gameBalances: { userMarkdown: string; gameBalance: number }[];
    },
    gameMessageText: string,
  ): void {
    messageServiceMock
      .setup((x: IMessageService) => x.getGameMessageText(parameters))
      .returns(() => gameMessageText)
      .verifiable(Times.once());
  }

  function messageServiceMockGetReplyMarkup(isFree: boolean, replyMarkup: IReplyMarkup): void {
    messageServiceMock
      .setup((x: IMessageService) => x.getReplyMarkup(isFree))
      .returns(() => replyMarkup)
      .verifiable(Times.once());
  }

  function telegramServiceMockSendMessage(parameters: { text: string; replyMarkup: string; chatId: string }): void {
    telegramServiceMock
      .setup((x: ITelegramService) => x.sendMessage(parameters))
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
