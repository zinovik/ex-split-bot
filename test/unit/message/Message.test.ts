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

  it('Should parse game id', async () => {
    // Arrange
    const initialGameId = 123;
    const text = `Game #${String(initialGameId)}\nGame #456\nGame #789\n`;

    // Act
    const gameId = messageService.parseGameId(text);

    // Assert
    expect(gameId).toBe(initialGameId);
  });

  it('Should return reply markup', async () => {
    // Arrange
    const initialReplyMarkup = {
      inline_keyboard: [
        [
          { text: 'play', callback_data: 'play' },
          { text: 'pay', callback_data: 'pay' },
          { text: 'free', callback_data: 'free' },
          { text: 'done', callback_data: 'done' },
          { text: 'delete', callback_data: 'delete' },
        ],
      ],
    };

    // Act
    const replyMarkup = messageService.getReplyMarkup();

    // Assert
    expect(replyMarkup).toEqual(initialReplyMarkup);
  });
});
