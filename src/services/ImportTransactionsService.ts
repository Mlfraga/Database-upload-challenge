import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
// import path from 'path';
import fs from 'fs';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

// import uploadConfig from '../config/upload';

interface LineTransactions {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

interface DataTransactions {
  title: string;
  value: string;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    const contactsReadStream = fs.createReadStream(filePath);
    // const fileCsvPath = path.join(uploadConfig.directory, filePath);

    const parsers = csvParse({
      from_line: 2,
    });

    const parsedCsv = contactsReadStream.pipe(parsers);

    const transactions: LineTransactions[] = [];
    const categories: string[] = [];

    parsedCsv.on('data', (data: string[]) => {
      const transaction: LineTransactions = {
        title: data[0],
        value: Number(data[2]),
        type: data[1].trim() as 'income' | 'outcome',
        category: data[3].trim(),
      };

      transactions.push(transaction);
      categories.push(transaction.category);
    });

    await new Promise(resolve => parsedCsv.on('end', resolve));

    const categoriesFound = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const categoriesTitles = categoriesFound.map(row => row.title);

    const selectedCategories = categories.filter(
      category => !categoriesTitles.includes(category),
    );
    const selectedCategoriesFiltered = Array.from(new Set(selectedCategories));

    const categoryTitle = selectedCategoriesFiltered.map(title => ({
      title,
    }));

    const newCategories = categoryRepository.create(categoryTitle);

    await categoryRepository.save(newCategories);
    const allCategories = [...categoriesFound, ...newCategories];

    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.title,
        ),
      })),
    );

    const savedTransactions = await transactionRepository.save(
      createdTransactions,
    );
    return savedTransactions;
  }
}

export default ImportTransactionsService;
