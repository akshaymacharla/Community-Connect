import { type User, type InsertUser, type OtpVerification, type InsertOtp, type Service, type InsertService } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // OTP operations
  createOtp(otp: InsertOtp): Promise<OtpVerification>;
  getValidOtp(phone: string, otp: string): Promise<OtpVerification | undefined>;
  markOtpAsUsed(id: string): Promise<void>;
  
  // Service operations
  getServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  getServicesByUser(userId: string): Promise<Service[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private otps: Map<string, OtpVerification>;
  private services: Map<string, Service>;

  constructor() {
    this.users = new Map();
    this.otps = new Map();
    this.services = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.phone === phone,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      isVerified: false,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createOtp(insertOtp: InsertOtp): Promise<OtpVerification> {
    const id = randomUUID();
    const otp: OtpVerification = {
      ...insertOtp,
      id,
      isUsed: false,
      createdAt: new Date()
    };
    this.otps.set(id, otp);
    return otp;
  }

  async getValidOtp(phone: string, otpCode: string): Promise<OtpVerification | undefined> {
    return Array.from(this.otps.values()).find(
      (otp) => otp.phone === phone && 
               otp.otp === otpCode && 
               !otp.isUsed && 
               otp.expiresAt > new Date(),
    );
  }

  async markOtpAsUsed(id: string): Promise<void> {
    const otp = this.otps.get(id);
    if (otp) {
      this.otps.set(id, { ...otp, isUsed: true });
    }
  }

  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async createService(insertService: InsertService): Promise<Service> {
    const id = randomUUID();
    const service: Service = {
      ...insertService,
      id,
      createdAt: new Date()
    };
    this.services.set(id, service);
    return service;
  }

  async getServicesByUser(userId: string): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.offeredByUserId === userId,
    );
  }
}

export const storage = new MemStorage();
