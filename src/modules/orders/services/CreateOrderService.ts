import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository') private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists');
    }

    const productsDb = await this.productsRepository.findAllById(products);

    if (!productsDb.length) {
      throw new AppError('Products does not exists');
    }

    const productsDto = productsDb.map(product => {
      const productFind = products.find(({ id }) => id === product.id);

      if (!productFind) {
        throw new AppError('Product does not exists on database');
      }

      if (productFind.quantity > product.quantity) {
        throw new AppError('Quantities insufficient');
      }

      return {
        product_id: product.id,
        quantity: productFind.quantity || 1,
        price: product.price,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsDto,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
