// import AppError from '../errors/AppError';
import { getCustomRepository, getRepository } from 'typeorm';
import TransactionRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    if (type !== 'income' && type !== 'outcome') {
      throw new AppError('Category type not exists.');
    }

    if (value <= 0) {
      throw new AppError('The value cannot be smaller or equal than 0.');
    }

    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);

    if (type === 'outcome') {
      const balance = await transactionRepository.getBalance();

      if (balance.total < value) {
        throw new AppError('The ammount of balance is not sufficient.');
      }
    }

    const createdTransaction = await transactionRepository.create({
      title,
      value,
      type,
    });

    const categoryExists = await categoryRepository.findOne({
      where: { title: category },
    });

    if (!categoryExists) {
      const new_category = categoryRepository.create({ title: category });

      const createdCategory = await categoryRepository.save(new_category);

      createdTransaction.category_id = createdCategory.id;
    } else {
      createdTransaction.category_id = categoryExists.id;
    }

    const transaction = await transactionRepository.save(createdTransaction);

    delete transaction.category_id;
    delete transaction.created_at;
    delete transaction.updated_at;

    return transaction;
  }
}

export default CreateTransactionService;
