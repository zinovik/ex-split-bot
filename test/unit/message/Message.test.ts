import { MessageService } from '../../../src/message/Message.service';

describe('Message', () => {
  let messageService: MessageService;

  beforeEach(() => {
    messageService = new MessageService();
  });

  it('Should return user markdown if there is firstName and username', async () => {
    // Arrange
    const username = 'test-username';
    const firstName = 'test-firstName';
    const id = 123;

    // Act
    const userMarkdown = messageService.getUserMarkdown({ username, firstName, id });

    // Assert
    expect(userMarkdown).toBe(`[${firstName}](tg://user?id=${String(id)})`);
    // expect(userMarkdown).toBeTruthy(`[${firstName || username || String(id)}](tg://user?id=${String(id)})`);
  });

  it('Should return user markdown if there is username without firstName', async () => {
    // Arrange
    const username = 'test-username';
    const id = 123;

    // Act
    const userMarkdown = messageService.getUserMarkdown({ username, id });

    // Assert
    expect(userMarkdown).toBe(`[${username}](tg://user?id=${String(id)})`);
  });

  it('Should return user markdown if there is no firstName and username', async () => {
    // Arrange
    const id = 123;

    // Act
    const userMarkdown = messageService.getUserMarkdown({ id });

    // Assert
    expect(userMarkdown).toBe(`[${String(id)}](tg://user?id=${String(id)})`);
  });

  it('Should return reply markup', async () => {
    // Arrange
    const testAction = 'test-action';
    const initialReplyMarkup = {
      inline_keyboard: [
        [{ text: `${testAction} | not ${testAction} and not pay`, callback_data: 'split | not split and not pay' }],
        [{ text: `${testAction} and pay | not pay`, callback_data: 'split and pay | not pay' }],
        [
          { text: 'free', callback_data: 'free' },
          { text: 'done', callback_data: 'done' },
          { text: 'delete', callback_data: 'delete' },
        ],
      ],
    };

    // Act
    const replyMarkup = messageService.getReplyMarkup({ actionName: testAction });

    // Assert
    expect(replyMarkup).toEqual(initialReplyMarkup);
  });
});
