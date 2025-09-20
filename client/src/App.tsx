import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

// Firebase imports - using CDN approach as specified
declare global {
  interface Window {
    firebase: any;
    __app_id: string;
    __firebase_config: any;
    __initial_auth_token: string;
  }
}

// Load Firebase from CDN
const loadFirebase = () => {
  return new Promise((resolve) => {
    if (window.firebase) {
      resolve(window.firebase);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
    script.onload = () => {
      const authScript = document.createElement('script');
      authScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
      authScript.onload = () => {
        const firestoreScript = document.createElement('script');
        firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js';
        firestoreScript.onload = () => resolve(window.firebase);
        document.head.appendChild(firestoreScript);
      };
      document.head.appendChild(authScript);
    };
    document.head.appendChild(script);
  });
};

interface User {
  uid: string;
  name: string;
  phone: string;
  flat: string;
  floor: string;
  block: string;
  role: 'resident' | 'president';
}

interface Service {
  id: string;
  title: string;
  description: string;
  offeredByUserId: string;
  price: number;
  timestamp: any;
  userName?: string;
  userFlat?: string;
  category: string;
}

interface ToastData {
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [userRole, setUserRole] = useState<'resident' | 'president' | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [residents, setResidents] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastData, setToastData] = useState<ToastData | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [firebase, setFirebase] = useState<any>(null);
  const [db, setDb] = useState<any>(null);
  const [auth, setAuth] = useState<any>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { toast } = useToast();

  // Initialize Firebase
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const firebaseLib = await loadFirebase();
        
        // Clean up environment variables (remove any extra quotes)
        const cleanEnvVar = (value: string | undefined) => {
          if (!value) return undefined;
          return value.replace(/^["']|["']$/g, ''); // Remove leading/trailing quotes
        };

        const firebaseConfig = window.__firebase_config || {
          apiKey: cleanEnvVar(import.meta.env.VITE_FIREBASE_API_KEY) || "default_api_key",
          authDomain: `${cleanEnvVar(import.meta.env.VITE_FIREBASE_PROJECT_ID) || "default_project"}.firebaseapp.com`,
          projectId: cleanEnvVar(import.meta.env.VITE_FIREBASE_PROJECT_ID) || "default_project",
          storageBucket: `${cleanEnvVar(import.meta.env.VITE_FIREBASE_PROJECT_ID) || "default_project"}.firebasestorage.app`,
          messagingSenderId: "123456789",
          appId: window.__app_id || cleanEnvVar(import.meta.env.VITE_FIREBASE_APP_ID) || "default_app_id"
        };

        console.log('Firebase config:', {
          ...firebaseConfig,
          apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...' // Only show first 10 chars for security
        });

        // Initialize Firebase app only if it doesn't exist
        let app;
        try {
          app = (firebaseLib as any).getApp(); // Try to get existing app
        } catch (error) {
          app = (firebaseLib as any).initializeApp(firebaseConfig); // Create new app if none exists
        }
        
        const authInstance = (firebaseLib as any).auth();
        const dbInstance = (firebaseLib as any).firestore();

        setFirebase(firebaseLib);
        setAuth(authInstance);
        setDb(dbInstance);

        // Listen for authentication state changes
        authInstance.onAuthStateChanged(async (firebaseUser: any) => {
          if (firebaseUser) {
            // User is signed in, get user data from Firestore
            try {
              const userDoc = await dbInstance.collection('users').doc(firebaseUser.uid).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                setUser({ uid: firebaseUser.uid, ...userData } as User);
                setUserRole(userData.role);
                setCurrentView('dashboard');
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
            }
          }
        });

        // Set up real-time listeners
        setupRealtimeListeners(dbInstance);

      } catch (error) {
        console.error('Error initializing Firebase:', error);
        showToast('Failed to initialize Firebase. Some features may not work.', 'error');
      }
    };

    initFirebase();
  }, []);

  const setupRealtimeListeners = (database: any) => {
    // Listen for services changes
    database.collection('services').onSnapshot((snapshot: any) => {
      const servicesData: Service[] = [];
      snapshot.forEach((doc: any) => {
        servicesData.push({ id: doc.id, ...doc.data() });
      });
      setServices(servicesData);
    }, (error: any) => {
      console.error('Error listening to services:', error);
    });

    // Listen for users changes
    database.collection('users').onSnapshot((snapshot: any) => {
      const usersData: User[] = [];
      snapshot.forEach((doc: any) => {
        const userData = doc.data();
        usersData.push({ uid: doc.id, ...userData });
      });
      setResidents(usersData.filter(u => u.role === 'resident'));
    }, (error: any) => {
      console.error('Error listening to users:', error);
    });
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastData({ message, type });
    toast({
      title: type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info',
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
    });
    setTimeout(() => setToastData(null), 3000);
  };

  const handleRoleSelection = (role: 'resident' | 'president') => {
    setUserRole(role);
    setCurrentView('auth');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Try Firebase authentication first
      if (auth && db) {
        let authResult;
        
        // Try custom token first if available
        if (window.__initial_auth_token) {
          authResult = await auth.signInWithCustomToken(window.__initial_auth_token);
        } else {
          // Fall back to anonymous authentication
          authResult = await auth.signInAnonymously();
        }

        // Save user data to Firestore
        const userData = {
          ...formData,
          role: userRole,
          userId: authResult.user.uid
        };

        await db.collection('users').doc(authResult.user.uid).set(userData);

        setUser({ uid: authResult.user.uid, ...userData } as User);
        setCurrentView('dashboard');
        showToast(`Welcome to NeighbörNet, ${formData.name || 'User'}!`);
      } else {
        throw new Error('Firebase not available');
      }
      
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Demo mode fallback when Firebase is unavailable
      if (error.message.includes('configuration-not-found') || error.message.includes('Firebase not available') || error.message.includes('unavailable')) {
        const demoUser = {
          uid: `demo_${Date.now()}`,
          ...formData,
          role: userRole,
          name: formData.name || 'Demo User'
        } as User;

        // Add some demo services for the demo user to see
        const demoServices: Service[] = [
          {
            id: 'demo1',
            title: 'Pet Walking',
            description: 'I can walk your dog in the evening after work. Very reliable!',
            offeredByUserId: 'demo_user_2',
            price: 15,
            timestamp: new Date(),
            userName: 'Sarah Johnson',
            userFlat: 'B-302',
            category: 'pet-care'
          },
          {
            id: 'demo2',
            title: 'Babysitting',
            description: 'Experienced babysitter available on weekends. References available.',
            offeredByUserId: 'demo_user_3',
            price: 12,
            timestamp: new Date(),
            userName: 'Mike Chen',
            userFlat: 'A-105',
            category: 'childcare'
          },
          {
            id: 'demo3',
            title: 'Home Cleaning',
            description: 'Professional cleaning service for apartments. Eco-friendly products used.',
            offeredByUserId: 'demo_user_4',
            price: 25,
            timestamp: new Date(),
            userName: 'Maria Rodriguez',
            userFlat: 'C-201',
            category: 'household'
          }
        ];

        setUser(demoUser);
        setServices(demoServices);
        setCurrentView('dashboard');
        showToast(`Welcome to NeighbörNet Demo, ${demoUser.name}! (Demo Mode - Firebase unavailable)`, 'info');
      } else {
        showToast(`Authentication failed: ${error.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOfferService = () => {
    if (!user) {
      showToast('Please log in to offer services', 'error');
      return;
    }
    setShowServiceForm(true);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!serviceFormData.title || !serviceFormData.description || !serviceFormData.price || !serviceFormData.category) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const serviceData = {
        title: serviceFormData.title,
        description: serviceFormData.description,
        price: parseFloat(serviceFormData.price),
        category: serviceFormData.category,
        offeredByUserId: user.uid,
        userName: user.name,
        userFlat: user.flat,
        timestamp: firebase ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
      };

      if (db) {
        // Firebase mode
        await db.collection('services').add(serviceData);
      } else {
        // Demo mode
        const newService = {
          id: `service_${Date.now()}`,
          ...serviceData,
          timestamp: new Date()
        };
        setServices(prev => [...prev, newService]);
      }

      showToast('Service offered successfully!', 'success');
      setShowServiceForm(false);
      setServiceFormData({ title: '', description: '', price: '', category: '' });
    } catch (error) {
      console.error('Error offering service:', error);
      showToast('Failed to offer service', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const serviceCategories = [
    { value: 'all', label: 'All Categories' },
    { value: 'household', label: 'Household' },
    { value: 'childcare', label: 'Childcare' },
    { value: 'pet-care', label: 'Pet Care' },
    { value: 'tutoring', label: 'Tutoring' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'transport', label: 'Transportation' },
    { value: 'other', label: 'Other' }
  ];

  const handleFindService = () => {
    // Scroll to services section
    const servicesSection = document.getElementById('services-section');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
    showToast('Use the search and filters below to find services', 'info');
  };

  const LandingPage = () => (
    <div className="min-h-screen gradient-bg community-pattern flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 drop-shadow-lg" data-testid="app-title">
            NeighbörNet
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-2" data-testid="app-subtitle">
            Your Hyper-Local Community Marketplace
          </p>
          <p className="text-lg text-white/80" data-testid="app-tagline">
            Connect, Share, and Thrive Together
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <button 
            onClick={() => handleRoleSelection('resident')}
            className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-8 hover:bg-white/20 transition-all duration-300 card-hover"
            data-testid="button-resident-role"
          >
            <div className="text-center">
              <i className="fas fa-home text-4xl text-white mb-4 group-hover:scale-110 transition-transform"></i>
              <h3 className="text-xl font-semibold text-white mb-2">I'm a Resident</h3>
              <p className="text-white/80">Find services and offer your skills to neighbors</p>
            </div>
          </button>
          
          <button 
            onClick={() => handleRoleSelection('president')}
            className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-8 hover:bg-white/20 transition-all duration-300 card-hover"
            data-testid="button-president-role"
          >
            <div className="text-center">
              <i className="fas fa-users-cog text-4xl text-white mb-4 group-hover:scale-110 transition-transform"></i>
              <h3 className="text-xl font-semibold text-white mb-2">I'm a Community President</h3>
              <p className="text-white/80">Manage and oversee community activities</p>
            </div>
          </button>
        </div>
        
        <div className="mt-12 flex justify-center items-center space-x-6 text-white/60">
          <div className="flex items-center space-x-2">
            <i className="fas fa-shield-alt"></i>
            <span>Secure</span>
          </div>
          <div className="flex items-center space-x-2">
            <i className="fas fa-handshake"></i>
            <span>Trusted</span>
          </div>
          <div className="flex items-center space-x-2">
            <i className="fas fa-map-marker-alt"></i>
            <span>Local</span>
          </div>
        </div>
      </div>
    </div>
  );

  const AuthPage = () => (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-card rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="auth-title">
              Join NeighbörNet
            </h2>
            <p className="text-muted-foreground" data-testid="auth-subtitle">
              {userRole === 'resident' ? 'Connect with your neighbors' : 'Manage your community'}
            </p>
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm" data-testid="role-badge">
              <i className={`fas ${userRole === 'resident' ? 'fa-home' : 'fa-users-cog'} mr-2`}></i>
              {userRole === 'resident' ? 'Resident' : 'Community President'}
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                placeholder="Enter your full name"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                data-testid="input-name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                required
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                placeholder="+1 (555) 123-4567"
                value={formData.phone || ''}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                data-testid="input-phone"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Flat #
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  placeholder="A-204"
                  value={formData.flat || ''}
                  onChange={(e) => setFormData({...formData, flat: e.target.value})}
                  data-testid="input-flat"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Floor
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  placeholder="2"
                  value={formData.floor || ''}
                  onChange={(e) => setFormData({...formData, floor: e.target.value})}
                  data-testid="input-floor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Block
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  placeholder="A"
                  value={formData.block || ''}
                  onChange={(e) => setFormData({...formData, block: e.target.value})}
                  data-testid="input-block"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              data-testid="button-join"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Joining Community...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Join NeighbörNet
                </>
              )}
            </button>
          </form>
          
          <button
            onClick={() => setCurrentView('landing')}
            className="w-full mt-4 text-muted-foreground hover:text-foreground transition-colors text-sm"
            data-testid="button-back"
          >
            ← Back to role selection
          </button>
        </div>
      </div>
    </div>
  );

  const ResidentDashboard = () => (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-primary" data-testid="header-title">NeighbörNet</h1>
              <div className="hidden sm:block text-sm text-muted-foreground" data-testid="user-id">
                User ID: {user?.uid}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground" data-testid="user-info">
                {user?.name} • {user?.flat}
              </div>
              <button
                onClick={() => setCurrentView('landing')}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2" data-testid="welcome-title">
            Welcome back, {user?.name || 'Neighbor'}!
          </h2>
          <p className="text-muted-foreground" data-testid="welcome-subtitle">
            What would you like to do in your community today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={handleFindService}
            className="bg-primary text-primary-foreground p-6 rounded-lg hover:bg-primary/90 transition-colors card-hover text-left"
            data-testid="button-find-service"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-2">Find a Service</h3>
                <p className="opacity-90">Browse services offered by your neighbors</p>
              </div>
              <i className="fas fa-search text-3xl opacity-80"></i>
            </div>
          </button>
          
          <button
            onClick={handleOfferService}
            className="bg-secondary text-secondary-foreground p-6 rounded-lg hover:bg-secondary/90 transition-colors card-hover text-left"
            data-testid="button-offer-skill"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-2">Offer a Skill</h3>
                <p className="opacity-90">Share your talents with the community</p>
              </div>
              <i className="fas fa-hand-holding-heart text-3xl opacity-80"></i>
            </div>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Available Services */}
          <div className="lg:col-span-2" id="services-section">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center" data-testid="services-title">
              <i className="fas fa-store mr-2 text-primary"></i>
              Available Services
            </h3>
            
            {/* Search and Filter */}
            <div className="bg-card border border-border rounded-lg p-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Search Services</label>
                  <input
                    type="text"
                    placeholder="Search by title, description, or provider..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    data-testid="input-search-services"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    data-testid="select-category-filter"
                  >
                    {serviceCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="grid gap-4">
              {filteredServices.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-6 text-center" data-testid="services-empty">
                  <i className="fas fa-search text-4xl text-muted-foreground mb-4"></i>
                  <p className="text-muted-foreground">
                    {searchTerm || selectedCategory !== 'all' 
                      ? 'No services match your search criteria. Try adjusting your filters.' 
                      : 'No services available yet. Be the first to offer a service!'}
                  </p>
                </div>
              ) : (
                filteredServices.map((service) => (
                  <div key={service.id} className="bg-card border border-border rounded-lg p-6 card-hover" data-testid={`service-card-${service.id}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-lg font-semibold text-foreground" data-testid={`service-title-${service.id}`}>
                          {service.title}
                        </h4>
                        <span className="bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs">
                          {serviceCategories.find(cat => cat.value === service.category)?.label || service.category}
                        </span>
                      </div>
                      <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium" data-testid={`service-price-${service.id}`}>
                        ${service.price}/hr
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-4" data-testid={`service-description-${service.id}`}>
                      {service.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <i className="fas fa-user"></i>
                        <span data-testid={`service-user-${service.id}`}>{service.userName}</span>
                        <span>•</span>
                        <span data-testid={`service-flat-${service.id}`}>{service.userFlat}</span>
                      </div>
                      <button 
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm"
                        data-testid={`button-contact-${service.id}`}
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-foreground mb-4 flex items-center" data-testid="profile-title">
                <i className="fas fa-user-circle mr-2 text-primary"></i>
                My Profile
              </h4>
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150" 
                alt="Profile picture" 
                className="w-16 h-16 rounded-full mx-auto mb-4 object-cover"
                data-testid="profile-image"
              />
              <div className="text-center mb-4">
                <h5 className="font-medium text-foreground" data-testid="profile-name">{user?.name}</h5>
                <p className="text-sm text-muted-foreground" data-testid="profile-flat">{user?.flat}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Points Earned</span>
                  <span className="text-sm font-medium text-accent" data-testid="profile-points">245</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Services Used</span>
                  <span className="text-sm font-medium" data-testid="profile-services-used">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Services Offered</span>
                  <span className="text-sm font-medium" data-testid="profile-services-offered">3</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <h6 className="text-sm font-medium text-foreground mb-2">Badges</h6>
                <div className="flex space-x-2" data-testid="profile-badges">
                  <span className="bg-accent/10 text-accent px-2 py-1 rounded text-xs">Helper</span>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">Trusted</span>
                </div>
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-foreground mb-4 flex items-center" data-testid="ai-suggestions-title">
                <i className="fas fa-robot mr-2 text-secondary"></i>
                AI Suggestions
              </h4>
              <div className="space-y-3" data-testid="ai-suggestions">
                <div className="flex items-start space-x-3">
                  <i className="fas fa-lightbulb text-secondary mt-1"></i>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">Consider offering "Plant Care" - several neighbors have shown interest!</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <i className="fas fa-handshake text-secondary mt-1"></i>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">Mike R. in B-101 offers tutoring that might interest you.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <i className="fas fa-calendar text-secondary mt-1"></i>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">Weekend babysitting demand is high in your building.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Service Creation Modal */}
      {showServiceForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Offer a Service</h3>
              <button
                onClick={() => setShowServiceForm(false)}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-close-service-form"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleServiceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Service Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Dog Walking, Tutoring, Home Cleaning"
                  value={serviceFormData.title}
                  onChange={(e) => setServiceFormData({...serviceFormData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  data-testid="input-service-title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select
                  required
                  value={serviceFormData.category}
                  onChange={(e) => setServiceFormData({...serviceFormData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  data-testid="select-service-category"
                >
                  <option value="">Select a category</option>
                  {serviceCategories.slice(1).map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe your service, availability, and any special qualifications..."
                  value={serviceFormData.description}
                  onChange={(e) => setServiceFormData({...serviceFormData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
                  data-testid="textarea-service-description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Price per Hour ($)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={serviceFormData.price}
                  onChange={(e) => setServiceFormData({...serviceFormData, price: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  data-testid="input-service-price"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowServiceForm(false)}
                  className="flex-1 bg-muted text-muted-foreground py-2 rounded-md hover:bg-muted/80 transition-colors"
                  data-testid="button-cancel-service"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-submit-service"
                >
                  {loading ? 'Creating...' : 'Offer Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const PresidentDashboard = () => (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-primary" data-testid="header-title">NeighbörNet</h1>
              <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm font-medium" data-testid="manager-badge">
                Community Manager
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground" data-testid="user-info">
                {user?.name} • {user?.flat}
              </div>
              <button
                onClick={() => setCurrentView('landing')}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2" data-testid="dashboard-title">
            Community Dashboard
          </h2>
          <p className="text-muted-foreground" data-testid="dashboard-subtitle">
            Manage your community and oversee neighborhood activities
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Residents</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-residents">{residents.length}</p>
              </div>
              <i className="fas fa-users text-primary text-2xl"></i>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Services</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-services">{services.length}</p>
              </div>
              <i className="fas fa-handshake text-secondary text-2xl"></i>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-month">24</p>
              </div>
              <i className="fas fa-chart-line text-accent text-2xl"></i>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-pending">2</p>
              </div>
              <i className="fas fa-clock text-orange-500 text-2xl"></i>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Residents Management */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-foreground flex items-center" data-testid="residents-title">
                <i className="fas fa-users mr-2 text-primary"></i>
                Registered Residents
              </h3>
              <button 
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm"
                data-testid="button-add-resident"
              >
                Add Resident
              </button>
            </div>
            
            <div className="space-y-4">
              {residents.length === 0 ? (
                <div className="text-center py-8" data-testid="residents-empty">
                  <i className="fas fa-users text-4xl text-muted-foreground mb-4"></i>
                  <p className="text-muted-foreground">No residents registered yet.</p>
                </div>
              ) : (
                residents.map((resident) => (
                  <div key={resident.uid} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg" data-testid={`resident-card-${resident.uid}`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <i className="fas fa-user text-primary"></i>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground" data-testid={`resident-name-${resident.uid}`}>{resident.name}</h4>
                        <p className="text-sm text-muted-foreground" data-testid={`resident-details-${resident.uid}`}>
                          {resident.flat} • Floor {resident.floor} • Block {resident.block}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-accent/10 text-accent px-2 py-1 rounded text-xs">Active</span>
                      <button className="text-muted-foreground hover:text-foreground" data-testid={`button-resident-menu-${resident.uid}`}>
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Services Overview */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-foreground flex items-center" data-testid="services-overview-title">
                <i className="fas fa-store mr-2 text-secondary"></i>
                Services Summary
              </h3>
              <button 
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors text-sm"
                data-testid="button-view-all-services"
              >
                View All
              </button>
            </div>
            
            <div className="space-y-4">
              {services.length === 0 ? (
                <div className="text-center py-8" data-testid="services-overview-empty">
                  <i className="fas fa-store text-4xl text-muted-foreground mb-4"></i>
                  <p className="text-muted-foreground">No services offered yet.</p>
                </div>
              ) : (
                services.map((service) => (
                  <div key={service.id} className="p-4 bg-muted/50 rounded-lg" data-testid={`service-overview-${service.id}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-foreground" data-testid={`service-overview-title-${service.id}`}>{service.title}</h4>
                      <span className="bg-accent/10 text-accent px-2 py-1 rounded text-xs" data-testid={`service-overview-price-${service.id}`}>
                        ${service.price}/hr
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2" data-testid={`service-overview-description-${service.id}`}>{service.description}</p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span data-testid={`service-overview-user-${service.id}`}>Offered by {service.userName}</span>
                      <span data-testid={`service-overview-flat-${service.id}`}>{service.userFlat}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Approval Actions */}
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="font-medium text-foreground mb-3 flex items-center" data-testid="quick-actions-title">
                <i className="fas fa-check-circle mr-2 text-accent"></i>
                Quick Actions
              </h4>
              <div className="space-y-2">
                <button 
                  className="w-full bg-accent/10 text-accent p-3 rounded-lg hover:bg-accent/20 transition-colors text-left text-sm"
                  data-testid="button-approve-residents"
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Approve 2 pending residents
                </button>
                <button 
                  className="w-full bg-primary/10 text-primary p-3 rounded-lg hover:bg-primary/20 transition-colors text-left text-sm"
                  data-testid="button-send-announcement"
                >
                  <i className="fas fa-bullhorn mr-2"></i>
                  Send community announcement
                </button>
                <button 
                  className="w-full bg-secondary/10 text-secondary p-3 rounded-lg hover:bg-secondary/20 transition-colors text-left text-sm"
                  data-testid="button-view-analytics"
                >
                  <i className="fas fa-chart-bar mr-2"></i>
                  View community analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const CustomToast = ({ message, type }: ToastData) => (
    <div className={`toast bg-card border border-border rounded-lg shadow-lg p-4 ${
      type === 'success' ? 'border-l-4 border-l-accent' : 
      type === 'error' ? 'border-l-4 border-l-destructive' : ''
    }`} data-testid="custom-toast">
      <div className="flex items-center">
        <i className={`fas ${
          type === 'success' ? 'fa-check-circle text-accent' : 
          type === 'error' ? 'fa-exclamation-circle text-destructive' : 
          'fa-info-circle text-primary'
        } mr-3`}></i>
        <span className="text-foreground" data-testid="toast-message">{message}</span>
      </div>
    </div>
  );

  return (
    <div className="font-sans">
      {currentView === 'landing' && <LandingPage />}
      {currentView === 'auth' && <AuthPage />}
      {currentView === 'dashboard' && userRole === 'resident' && <ResidentDashboard />}
      {currentView === 'dashboard' && userRole === 'president' && <PresidentDashboard />}
      
      {toastData && <CustomToast message={toastData.message} type={toastData.type} />}
    </div>
  );
}

export default App;
