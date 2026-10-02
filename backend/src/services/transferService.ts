import { TransferRepository } from "../repositories/transferRepository.js";
import type { Transfer } from "../types/index.js";

export class TransferService {
  private readonly repo: TransferRepository;

  constructor(repo: TransferRepository = new TransferRepository()) {
    this.repo = repo;
  }

  async list(): Promise<Transfer[]> {
    return this.repo.findAll();
  }

  async getById(id: string): Promise<Transfer | null> {
    return this.repo.findById(id);
  }
}
