import { IMock, Mock, Times } from 'typemoq';

import { Api } from '../../../src/api/Api';
import { IDatabaseService } from '../../../src/database/IDatabaseService.interface';
import { User } from '../../../src/database/entities/User.entity';

describe('Api', () => {
  let databaseServiceMock: IMock<IDatabaseService>;

  let api: Api;

  beforeEach(() => {
    databaseServiceMock = Mock.ofType<IDatabaseService>();

    api = new Api(databaseServiceMock.object);
  });

  afterEach(() => {
    databaseServiceMock.verifyAll();
  });

  it('Should return users', async () => {
    // Arrange
    const initialUsers = [new User()];
    const chatUsername = 'test-chat-username';
    databaseServiceMockGetUsers(chatUsername, initialUsers);

    // Act
    const users = await api.getUsers(chatUsername);

    // Assert
    expect(users).toBe(initialUsers);
  });

  function databaseServiceMockGetUsers(chatUsername: string, users: User[]): void {
    databaseServiceMock
      .setup((x: IDatabaseService) => x.getUsers(chatUsername))
      .returns(async () => users)
      .verifiable(Times.once());
  }
});
