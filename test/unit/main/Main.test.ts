import { IMock, Mock, Times } from 'typemoq';

import { Main } from '../../../src/main/Main';
import { IDatabaseService } from '../../../src/database/IDatabaseService.interface';
import { ITelegramService } from '../../../src/telegram/ITelegramService.interface';
import { IMessageService } from '../../../src/message/IMessageService.interface';

import { IMessageBody } from '../../../src/common/model/IMessageBody.interface';
import { IReplyMarkup } from '../../../src/common/model/IReplyMarkup.interface';

describe('Main', () => {
  let databaseServiceMock: IMock<IDatabaseService>;
  let telegramServiceMock: IMock<ITelegramService>;
  let messageServiceMock: IMock<IMessageService>;

  let main: Main;

  beforeEach(() => {
    databaseServiceMock = Mock.ofType<IDatabaseService>();
    telegramServiceMock = Mock.ofType<ITelegramService>();
    messageServiceMock = Mock.ofType<IMessageService>();

    const configuration = {
      publicUrl: 'test-public-url',
    };

    main = new Main(configuration, databaseServiceMock.object, telegramServiceMock.object, messageServiceMock.object);
  });

  afterEach(() => {
    databaseServiceMock.verifyAll();
    telegramServiceMock.verifyAll();
    messageServiceMock.verifyAll();
  });

  it('Should process message to create new expense', async () => {
    // Arrange
    const chatUsername = 'test-chat-username';
    const defaultPrice = 9;
    const expenseId = 11;
    const user = {
      id: 987,
      firstName: 'test-first-name',
      lastName: 'test-last-name',
      username: 'test-username',
    };
    const chatId = 789456123;
    const balance = '999';
    const userMarkdown = 'test-user-markdown';
    const replyMarkup = 'test-reply-markup';
    const expense = 'test-expense';
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
          id: chatId,
          username: chatUsername,
          title: '',
          type: '',
        },
        date: 0,
        text: `{${expense}} 1?`,
      },
    };
    const expenseMessageText = 'test-telegram-message-text';
    const messageId = 555;
    databaseServiceMockUpsertUser({
      userId: user.id,
      chatId,
      userUsername: user.username,
      chatUsername,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    databaseServiceMockGetGroupDefaults(chatId, { defaultPrice });
    databaseServiceMockCreateExpense({ price: defaultPrice, userId: user.id, chatId, expense }, expenseId);
    messageServiceMockGetUserMarkdown(
      { username: user.username, firstName: user.firstName, id: user.id },
      userMarkdown,
    );
    databaseServiceMockGetUserBalance({ userId: user.id, chatId }, balance);
    messageServiceMockGetMessageText(
      {
        expenseId,
        createdByUserMarkdown: userMarkdown,
        playUsers: [{ username: user.username, firstName: user.firstName, id: user.id, balance }],
        payByUserMarkdown: userMarkdown,
        expenseBalances: [{ userMarkdown, expenseBalance: '0' }],
        price: defaultPrice,
        expense,
      },
      expenseMessageText,
    );
    messageServiceMockGetReplyMarkup(false, (replyMarkup as unknown) as IReplyMarkup);
    telegramServiceMockSendMessage(
      {
        replyMarkup: JSON.stringify(replyMarkup),
        text: expenseMessageText,
        chatId,
      },
      messageId,
    );
    databaseServiceMockAddExpenseMessageId({ expenseId, messageId });

    // Act
    await main.processMessage(JSON.stringify(messageBody));

    // Assert
    expect(true).toBeTruthy();
  });

  function databaseServiceMockUpsertUser(parameters: {
    userId: number;
    chatId: number;
    userUsername?: string;
    chatUsername?: string;
    firstName?: string;
    lastName?: string;
  }): void {
    databaseServiceMock
      .setup((x: IDatabaseService) => x.upsertUser(parameters))
      .returns(async () => undefined)
      .verifiable(Times.once());
  }

  function databaseServiceMockGetGroupDefaults(chatId: number, { defaultPrice }: { defaultPrice?: number }): void {
    databaseServiceMock
      .setup((x: IDatabaseService) => x.getGroupDefaults(chatId))
      .returns(async () => Promise.resolve({ defaultPrice }))
      .verifiable(Times.once());
  }

  function databaseServiceMockCreateExpense(
    { price, userId, chatId, expense }: { price: number; userId: number; chatId: number; expense: string },
    expenseId: number,
  ): void {
    databaseServiceMock
      .setup((x: IDatabaseService) => x.createExpense(price, userId, chatId, expense))
      .returns(async () => expenseId)
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

  function databaseServiceMockGetUserBalance(
    { userId, chatId }: { userId: number; chatId: number },
    balance: string,
  ): void {
    databaseServiceMock
      .setup((x: IDatabaseService) => x.getUserBalance(userId, chatId))
      .returns(async () => balance)
      .verifiable(Times.once());
  }

  function messageServiceMockGetMessageText(
    parameters: {
      expenseId: number;
      createdByUserMarkdown: string;
      playUsers: { username?: string; firstName?: string; id: number; balance: string }[];
      payByUserMarkdown: string;
      expenseBalances: { userMarkdown: string; expenseBalance: string }[];
      price?: number;
      expense?: string;
    },
    expenseMessageText: string,
  ): void {
    messageServiceMock
      .setup((x: IMessageService) => x.getMessageText(parameters))
      .returns(() => expenseMessageText)
      .verifiable(Times.once());
  }

  function messageServiceMockGetReplyMarkup(isFree: boolean, replyMarkup: IReplyMarkup): void {
    messageServiceMock
      .setup((x: IMessageService) => x.getReplyMarkup(isFree))
      .returns(() => replyMarkup)
      .verifiable(Times.once());
  }

  function telegramServiceMockSendMessage(
    parameters: { text: string; replyMarkup: string; chatId: number },
    messageId: number,
  ): void {
    telegramServiceMock
      .setup((x: ITelegramService) => x.sendMessage(parameters))
      .returns(async () => messageId)
      .verifiable(Times.once());
  }

  function databaseServiceMockAddExpenseMessageId({
    expenseId,
    messageId,
  }: {
    expenseId: number;
    messageId: number;
  }): void {
    databaseServiceMock
      .setup((x: IDatabaseService) => x.addExpenseMessageId(expenseId, messageId))
      .returns(async () => undefined)
      .verifiable(Times.once());
  }
});
