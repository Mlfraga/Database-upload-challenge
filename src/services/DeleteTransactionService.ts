import { getCustomRepository } from 'typeorm';
import TransactionRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

// import AppError from '../errors/AppError';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    try {
      const transactionsRepository = getCustomRepository(TransactionRepository);
      const userExists = await transactionsRepository.findOne({
        where: { id },
      });

      if (!userExists) {
        throw new AppError('User not exists.');
      }

      await transactionsRepository.delete(id);
    } catch (err) {
      throw new AppError(err);
    }
  }
}

export default DeleteTransactionService;
