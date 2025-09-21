import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertOtpSchema, insertServiceSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Phone OTP Authentication endpoints
  
  // Send OTP to phone number
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Clean phone number format
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP in database
      await storage.createOtp({
        phone: cleanPhone,
        otp,
        expiresAt
      });

      // TODO: In production, send SMS via Twilio or similar service
      // For development, we'll log the OTP to console
      console.log(`OTP for ${cleanPhone}: ${otp}`);

      res.json({ 
        success: true, 
        message: "OTP sent successfully",
        // In development, return OTP for testing (remove in production)
        developmentOtp: otp
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Verify OTP and register/login user
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phone, otp, name, flat, floor, block, role } = req.body;
      
      if (!phone || !otp) {
        return res.status(400).json({ error: "Phone number and OTP are required" });
      }

      const cleanPhone = phone.replace(/\D/g, '');
      
      // Verify OTP
      const validOtp = await storage.getValidOtp(cleanPhone, otp);
      if (!validOtp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Mark OTP as used
      await storage.markOtpAsUsed(validOtp.id);

      // Check if user already exists
      let user = await storage.getUserByPhone(cleanPhone);
      
      if (!user) {
        // New user registration
        if (!name || !flat || !floor || !block || !role) {
          return res.status(400).json({ 
            error: "Name, flat, floor, block, and role are required for new users" 
          });
        }

        const userData = insertUserSchema.parse({
          name,
          phone: cleanPhone,
          flat,
          floor, 
          block,
          role
        });

        user = await storage.createUser(userData);
      }

      // Mark user as verified
      user = await storage.updateUser(user.id, { isVerified: true });

      if (!user) {
        return res.status(500).json({ error: "Failed to update user" });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          flat: user.flat,
          floor: user.floor,
          block: user.block,
          role: user.role,
          isVerified: user.isVerified
        }
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid user data", 
          details: error.errors 
        });
      }
      
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Get user profile
  app.get("/api/user/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        name: user.name,
        phone: user.phone,
        flat: user.flat,
        floor: user.floor,
        block: user.block,
        role: user.role,
        isVerified: user.isVerified
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Services endpoints
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(serviceData);
      res.json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid service data", 
          details: error.errors 
        });
      }
      
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
