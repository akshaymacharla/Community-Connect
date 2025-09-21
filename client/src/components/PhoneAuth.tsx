import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Phone, Shield, Users, Home } from "lucide-react";

interface PhoneAuthProps {
  onAuthSuccess: (user: any) => void;
  onBack: () => void;
  userRole: 'resident' | 'president';
}

interface UserData {
  name: string;
  flat: string;
  floor: string;
  block: string;
}

export default function PhoneAuth({ onAuthSuccess, onBack, userRole }: PhoneAuthProps) {
  const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [userData, setUserData] = useState<UserData>({
    name: '',
    flat: '',
    floor: '',
    block: ''
  });
  const [loading, setLoading] = useState(false);
  const [developmentOtp, setDevelopmentOtp] = useState('');
  
  const { toast } = useToast();

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? `-${match[3]}` : ''}`;
    }
    return value;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid 10-digit phone number",
          variant: "destructive"
        });
        return;
      }

      const response = await apiRequest('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone })
      });

      if (response.success) {
        setDevelopmentOtp(response.developmentOtp || '');
        setStep('otp');
        toast({
          title: "OTP Sent",
          description: "Please check your phone for the verification code"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Check if user exists by attempting verification first
      const response = await apiRequest('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: cleanPhone, 
          otp: otp.trim()
        })
      });

      if (response.success && response.user) {
        // Existing user - direct login
        onAuthSuccess(response.user);
        toast({
          title: "Welcome Back!",
          description: `Logged in as ${response.user.name}`
        });
      }
    } catch (error: any) {
      if (error.message?.includes("required for new users")) {
        // New user - need registration details
        setStep('details');
      } else {
        toast({
          title: "Verification Failed",
          description: error.message || "Invalid or expired OTP",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      
      const response = await apiRequest('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: cleanPhone, 
          otp: otp.trim(),
          ...userData,
          role: userRole
        })
      });

      if (response.success) {
        onAuthSuccess(response.user);
        toast({
          title: "Registration Complete!",
          description: `Welcome to NeighbörNet, ${userData.name}!`
        });
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to complete registration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 6) {
      setOtp(cleaned);
    }
  };

  if (step === 'phone') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="absolute left-4 top-4"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Phone className="h-8 w-8 text-primary" />
            </div>
            
            <div>
              <CardTitle className="text-2xl font-bold text-foreground" data-testid="phone-title">
                Enter Phone Number
              </CardTitle>
              <CardDescription className="text-muted-foreground" data-testid="phone-subtitle">
                We'll send you a verification code to confirm your identity
              </CardDescription>
            </div>

            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm" data-testid="role-badge">
              {userRole === 'resident' ? (
                <>
                  <Home className="h-4 w-4 mr-2" />
                  Resident
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Community President
                </>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  className="h-12 text-lg text-center bg-background border-border focus:border-primary"
                  required
                  data-testid="input-phone"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg font-medium"
                disabled={loading || phone.replace(/\D/g, '').length < 10}
                data-testid="button-send-otp"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStep('phone')}
              className="absolute left-4 top-4"
              data-testid="button-back-to-phone"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            
            <div>
              <CardTitle className="text-2xl font-bold text-foreground" data-testid="otp-title">
                Enter Verification Code
              </CardTitle>
              <CardDescription className="text-muted-foreground" data-testid="otp-subtitle">
                We sent a 6-digit code to {phone}
              </CardDescription>
            </div>

            {developmentOtp && (
              <div className="p-3 bg-muted rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">Development Mode</p>
                <p className="font-mono font-bold text-lg text-foreground">{developmentOtp}</p>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-foreground font-medium">
                  Verification Code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  className="h-12 text-2xl text-center font-mono tracking-widest bg-background border-border focus:border-primary"
                  maxLength={6}
                  required
                  data-testid="input-otp"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg font-medium"
                disabled={loading || otp.length !== 6}
                data-testid="button-verify-otp"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify Code"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('phone')}
                data-testid="button-resend"
              >
                Resend Code
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStep('otp')}
              className="absolute left-4 top-4"
              data-testid="button-back-to-otp"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              {userRole === 'resident' ? (
                <Home className="h-8 w-8 text-primary" />
              ) : (
                <Users className="h-8 w-8 text-primary" />
              )}
            </div>
            
            <div>
              <CardTitle className="text-2xl font-bold text-foreground" data-testid="details-title">
                Complete Your Profile
              </CardTitle>
              <CardDescription className="text-muted-foreground" data-testid="details-subtitle">
                Tell us a bit about yourself to join the community
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={userData.name}
                  onChange={(e) => setUserData({...userData, name: e.target.value})}
                  className="bg-background border-border focus:border-primary"
                  required
                  data-testid="input-name"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="flat" className="text-foreground font-medium">
                    Flat #
                  </Label>
                  <Input
                    id="flat"
                    type="text"
                    placeholder="A-204"
                    value={userData.flat}
                    onChange={(e) => setUserData({...userData, flat: e.target.value})}
                    className="bg-background border-border focus:border-primary"
                    required
                    data-testid="input-flat"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor" className="text-foreground font-medium">
                    Floor
                  </Label>
                  <Input
                    id="floor"
                    type="text"
                    placeholder="2"
                    value={userData.floor}
                    onChange={(e) => setUserData({...userData, floor: e.target.value})}
                    className="bg-background border-border focus:border-primary"
                    required
                    data-testid="input-floor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="block" className="text-foreground font-medium">
                    Block
                  </Label>
                  <Input
                    id="block"
                    type="text"
                    placeholder="A"
                    value={userData.block}
                    onChange={(e) => setUserData({...userData, block: e.target.value})}
                    className="bg-background border-border focus:border-primary"
                    required
                    data-testid="input-block"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg font-medium mt-6"
                disabled={loading || !userData.name || !userData.flat || !userData.floor || !userData.block}
                data-testid="button-complete-registration"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  "Complete Registration"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}